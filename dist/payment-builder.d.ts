import { PublicKey } from '@solana/web3.js';
import { PaymentConfig, TokenType, X402PaymentRequirements, Network, PaymentVerificationResult } from './types';
/**
 * Payment builder for creating standardized payment configurations
 */
export declare class PaymentBuilder {
    private config;
    /**
     * Set the token type for the payment
     */
    setTokenType(tokenType: TokenType): PaymentBuilder;
    /**
     * Set the payment amount
     */
    setAmount(amount: number | string): PaymentBuilder;
    /**
     * Set the recipient address
     */
    setRecipient(recipient: PublicKey | string): PaymentBuilder;
    /**
     * Set custom mint address (for SPL tokens)
     */
    setMintAddress(mintAddress: PublicKey | string): PaymentBuilder;
    /**
     * Set token decimals
     */
    setDecimals(decimals: number): PaymentBuilder;
    /**
     * Enable automatic token account creation if needed
     */
    createAccountIfNeeded(create?: boolean): PaymentBuilder;
    /**
     * Build SOL payment configuration
     */
    static sol(amount: number | string, recipient: PublicKey | string): PaymentBuilder;
    /**
     * Build USDC payment configuration
     */
    static usdc(amount: number | string, recipient: PublicKey | string, network: Network): PaymentBuilder;
    /**
     * Build custom SPL token payment configuration
     */
    static spl(amount: number | string, recipient: PublicKey | string, mintAddress: PublicKey | string, decimals?: number): PaymentBuilder;
    /**
     * Build the final payment configuration
     */
    build(): PaymentConfig;
}
/**
 * Utility functions for payment operations
 */
export declare class PaymentUtils {
    /**
     * Create x402 payment requirements from config
     */
    static toX402Requirements(config: PaymentConfig, network: Network): X402PaymentRequirements;
    /**
     * Create payment config from x402 requirements
     */
    static fromX402Requirements(requirements: X402PaymentRequirements): PaymentConfig;
    /**
     * Validate payment configuration
     */
    static validateConfig(config: PaymentConfig): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Format amount for display
     */
    static formatAmount(amount: number | string, tokenType: TokenType, decimals?: number): string;
    /**
     * Get explorer URL for transaction
     */
    static getExplorerUrl(signature: string, network: Network): string;
    /**
     * Parse x402 payment header
     */
    static parseX402Header(header: string): any;
    /**
     * Create x402 payment header
     */
    static createX402Header(data: any): string;
}
/**
 * Payment verification utilities
 */
export declare class PaymentVerifier {
    /**
     * Verify payment transaction instructions
     */
    static verifyPaymentInstructions(transaction: any, expectedConfig: PaymentConfig): Promise<PaymentVerificationResult>;
}
/**
 * Convenience functions for common payment types
 */
export declare const Payments: {
    /**
     * Create SOL payment
     */
    sol: (amount: number | string, recipient: PublicKey | string) => PaymentConfig;
    /**
     * Create USDC payment
     */
    usdc: (amount: number | string, recipient: PublicKey | string, network: Network) => PaymentConfig;
    /**
     * Create custom SPL token payment
     */
    spl: (amount: number | string, recipient: PublicKey | string, mintAddress: PublicKey | string, decimals?: number) => PaymentConfig;
};
