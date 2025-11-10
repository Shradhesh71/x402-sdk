"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payWithPhantomCash = payWithPhantomCash;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_utils_1 = require("./token-utils");
/**
 * paymentReq: should include amount (string) and payment_payload.recipient (owner's pubkey)
 * Example: paymentReq = { amount: "0.5", currency: "CASH", payment_payload: { recipient: "RecipientPubkey..." } }
 */
async function payWithPhantomCash(paymentReq, opts) {
    const { connection, provider, cashMint, confirmOptions = { commitment: 'confirmed' } } = opts;
    if (!provider || (!provider.signTransaction && !provider.sendTransaction)) {
        throw new Error('Provider must implement signTransaction or sendTransaction (Phantom / wallet-adapter)');
    }
    if (!provider.publicKey)
        throw new Error('Provider not connected (no publicKey)');
    const payerPubkey = provider.publicKey;
    const mintPubkey = new web3_js_1.PublicKey(cashMint);
    // recipient must be provided by payment_payload
    const recipientStr = paymentReq.payment_payload?.recipient;
    if (!recipientStr)
        throw new Error('payment_payload.recipient missing');
    const recipientPub = new web3_js_1.PublicKey(recipientStr);
    // fetch mint info (to get decimals)
    const mintInfo = await (0, spl_token_1.getMint)(connection, mintPubkey);
    const decimals = mintInfo.decimals;
    // compute integer amount in base units (safe)
    const amountBase = (0, token_utils_1.decimalToBaseUnits)(paymentReq.amount, decimals);
    // get or derive associated token addresses (payer and recipient)
    const payerATA = await (0, spl_token_1.getAssociatedTokenAddress)(mintPubkey, payerPubkey);
    const recipientATA = await (0, spl_token_1.getAssociatedTokenAddress)(mintPubkey, recipientPub);
    // build transferChecked instruction (ensures correct decimals)
    const ix = (0, spl_token_1.createTransferCheckedInstruction)(payerATA, // source
    mintPubkey, // mint
    recipientATA, // dest
    payerPubkey, // owner's signer
    amountBase, // amount (bigint)
    decimals);
    const tx = new web3_js_1.Transaction().add(ix);
    tx.feePayer = payerPubkey;
    const { blockhash } = await connection.getLatestBlockhash(confirmOptions.commitment || 'confirmed');
    tx.recentBlockhash = blockhash;
    // If wallet-adapter sendTransaction is available, use it (it wraps signing + sending)
    if (provider.sendTransaction) {
        const sig = await provider.sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, confirmOptions.commitment || 'confirmed');
        return { txSignature: sig, raw: { amountBase: amountBase.toString() } };
    }
    // Otherwise: use signTransaction, then sendRawTransaction
    if (!provider.signTransaction)
        throw new Error('Provider missing signTransaction method');
    const signed = await provider.signTransaction(tx);
    const raw = signed.serialize();
    const sig = await connection.sendRawTransaction(raw);
    await connection.confirmTransaction(sig, confirmOptions.commitment || 'confirmed');
    return { txSignature: sig, raw: { amountBase: amountBase.toString() } };
}
