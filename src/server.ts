import type { Request, Response, NextFunction } from 'express';
import { Transaction } from '@solana/web3.js';
import { getConnection, getUSDCMint } from './token-utils';
import { PaymentConfig } from './types';
import { PaymentUtils, PaymentVerifier } from './payment-builder';

/**
 * Verify and submit a serialized (base64) transaction coming from client (x402 flow).
 * - Decodes transaction
 * - Verifies expected instructions (amount, recipient, token)
 * - Simulates transaction
 * - Submits raw transaction and createPaymentMiddlewareonfirms
 */
export async function verifyAndSubmitSerializedTransaction(
  serializedTxBase64: string,
  expectedConfig: PaymentConfig,
  network: string
): Promise<{ success: boolean; signature?: string; explorerUrl?: string; error?: string }> {
  const conn = getConnection(network as any);

  try {
    const txBuffer = Buffer.from(serializedTxBase64, 'base64');
    const tx = Transaction.from(txBuffer);
    
    // Verify instructions against expected config
    const verification = await PaymentVerifier.verifyPaymentInstructions(tx, expectedConfig);
    
    if (!verification.isValid) {
      return { success: false, error: verification.error || 'Instruction verification failed' };
    }

    // Simulate transaction
    const simulation = await conn.simulateTransaction(tx);
    if (simulation.value && simulation.value.err) {
      return { success: false, error: `Simulation failed: ${JSON.stringify(simulation.value.err)}` };
    }

    // Submit raw transaction buffer
    const signature = await conn.sendRawTransaction(txBuffer, { skipPreflight: false, preflightCommitment: 'confirmed' });
    const confirmation = await conn.confirmTransaction(signature, 'confirmed');
    if (confirmation.value && confirmation.value.err) {
      return { success: false, error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}` };
    }

    const cluster = (network || '').toString().includes('mainnet') ? 'mainnet-beta' : 'devnet';
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;

    return { success: true, signature, explorerUrl };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Express middleware factory to handle x402 protected endpoints.
 *
 * Example usage:
 * app.use('/premium', createPaymentMiddleware({ price: 0.0001, tokenType: 'USDC', recipient: 'RECPUBKEY' }));
 */
export function createPaymentMiddleware(opts: {
  price: number;
  tokenType: 'SOL' | 'USDC' | 'SPL';
  recipient: string;
  mintAddress?: string;
  network?: string;
}) {
  const network = opts.network || 'solana-devnet';

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const xPaymentHeader = req.header('X-Payment');

      // If client provided X-Payment header, verify and submit transaction
      if (xPaymentHeader) {
        try {
          const payload = PaymentUtils.parseX402Header(xPaymentHeader);
          const serialized = payload.payload?.serializedTransaction || payload.payload?.serialized;

          if (!serialized) {
            return res.status(402).json({ error: 'Missing serialized transaction in X-Payment' });
          }

          const expected: PaymentConfig = {
            tokenType: opts.tokenType as any,
            amount: opts.price,
            recipient: opts.recipient,
            mintAddress: opts.mintAddress || (opts.tokenType === 'USDC' ? getUSDCMint(network as any) : undefined),
            decimals: opts.tokenType === 'SOL' ? 9 : 6,
            createAccountIfNeeded: true
          };

          const result = await verifyAndSubmitSerializedTransaction(serialized, expected, network);
          if (!result.success) {
            return res.status(402).json({ error: result.error });
          }

          // Payment verified & submitted
          return res.json({
            message: 'Payment verified',
            paymentDetails: {
              signature: result.signature,
              explorerUrl: result.explorerUrl,
            }
          });
        } catch (e: any) {
          return res.status(402).json({ error: e?.message || String(e) });
        }
      }

      // No payment provided - return 402 with payment details
      return res.status(402).json({
        error: 'Payment Required',
        payment: {
          recipient: opts.recipient,
          amount: Math.round(opts.price * (opts.tokenType === 'SOL' ? 1 : Math.pow(10, 6))),
          cluster: network.includes('mainnet') ? 'mainnet' : 'devnet',
          tokenType: opts.tokenType,
          mintAddress: opts.mintAddress
        }
      });
    } catch (err) {
      next(err);
    }
  };
}

export default { verifyAndSubmitSerializedTransaction, createPaymentMiddleware };
