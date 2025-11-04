import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { TokenAccountInfo, Network, PaymentConfig } from './types';
export declare const USDC_DEVNET_MINT: PublicKey;
export declare const USDC_MAINNET_MINT: PublicKey;
/**
 * Get USDC mint address for the given network
 */
export declare function getUSDCMint(network: Network): PublicKey;
/**
 * Get connection for the given network
 */
export declare function getConnection(network: Network): Connection;
/**
 * Get or create associated token account
 */
export declare function getOrCreateTokenAccount(connection: Connection, payer: Keypair, mint: PublicKey, owner: PublicKey): Promise<{
    address: PublicKey;
    instruction?: any;
}>;
/**
 * Get token account info including balance and existence
 */
export declare function getTokenAccountInfo(connection: Connection, tokenAccount: PublicKey): Promise<TokenAccountInfo | null>;
/**
 * Check if token account exists
 */
export declare function tokenAccountExists(connection: Connection, tokenAccount: PublicKey): Promise<boolean>;
/**
 * Create SPL token transfer instruction
 */
export declare function createSPLTransferInstruction(sourceTokenAccount: PublicKey, destinationTokenAccount: PublicKey, owner: PublicKey, amount: bigint): any;
/**
 * Convert amount to token units (handle decimals)
 */
export declare function toTokenUnits(amount: number | string, decimals: number): bigint;
/**
 * Convert token units to human readable amount
 */
export declare function fromTokenUnits(amount: bigint, decimals: number): number;
/**
 * Get mint info including decimals
 */
export declare function getMintInfo(connection: Connection, mint: PublicKey): Promise<import("@solana/spl-token").Mint>;
/**
 * Create a complete payment transaction for SOL
 */
export declare function createSOLPaymentTransaction(connection: Connection, payer: Keypair, config: PaymentConfig): Promise<Transaction>;
/**
 * Create a complete payment transaction for USDC/SPL tokens
 */
export declare function createSPLPaymentTransaction(connection: Connection, payer: Keypair, config: PaymentConfig): Promise<Transaction>;
/**
 * Verify SPL token transfer instruction
 */
export declare function verifySPLTransferInstruction(instruction: any, expectedRecipient: PublicKey, expectedAmount: bigint, expectedMint?: PublicKey): Promise<boolean>;
/**
 * Verify SOL transfer instruction
 */
export declare function verifySOLTransferInstruction(instruction: any, expectedRecipient: PublicKey, expectedAmount: bigint): boolean;
