import { X402SDK } from '../src/index';
import { Keypair, PublicKey } from '@solana/web3.js';

/**
 * Example: USDC Payment using the X402SDK
 * 
 * This example demonstrates how to use the X402SDK to make USDC payments
 * including automatic token account creation and SPL token handling.
 */

async function usdcPaymentExample() {
  console.log('🪙 X402SDK USDC Payment Example');

  // Initialize SDK
  const sdk = new X402SDK({
    network: 'solana-devnet',
    preferOnChain: false,
    defaultPaymentMethod: 'auto'
  });

  // Create keypairs (in production, load from secure storage)
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  
  console.log('💳 Payer:', payer.publicKey.toBase58());
  console.log('🎯 Recipient:', recipient.publicKey.toBase58());
  console.log('🏦 USDC Mint:', sdk.utils.getUSDCMint().toBase58());

  try {
    // Method 1: Using payment builder
    console.log('\n📋 Creating USDC payment configuration...');
    const usdcPaymentConfig = sdk.createPayment()
      .setTokenType('USDC')
      .setAmount(0.01) // 0.01 USDC
      .setRecipient(recipient.publicKey)
      .setMintAddress(sdk.utils.getUSDCMint())
      .setDecimals(6)
      .createAccountIfNeeded(true)
      .build();

    console.log('✅ USDC payment config created');

    // Method 2: Using convenience method
    const quickUSDCPayment = sdk.payments.usdc(0.01, recipient.publicKey);
    console.log('✅ Quick USDC payment config created');

    // Method 3: Create signed transaction (x402 flow)
    try {
      const signedTx = await sdk.createSignedTransaction(usdcPaymentConfig, payer);
      console.log('✅ USDC transaction created and signed');
      console.log('📄 X402 Header length:', signedTx.x402Header.length);
    } catch (error) {
      console.log('⚠️ Transaction creation failed (unfunded account):', String(error));
    }

    // Method 4: Direct onchain payment (requires funding)
    console.log('\n🔗 Direct payment example (requires funded wallet):');
    console.log('const result = await sdk.pay(usdcPaymentConfig, payer);');
    console.log('// This would execute the payment on-chain');

  } catch (error) {
    console.error('❌ Error in USDC payment example:', error);
  }
}

// Facilitator payment example
async function facilitatorUSDCExample() {
  console.log('\n🏦 Facilitator USDC Payment Example');
  
  const sdk = new X402SDK({
    network: 'solana-devnet',
    defaultFacilitator: 'http://localhost:3000/premium-usdc',
    preferOnChain: false
  });

  const paymentConfig = sdk.payments.usdc(0.01, '8jim6ZEEH9Wc6CT24udCnaMnfqHMdpSFXTGExq1p5ggD');
  
  try {
    const result = await sdk.pay(paymentConfig, { method: 'facilitator' });
    console.log('✅ Facilitator USDC payment successful:', result.txSignature);
  } catch (error) {
    console.log('⚠️ Facilitator not available - set up facilitator server first');
  }
}

// Run examples
usdcPaymentExample()
  .then(() => facilitatorUSDCExample())
  .catch(console.error);

export { usdcPaymentExample, facilitatorUSDCExample };