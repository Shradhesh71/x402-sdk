import { ExecResponse, SDKConfig, X402PaymentRequirements, PaymentConfig } from './types';
import { Keypair, Transaction } from '@solana/web3.js';
/**
 * Submit payment directly on-chain (legacy method for backward compatibility)
 */
export declare function submitOnChainDirect(paymentReq: X402PaymentRequirements, opts: {
    payerKeypair: Keypair;
    network: SDKConfig['network'];
    toPubkey?: string;
}): Promise<ExecResponse>;
/**
 * Enhanced on-chain payment submission with multi-token support
 */
export declare function submitPaymentOnChain(config: PaymentConfig, opts: {
    payerKeypair: Keypair;
    network: SDKConfig['network'];
    simulateFirst?: boolean;
}): Promise<ExecResponse>;
/**
 * Create signed transaction without submitting (for x402 flow)
 */
export declare function createSignedPaymentTransaction(config: PaymentConfig, opts: {
    payerKeypair: Keypair;
    network: SDKConfig['network'];
}): Promise<{
    serializedTransaction: string;
    signature: string;
    transaction: Transaction;
}>;
