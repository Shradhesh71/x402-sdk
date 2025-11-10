import { PublicKey, Connection, Transaction } from '@solana/web3.js';
export type PhantomProvider = {
    publicKey?: PublicKey;
    signTransaction?: (tx: Transaction) => Promise<Transaction>;
    sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
};
export type PayOpts = {
    connection: Connection;
    provider: PhantomProvider;
    cashMint: string;
    confirmOptions?: {
        commitment?: 'confirmed' | 'finalized' | 'processed';
    };
};
/**
 * paymentReq: should include amount (string) and payment_payload.recipient (owner's pubkey)
 * Example: paymentReq = { amount: "0.5", currency: "CASH", payment_payload: { recipient: "RecipientPubkey..." } }
 */
export declare function payWithPhantomCash(paymentReq: {
    amount: string;
    payment_payload: Record<string, any>;
}, opts: PayOpts): Promise<{
    txSignature: string;
    raw?: any;
}>;
