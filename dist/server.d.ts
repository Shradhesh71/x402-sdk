import type { Request, Response, NextFunction } from 'express';
import { PaymentConfig } from './types';
/**
 * Verify and submit a serialized (base64) transaction coming from client (x402 flow).
 * - Decodes transaction
 * - Verifies expected instructions (amount, recipient, token)
 * - Simulates transaction
 * - Submits raw transaction and confirms
 */
export declare function verifyAndSubmitSerializedTransaction(serializedTxBase64: string, expectedConfig: PaymentConfig, network: string): Promise<{
    success: boolean;
    signature?: string;
    explorerUrl?: string;
    error?: string;
}>;
/**
 * Express middleware factory to handle x402 protected endpoints.
 *
 * Example usage:
 * app.use('/premium', createPaymentMiddleware({ price: 0.0001, tokenType: 'USDC', recipient: 'RECPUBKEY' }));
 */
export declare function createPaymentMiddleware(opts: {
    price: number;
    tokenType: 'SOL' | 'USDC' | 'SPL';
    recipient: string;
    mintAddress?: string;
    network?: string;
}): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {
    verifyAndSubmitSerializedTransaction: typeof verifyAndSubmitSerializedTransaction;
    createPaymentMiddleware: typeof createPaymentMiddleware;
};
export default _default;
