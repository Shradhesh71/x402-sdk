import { X402SDK } from '../src/index';
import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Example: SOL Payment using the X402SDK
 * 
 * This example demonstrates how to use the enhanced X402SDK to make SOL payments
 * both via facilitator and directly on-chain.
 */

async function solPaymentExample() {
  console.log('X402SDK SOL Payment Example');

  // initialize SDK
  const sdk = new X402SDK({
    network: 'solana-devnet',
    preferOnChain: false, 
    defaultPaymentMethod: 'auto'
  });

  // Create a keypair
  const payer = Keypair.generate();
  const recipient = new PublicKey('8jim6ZEEH9Wc6CT24udCnaMnfqHMdpSFXTGExq1p5ggD');

  // Request airdrop for testing (devnet only)
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL * 2);
    await connection.confirmTransaction(airdropSignature);
    console.log('Airdrop successful');
  } catch (error) {
    console.log('Airdrop failed (rate limit or network issue)');
  }

  try {
    // Method 1: Using the builder pattern
    console.log('Method 1: Using Payment Builder');
    const paymentConfig = sdk.createPayment()
      .setTokenType('SOL')
      .setAmount(0.001) // 0.001 SOL
      .setRecipient(recipient)
      .build();

    // Create signed transaction for x402 flow
    try {
      const signedTx = await sdk.createSignedTransaction(paymentConfig, payer);
      console.log('Transaction created and signed');
      console.log('X402 Header length:', signedTx.x402Header.length);
    } catch (error) {
      console.log('⚠️ Transaction creation failed (unfunded account):', String(error));
    }

    // Utility functions
    console.log('Explorer URL:', sdk.utils.getExplorerUrl('dummy-signature'));
    console.log('USDC Mint:', sdk.utils.getUSDCMint().toBase58());

  } catch (error) {
    console.error('❌ Error in SOL payment example:', error);
  }
}

// Facilitator payment example (when facilitator is available)
async function facilitatorPaymentExample() {
  console.log('\n🏦 Facilitator Payment Example');
  
  const sdk = new X402SDK({
    network: 'solana-devnet',
    defaultFacilitator: 'http://localhost:3000/premium',
    preferOnChain: false
  });

  const paymentConfig = sdk.payments.sol(0.001, '8jim6ZEEH9Wc6CT24udCnaMnfqHMdpSFXTGExq1p5ggD');
  
  try {
    const result = await sdk.pay(paymentConfig, { method: 'facilitator' });
    console.log('Facilitator payment successful:', result.txSignature);
  } catch (error) {
    console.log('Facilitator not available - set up facilitator server first');
  }
}

// Run examples
solPaymentExample()
  .then(() => facilitatorPaymentExample())
  .catch(console.error);

export { solPaymentExample, facilitatorPaymentExample };