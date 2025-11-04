"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitOnChainDirect = submitOnChainDirect;
exports.submitPaymentOnChain = submitPaymentOnChain;
exports.createSignedPaymentTransaction = createSignedPaymentTransaction;
const web3_js_1 = require("@solana/web3.js");
const token_utils_1 = require("./token-utils");
/**
 * Submit payment directly on-chain (legacy method for backward compatibility)
 */
async function submitOnChainDirect(paymentReq, opts) {
    const network = opts.network === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
    const conn = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)(network), 'confirmed');
    const payer = opts.payerKeypair;
    const to = opts.toPubkey ? new web3_js_1.PublicKey(opts.toPubkey) : payer.publicKey;
    // convert paymentReq.amount to lamports roughly if currency is SOL; for demo we assume SOL and small amounts
    const lamports = Math.max(1, Math.floor(Number(paymentReq.amount) * 1e9 || 1));
    const tx = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports }));
    const sig = await conn.sendTransaction(tx, [payer]);
    await conn.confirmTransaction(sig, 'confirmed');
    const explorerUrl = `https://explorer.solana.com/tx/${sig}?cluster=${network}`;
    return {
        txSignature: sig,
        raw: { lamports },
        explorerUrl,
        paymentDetails: {
            amount: lamports,
            tokenType: 'SOL',
            recipient: to.toBase58()
        }
    };
}
/**
 * Enhanced on-chain payment submission with multi-token support
 */
async function submitPaymentOnChain(config, opts) {
    const connection = (0, token_utils_1.getConnection)(opts.network);
    const payer = opts.payerKeypair;
    let transaction;
    try {
        if (config.tokenType === 'SOL') {
            transaction = await (0, token_utils_1.createSOLPaymentTransaction)(connection, payer, config);
        }
        else {
            if (!config.mintAddress) {
                if (config.tokenType === 'USDC') {
                    config.mintAddress = (0, token_utils_1.getUSDCMint)(opts.network);
                }
                else {
                    throw new Error(`Mint address is required for ${config.tokenType} payments`);
                }
            }
            transaction = await (0, token_utils_1.createSPLPaymentTransaction)(connection, payer, config);
        }
        transaction.sign(payer);
        if (opts.simulateFirst !== false) {
            const simulation = await connection.simulateTransaction(transaction);
            if (simulation.value.err) {
                throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
            }
        }
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        }
        const network = opts.network.includes('mainnet') ? 'mainnet-beta' : 'devnet';
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
        return {
            txSignature: signature,
            signature,
            explorerUrl,
            paymentDetails: {
                amount: typeof config.amount === 'string' ? parseFloat(config.amount) : config.amount,
                tokenType: config.tokenType,
                recipient: typeof config.recipient === 'string' ? config.recipient : config.recipient.toBase58(),
                mintAddress: config.mintAddress ? (typeof config.mintAddress === 'string' ? config.mintAddress : config.mintAddress.toBase58()) : undefined
            },
            raw: {
                transaction: transaction,
                confirmation: confirmation
            }
        };
    }
    catch (error) {
        throw new Error(`On-chain payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Create signed transaction without submitting (for x402 flow)
 */
async function createSignedPaymentTransaction(config, opts) {
    const connection = (0, token_utils_1.getConnection)(opts.network);
    const payer = opts.payerKeypair;
    let transaction;
    // Create transaction based on token type
    if (config.tokenType === 'SOL') {
        transaction = await (0, token_utils_1.createSOLPaymentTransaction)(connection, payer, config);
    }
    else {
        if (!config.mintAddress) {
            if (config.tokenType === 'USDC') {
                config.mintAddress = (0, token_utils_1.getUSDCMint)(opts.network);
            }
            else {
                throw new Error(`Mint address is required for ${config.tokenType} payments`);
            }
        }
        transaction = await (0, token_utils_1.createSPLPaymentTransaction)(connection, payer, config);
    }
    transaction.sign(payer);
    const signature = transaction.signature?.toString('base64') || '';
    const serializedTransaction = transaction.serialize().toString('base64');
    return {
        serializedTransaction,
        signature,
        transaction
    };
}
