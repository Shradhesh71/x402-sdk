import { PublicKey } from '@solana/web3.js';
import { 
  PaymentConfig, 
  TokenType, 
  X402PaymentRequirements, 
  Network,
  PaymentVerificationResult 
} from './types';
import { 
  getUSDCMint, 
  toTokenUnits, 
  verifySOLTransferInstruction, 
  verifySPLTransferInstruction 
} from './token-utils';

/**
 * Payment builder for creating standardized payment configurations
 */
export class PaymentBuilder {
  private config: Partial<PaymentConfig> = {};
  
  /**
   * Set the token type for the payment
   */
  setTokenType(tokenType: TokenType): PaymentBuilder {
    this.config.tokenType = tokenType;
    return this;
  }
  
  /**
   * Set the payment amount
   */
  setAmount(amount: number | string): PaymentBuilder {
    this.config.amount = amount;
    return this;
  }
  
  /**
   * Set the recipient address
   */
  setRecipient(recipient: PublicKey | string): PaymentBuilder {
    this.config.recipient = recipient;
    return this;
  }
  
  /**
   * Set custom mint address (for SPL tokens)
   */
  setMintAddress(mintAddress: PublicKey | string): PaymentBuilder {
    this.config.mintAddress = mintAddress;
    return this;
  }
  
  /**
   * Set token decimals
   */
  setDecimals(decimals: number): PaymentBuilder {
    this.config.decimals = decimals;
    return this;
  }
  
  /**
   * Enable automatic token account creation if needed
   */
  createAccountIfNeeded(create: boolean = true): PaymentBuilder {
    this.config.createAccountIfNeeded = create;
    return this;
  }
  
  /**
   * Build SOL payment configuration
   */
  static sol(amount: number | string, recipient: PublicKey | string): PaymentBuilder {
    return new PaymentBuilder()
      .setTokenType('SOL')
      .setAmount(amount)
      .setRecipient(recipient)
      .setDecimals(9);
  }
  
  /**
   * Build USDC payment configuration
   */
  static usdc(amount: number | string, recipient: PublicKey | string, network: Network): PaymentBuilder {
    return new PaymentBuilder()
      .setTokenType('USDC')
      .setAmount(amount)
      .setRecipient(recipient)
      .setMintAddress(getUSDCMint(network))
      .setDecimals(6)
      .createAccountIfNeeded(true);
  }
  
  /**
   * Build custom SPL token payment configuration
   */
  static spl(
    amount: number | string, 
    recipient: PublicKey | string, 
    mintAddress: PublicKey | string,
    decimals: number = 6
  ): PaymentBuilder {
    return new PaymentBuilder()
      .setTokenType('SPL')
      .setAmount(amount)
      .setRecipient(recipient)
      .setMintAddress(mintAddress)
      .setDecimals(decimals)
      .createAccountIfNeeded(true);
  }
  
  /**
   * Build the final payment configuration
   */
  build(): PaymentConfig {
    if (!this.config.tokenType) {
      throw new Error('Token type is required');
    }
    
    if (this.config.amount === undefined || this.config.amount === null) {
      throw new Error('Amount is required');
    }
    
    if (!this.config.recipient) {
      throw new Error('Recipient is required');
    }
    
    if (this.config.tokenType !== 'SOL' && !this.config.mintAddress) {
      throw new Error('Mint address is required for SPL token payments');
    }
    
    return this.config as PaymentConfig;
  }
}

/**
 * Utility functions for payment operations
 */
export class PaymentUtils {
  
  /**
   * Create x402 payment requirements from config
   */
  static toX402Requirements(config: PaymentConfig, network: Network): X402PaymentRequirements {
    const decimals = config.decimals || (config.tokenType === 'SOL' ? 9 : 6);
    const amountInTokenUnits = toTokenUnits(config.amount, decimals);
    
    return {
      amount: amountInTokenUnits.toString(),
      currency: config.tokenType,
      scheme: 'exact',
      payment_payload: {
        recipient: typeof config.recipient === 'string' ? config.recipient : config.recipient.toBase58(),
        tokenType: config.tokenType,
        mintAddress: config.mintAddress ? (typeof config.mintAddress === 'string' ? config.mintAddress : config.mintAddress.toBase58()) : undefined,
        decimals,
        network
      },
      tokenType: config.tokenType,
      mintAddress: config.mintAddress ? (typeof config.mintAddress === 'string' ? config.mintAddress : config.mintAddress.toBase58()) : undefined,
      createAccountIfNeeded: config.createAccountIfNeeded
    };
  }
  
  /**
   * Create payment config from x402 requirements
   */
  static fromX402Requirements(requirements: X402PaymentRequirements): PaymentConfig {
    const payload = requirements.payment_payload || {};
    
    return {
      tokenType: (requirements.tokenType || requirements.currency) as TokenType,
      amount: requirements.amount,
      recipient: payload.recipient || '',
      mintAddress: requirements.mintAddress || payload.mintAddress,
      decimals: payload.decimals,
      createAccountIfNeeded: requirements.createAccountIfNeeded
    };
  }
  
