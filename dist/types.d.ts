import { PublicKey } from '@solana/web3.js';
export type Network = 'solana-devnet' | 'solana-mainnet' | string;
export type TokenType = 'SOL' | 'USDC' | 'SPL';
export type PaymentMethod = 'facilitator' | 'onchain' | 'auto';
export type X402PaymentRequirements = {
    amount: string;
    currency: string;
    scheme: string;
    payment_payload: Record<string, any>;
    facilitator_hint?: string;
    tokenType?: TokenType;
    mintAddress?: string;
    recipientTokenAccount?: string;
    createAccountIfNeeded?: boolean;
};
export type PaymentConfig = {
    tokenType: TokenType;
    amount: number | string;
    recipient: PublicKey | string;
    mintAddress?: PublicKey | string;
    decimals?: number;
    createAccountIfNeeded?: boolean;
};
export type ExecResponse = {
    txSignature?: string;
    signature?: string;
    raw?: any;
    explorerUrl?: string;
    paymentDetails?: {
        amount: number;
        tokenType: TokenType;
        recipient: string;
        mintAddress?: string;
    };
};
export type SDKConfig = {
    network: Network;
    defaultFacilitator?: string;
    preferOnChain?: boolean;
    defaultPaymentMethod?: PaymentMethod;
    defaultTokenSettings?: {
        solDecimals?: number;
        usdcMint?: PublicKey | string;
        usdcDecimals?: number;
    };
};
export type TokenAccountInfo = {
    address: PublicKey;
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    exists: boolean;
};
export type PaymentInstructionData = {
    instruction: any;
    signers?: any[];
    accounts?: any[];
    programId: PublicKey;
};
export type PaymentVerificationResult = {
    isValid: boolean;
    error?: string;
    details?: {
        amount?: number;
        recipient?: string;
        tokenType?: TokenType;
        mintAddress?: string;
    };
};
