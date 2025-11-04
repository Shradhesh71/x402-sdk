"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndSubmitSerializedTransaction = verifyAndSubmitSerializedTransaction;
exports.createPaymentMiddleware = createPaymentMiddleware;
const web3_js_1 = require("@solana/web3.js");
const token_utils_1 = require("./token-utils");
const payment_builder_1 = require("./payment-builder");
/**
 * Verify and submit a serialized (base64) transaction coming from client (x402 flow).
 * - Decodes transaction
 * - Verifies expected instructions (amount, recipient, token)
 * - Simulates transaction
 * - Submits raw transaction and createPaymentMiddlewareonfirms
 */
async function verifyAndSubmitSerializedTransaction(serializedTxBase64, expectedConfig, network) {
    const conn = (0, token_utils_1.getConnection)(network);
    try {
        const txBuffer = Buffer.from(serializedTxBase64, 'base64');
        const tx = web3_js_1.Transaction.from(txBuffer);
        // Verify instructions against expected config
        const verification = await payment_builder_1.PaymentVerifier.verifyPaymentInstructions(tx, expectedConfig);
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
    }
    catch (e) {
        return { success: false, error: e?.message || String(e) };
    }
}
/**
 * Express middleware factory to handle x402 protected endpoints.
 *
 * Example usage:
 * app.use('/premium', createPaymentMiddleware({ price: 0.0001, tokenType: 'USDC', recipient: 'RECPUBKEY' }));
 */
function createPaymentMiddleware(opts) {
    const network = opts.network || 'solana-devnet';
    return async function (req, res, next) {
        try {
            const xPaymentHeader = req.header('X-Payment');
            // If client provided X-Payment header, verify and submit transaction
            if (xPaymentHeader) {
                try {
                    const payload = payment_builder_1.PaymentUtils.parseX402Header(xPaymentHeader);
                    const serialized = payload.payload?.serializedTransaction || payload.payload?.serialized;
                    if (!serialized) {
                        return res.status(402).json({ error: 'Missing serialized transaction in X-Payment' });
                    }
                    const expected = {
                        tokenType: opts.tokenType,
                        amount: opts.price,
                        recipient: opts.recipient,
                        mintAddress: opts.mintAddress || (opts.tokenType === 'USDC' ? (0, token_utils_1.getUSDCMint)(network) : undefined),
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
                }
                catch (e) {
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
        }
        catch (err) {
            next(err);
        }
    };
}
exports.default = { verifyAndSubmitSerializedTransaction, createPaymentMiddleware };