  /**
   * Validate payment configuration
   */
  static validateConfig(config: PaymentConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.tokenType) {
      errors.push('Token type is required');
    }
    
    if (config.amount === undefined || config.amount === null) {
      errors.push('Amount is required');
    } else {
      const amount = typeof config.amount === 'string' ? parseFloat(config.amount) : config.amount;
      if (isNaN(amount) || amount <= 0) {
        errors.push('Amount must be a positive number');
      }
    }
    
    if (!config.recipient) {
      errors.push('Recipient is required');
    } else {
      try {
        if (typeof config.recipient === 'string') {
          new PublicKey(config.recipient);
        }
      } catch (error) {
        errors.push('Invalid recipient address');
      }
    }
    
    if (config.tokenType !== 'SOL' && !config.mintAddress) {
      errors.push('Mint address is required for SPL token payments');
    }
    
    if (config.mintAddress) {
      try {
        if (typeof config.mintAddress === 'string') {
          new PublicKey(config.mintAddress);
        }
      } catch (error) {
        errors.push('Invalid mint address');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Format amount for display
   */
  static formatAmount(amount: number | string, tokenType: TokenType, decimals?: number): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const dec = decimals || (tokenType === 'SOL' ? 9 : 6);
    
    // If amount is already in token units, convert to human readable
    if (numAmount > 1000000) {
      return `${(numAmount / Math.pow(10, dec)).toFixed(dec === 9 ? 4 : 2)} ${tokenType}`;
    } else {
      return `${numAmount.toFixed(dec === 9 ? 4 : 2)} ${tokenType}`;
    }
  }
  
  /**
   * Get explorer URL for transaction
   */
  static getExplorerUrl(signature: string, network: Network): string {
    const cluster = network.includes('mainnet') ? 'mainnet-beta' : 'devnet';
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  }
  
  /**
   * Parse x402 payment header
   */
  static parseX402Header(header: string): any {
    try {
      const decoded = Buffer.from(header, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid x402 payment header format');
    }
  }
  
  /**
   * Create x402 payment header
   */
  static createX402Header(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}

/**
 * Payment verification utilities
 */
export class PaymentVerifier {
  
  /**
   * Verify payment transaction instructions
   */
  static async verifyPaymentInstructions(
    transaction: any,
    expectedConfig: PaymentConfig
  ): Promise<PaymentVerificationResult> {
    try {
      const recipient = typeof expectedConfig.recipient === 'string' 
        ? new PublicKey(expectedConfig.recipient) 
        : expectedConfig.recipient;
      
      const decimals = expectedConfig.decimals || (expectedConfig.tokenType === 'SOL' ? 9 : 6);
      const expectedAmount = toTokenUnits(expectedConfig.amount, decimals);
      
      for (const instruction of transaction.instructions) {
        let isValid = false;
        
        if (expectedConfig.tokenType === 'SOL') {
          isValid = verifySOLTransferInstruction(instruction, recipient, expectedAmount);
        } else {
          const mint = expectedConfig.mintAddress 
            ? (typeof expectedConfig.mintAddress === 'string' 
               ? new PublicKey(expectedConfig.mintAddress) 
               : expectedConfig.mintAddress)
            : undefined;
          
          isValid = await verifySPLTransferInstruction(instruction, recipient, expectedAmount, mint);
        }
        
        if (isValid) {
          return {
            isValid: true,
            details: {
              amount: Number(expectedAmount),
              recipient: recipient.toBase58(),
              tokenType: expectedConfig.tokenType,
              mintAddress: expectedConfig.mintAddress 
                ? (typeof expectedConfig.mintAddress === 'string' 
                   ? expectedConfig.mintAddress 
                   : expectedConfig.mintAddress.toBase58())
                : undefined
            }
          };
        }
      }
      
      return {
        isValid: false,
        error: `No valid ${expectedConfig.tokenType} transfer instruction found`
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Convenience functions for common payment types
 */
export const Payments = {
  /**
   * Create SOL payment
   */
  sol: (amount: number | string, recipient: PublicKey | string) => 
    PaymentBuilder.sol(amount, recipient).build(),
  
  /**
   * Create USDC payment
   */
  usdc: (amount: number | string, recipient: PublicKey | string, network: Network) => 
    PaymentBuilder.usdc(amount, recipient, network).build(),
  
  /**
   * Create custom SPL token payment
   */
  spl: (
    amount: number | string, 
    recipient: PublicKey | string, 
    mintAddress: PublicKey | string,
    decimals: number = 6
  ) => PaymentBuilder.spl(amount, recipient, mintAddress, decimals).build()
};