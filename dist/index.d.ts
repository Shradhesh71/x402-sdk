import { PublicKey, Keypair, Connection, Transaction } from '@solana/web3.js';
import { SDKConfig, X402PaymentRequirements, ExecResponse, PaymentConfig, TokenType, PaymentMethod } from './types';
import { PaymentBuilder, PaymentUtils, PaymentVerifier, Payments } from './payment-builder';
export declare class X402SDK {
    private cfg;
    private facilitator?;
    constructor(cfg: SDKConfig);
    /**
     * Get the current SDK configuration
     */
    getConfig(): SDKConfig;
    /**
     * Returns the configured facilitator base URL or undefined
     */
    getFacilitatorUrl(): string | undefined;
    /**
     * Set or change facilitator at runtime
     */
    setFacilitator(url: string): void;
    /**
     * Get a connection to the Solana network
     */
    getConnection(): Connection;
    /**
     * Create a payment builder for easy payment configuration
     */
    createPayment(): PaymentBuilder;
    /**
     * Quick access to common payment types
     */
    get payments(): {
        sol: (amount: number | string, recipient: PublicKey | string) => PaymentConfig;
        usdc: (amount: number | string, recipient: PublicKey | string) => PaymentConfig;
        spl: (amount: number | string, recipient: PublicKey | string, mintAddress: PublicKey | string, decimals?: number) => PaymentConfig;
    };
    /**
     * Enhanced payment method with multi-token support
     */
    pay(config: PaymentConfig, opts?: {
        payerKeypair?: Keypair;
        method?: PaymentMethod;
        simulateFirst?: boolean;
    }): Promise<ExecResponse>;
    /**
     * Create a signed transaction without submitting (for x402 flow)
     */
    createSignedTransaction(config: PaymentConfig, payerKeypair: Keypair): Promise<{
        serializedTransaction: string;
        signature: string;
        transaction: Transaction;
        x402Header: string;
    }>;
    /**
     * Verify a payment transaction
     */
    verifyPayment(transaction: Transaction | string, expectedConfig: PaymentConfig): Promise<{
        isValid: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Legacy method for backward compatibility
     * Core method for paying for a resource. Strategy:
     * - If preferOnChain is true and caller provides a payer Keypair, perform on-chain submission
     * - Otherwise submit to the configured facilitator (hosted)
     */
    payForResource(paymentReq: X402PaymentRequirements, opts?: {
        payerKeypair?: Keypair;
    }): Promise<ExecResponse>;
    /**
     * Enhanced verification helper
     */
    verifyExec(exec: ExecResponse): Promise<boolean>;
    /**
     * Get transaction details from signature
     */
    getTransactionDetails(signature: string): Promise<any>;
    /**
     * Utility methods
     */
    get utils(): {
        /**
         * Format amount for display
         */
        formatAmount: (amount: number | string, tokenType: TokenType, decimals?: number) => string;
        /**
         * Get explorer URL
         */
        getExplorerUrl: (signature: string) => string;
        /**
         * Parse x402 header
         */
        parseX402Header: (header: string) => any;
        /**
         * Create x402 header
         */
        createX402Header: (data: any) => string;
        /**
         * Get USDC mint for current network
         */
        getUSDCMint: () => PublicKey;
    };
}
export { PaymentBuilder, PaymentUtils, PaymentVerifier, Payments };
export * from './server';
export * from './types';
export * from './token-utils';
