import { PublicKey, Keypair, Connection, Transaction } from '@solana/web3.js';
import { 
  SDKConfig, 
  X402PaymentRequirements, 
  ExecResponse, 
  PaymentConfig, 
  TokenType, 
  PaymentMethod 
} from './types';
import { FacilitatorClient } from './facilitator';
import { submitOnChainDirect, submitPaymentOnChain, createSignedPaymentTransaction } from './onchain';
import { PaymentBuilder, PaymentUtils, PaymentVerifier, Payments } from './payment-builder';
import { getConnection, getUSDCMint } from './token-utils';

export class X402SDK {
  private cfg: SDKConfig;
  private facilitator?: FacilitatorClient;

  constructor(cfg: SDKConfig) {
    this.cfg = cfg;
    if (cfg.defaultFacilitator) {
      this.facilitator = new FacilitatorClient(cfg.defaultFacilitator, cfg.network);
    }
  }

  /**
   * Get the current SDK configuration
   */
  getConfig(): SDKConfig {
    return { ...this.cfg };
  }

  /**
   * Returns the configured facilitator base URL or undefined
   */
  getFacilitatorUrl(): string | undefined {
    return this.cfg.defaultFacilitator;
  }

  /**
   * Set or change facilitator at runtime
   */
  setFacilitator(url: string) {
    this.cfg.defaultFacilitator = url;
    this.facilitator = new FacilitatorClient(url, this.cfg.network);
  }

  /**
   * Get a connection to the Solana network
   */
  getConnection(): Connection {
    return getConnection(this.cfg.network);
  }

  /**
   * Create a payment builder for easy payment configuration
   */
  createPayment(): PaymentBuilder {
    return new PaymentBuilder();
  }

  /**
   * Quick access to common payment types
   */
  get payments() {
    return {
      sol: (amount: number | string, recipient: PublicKey | string) =>
        Payments.sol(amount, recipient),
      usdc: (amount: number | string, recipient: PublicKey | string) =>
        Payments.usdc(amount, recipient, this.cfg.network),
      spl: (
        amount: number | string,
        recipient: PublicKey | string,
        mintAddress: PublicKey | string,
        decimals: number = 6
      ) => Payments.spl(amount, recipient, mintAddress, decimals)
    };
  }

  /**
   * Enhanced payment method with multi-token support
   */
  async pay(
    config: PaymentConfig,
    opts?: {
      payerKeypair?: Keypair;
      method?: PaymentMethod;
      simulateFirst?: boolean;
    }
  ): Promise<ExecResponse> {
    // Validate payment configuration
    const validation = PaymentUtils.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid payment configuration: ${validation.errors.join(', ')}`);
    }

    const method = opts?.method || this.cfg.defaultPaymentMethod || 'auto';
    const payerKeypair = opts?.payerKeypair;

    let useOnChain = false;
    if (method === 'onchain') {
      useOnChain = true;
    } else if (method === 'facilitator') {
      useOnChain = false;
    } else if (method === 'auto') {
      useOnChain = (this.cfg.preferOnChain === true) && !!payerKeypair;
    }

    if (useOnChain) {
      if (!payerKeypair) {
        throw new Error('Payer keypair is required for on-chain payments');
      }

      return await submitPaymentOnChain(config, {
        payerKeypair,
        network: this.cfg.network,
        simulateFirst: opts?.simulateFirst
      });
    } else {
      // Use facilitator
      if (!this.facilitator) {
        throw new Error('No facilitator configured. Call setFacilitator(url) or provide defaultFacilitator in SDKConfig.');
      }

      const paymentReq = PaymentUtils.toX402Requirements(config, this.cfg.network);
      return await this.facilitator.submitPayment(paymentReq);
    }
  }

  /**
   * Create a signed transaction without submitting (for x402 flow)
   */
  async createSignedTransaction(
    config: PaymentConfig,
    payerKeypair: Keypair
  ): Promise<{
    serializedTransaction: string;
    signature: string;
    transaction: Transaction;
    x402Header: string;
  }> {
    const validation = PaymentUtils.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid payment configuration: ${validation.errors.join(', ')}`);
    }

    const result = await createSignedPaymentTransaction(config, {
      payerKeypair,
      network: this.cfg.network
    });

    // Create x402 payment header
    const paymentProof = {
      x402Version: 1,
      scheme: 'exact',
      network: this.cfg.network,
      payload: {
        serializedTransaction: result.serializedTransaction
      }
    };

    const x402Header = PaymentUtils.createX402Header(paymentProof);

    return {
      ...result,
      x402Header
    };
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(
    transaction: Transaction | string,
    expectedConfig: PaymentConfig
  ): Promise<{
    isValid: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      let tx: Transaction;
      
      if (typeof transaction === 'string') {
        // Decode from base64 serialized transaction
        const txBuffer = Buffer.from(transaction, 'base64');
        tx = Transaction.from(txBuffer);
      } else {
        tx = transaction;
      }

      return PaymentVerifier.verifyPaymentInstructions(tx, expectedConfig);
    } catch (error) {
      return {
        isValid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   * Core method for paying for a resource. Strategy:
   * - If preferOnChain is true and caller provides a payer Keypair, perform on-chain submission
   * - Otherwise submit to the configured facilitator (hosted)
   */
  async payForResource(
    paymentReq: X402PaymentRequirements,
    opts?: { payerKeypair?: Keypair }
  ): Promise<ExecResponse> {
    if (this.cfg.preferOnChain && opts?.payerKeypair) {
      const res = await submitOnChainDirect(paymentReq, {
        payerKeypair: opts.payerKeypair,
        network: this.cfg.network
      });
      return res;
    }

    if (!this.facilitator) {
      throw new Error('No facilitator configured. Call setFacilitator(url) or provide defaultFacilitator in SDKConfig.');
    }

    const exec = await this.facilitator.submitPayment(paymentReq);
    return exec;
  }

  /**
   * Enhanced verification helper
   */
  async verifyExec(exec: ExecResponse): Promise<boolean> {
    return !!(exec?.txSignature || exec?.signature);
  }

  /**
   * Get transaction details from signature
   */
  async getTransactionDetails(signature: string): Promise<any> {
    const connection = this.getConnection();
    
    try {
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      return transaction;
    } catch (error) {
      throw new Error(`Failed to get transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility methods
   */
  get utils() {
    return {
      /**
       * Format amount for display
       */
      formatAmount: (amount: number | string, tokenType: TokenType, decimals?: number) =>
        PaymentUtils.formatAmount(amount, tokenType, decimals),
      
      /**
       * Get explorer URL
       */
      getExplorerUrl: (signature: string) =>
        PaymentUtils.getExplorerUrl(signature, this.cfg.network),
      
      /**
       * Parse x402 header
       */
      parseX402Header: (header: string) =>
        PaymentUtils.parseX402Header(header),
      
      /**
       * Create x402 header
       */
      createX402Header: (data: any) =>
        PaymentUtils.createX402Header(data),
      
      /**
       * Get USDC mint for current network
       */
      getUSDCMint: () =>
        getUSDCMint(this.cfg.network)
    };
  }
}

// Export utility classes and functions
export {
  PaymentBuilder,
  PaymentUtils,
  PaymentVerifier,
  Payments
};

export * from './server';

export * from './types';

export * from './token-utils';