import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getMint
} from '@solana/spl-token';
import { decimalToBaseUnits } from './token-utils';

export type PhantomProvider = {
  publicKey?: PublicKey; // Phantom extension uses PublicKey
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  // optional wallet-adapter style:
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
};

export type PayOpts = {
  connection: Connection;
  provider: PhantomProvider;
  cashMint: string; // CASH token mint address, required
  confirmOptions?: { commitment?: 'confirmed' | 'finalized' | 'processed' };
};

/**
 * paymentReq: should include amount (string) and payment_payload.recipient (owner's pubkey)
 * Example: paymentReq = { amount: "0.5", currency: "CASH", payment_payload: { recipient: "RecipientPubkey..." } }
 */

export async function payWithPhantomCash(
  paymentReq: { amount: string; payment_payload: Record<string, any> },
  opts: PayOpts
): Promise<{ txSignature: string; raw?: any }> {
  const { connection, provider, cashMint, confirmOptions = { commitment: 'confirmed' } } = opts;
  if (!provider || (!provider.signTransaction && !provider.sendTransaction)) {
    throw new Error('Provider must implement signTransaction or sendTransaction (Phantom / wallet-adapter)');
  }
  if (!provider.publicKey) throw new Error('Provider not connected (no publicKey)');

  const payerPubkey = provider.publicKey as PublicKey;
  const mintPubkey = new PublicKey(cashMint);

  // recipient must be provided by payment_payload
  const recipientStr = paymentReq.payment_payload?.recipient;
  if (!recipientStr) throw new Error('payment_payload.recipient missing');
  const recipientPub = new PublicKey(recipientStr);

  // fetch mint info (to get decimals)
  const mintInfo = await getMint(connection, mintPubkey);
  const decimals = mintInfo.decimals;

  // compute integer amount in base units (safe)
  const amountBase = decimalToBaseUnits(paymentReq.amount, decimals);

  // get or derive associated token addresses (payer and recipient)
  const payerATA = await getAssociatedTokenAddress(mintPubkey, payerPubkey);
  const recipientATA = await getAssociatedTokenAddress(mintPubkey, recipientPub);

  // build transferChecked instruction (ensures correct decimals)
  const ix = createTransferCheckedInstruction(
    payerATA,    // source
    mintPubkey,  // mint
    recipientATA,// dest
    payerPubkey, // owner's signer
    amountBase,  // amount (bigint)
    decimals
  );

  const tx = new Transaction().add(ix);
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
  if (!provider.signTransaction) throw new Error('Provider missing signTransaction method');
  const signed = await provider.signTransaction(tx);
  const raw = signed.serialize();
  const sig = await connection.sendRawTransaction(raw);
  await connection.confirmTransaction(sig, confirmOptions.commitment || 'confirmed');
  return { txSignature: sig, raw: { amountBase: amountBase.toString() } };
}