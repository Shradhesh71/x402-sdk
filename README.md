# X402 SDK - Solana Payment Gateway

[![npm version](https://badge.fury.io/js/x402-sdk.svg)](https://www.npmjs.com/package/x402-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?logo=solana&logoColor=white)](https://solana.com/)

A comprehensive TypeScript SDK for implementing HTTP 402 (Payment Required) micropayments on Solana with support for SOL, USDC, and custom SPL tokens. Enable pay-per-use functionality in your applications with one-line integration.

## 🚀 Features

- **🪙 Multi-Token Support** - SOL, USDC, and any SPL token
- **⚡ Express Middleware** - One-line payment protection for APIs
- **🔒 Automatic Verification** - Built-in payment validation and settlement
- **🏗️ Builder Pattern** - Intuitive payment configuration API
- **🔄 Token Account Management** - Automatic creation of associated token accounts
- **📋 x402 Protocol Compliance** - Full HTTP 402 standard implementation
- **🛡️ TypeScript Support** - Complete type safety and IntelliSense
- **🌐 Multi-Network** - Supports devnet and mainnet
- **🔧 Server & Client** - Complete payment flow implementation

## 📦 Installation

```bash
npm install x402-sdk @solana/web3.js @solana/spl-token
```

## 🎯 Quick Start

### Client Integration

```typescript
import { X402SDK } from 'x402-sdk';
import { Keypair } from '@solana/web3.js';

// Initialize SDK
const sdk = new X402SDK({
  network: 'solana-devnet'
});

// Create payment
const payment = sdk.payments.sol(0.001, 'recipient-address');

// Execute payment
const wallet = Keypair.generate();
const result = await sdk.pay(payment, { payerKeypair: wallet });
console.log(`✅ Payment confirmed: ${result.explorerUrl}`);
```

### Server Integration

```typescript
import express from 'express';
import { createPaymentMiddleware } from 'x402-sdk/server';

const app = express();

// Add payment protection to endpoints
app.get('/premium-content', 
  createPaymentMiddleware({
    tokenType: 'USDC',
    price: 0.01,
    recipient: 'your-wallet-address',
    network: 'solana-devnet'
  }),
  (req, res) => {
    res.json({ content: 'Premium content unlocked!' });
  }
);

app.listen(3000, () => {
  console.log('🚀 Server with payment protection running on port 3000');
});
```

## 📚 Core Concepts

### X402 Payment Flow

```
1. Client → Server: Request protected resource
2. Server → Client: 402 Payment Required + payment details
3. Client: Creates & signs payment transaction
4. Client → Server: Retry request with X-Payment header
5. Server: Verifies payment & submits to blockchain
6. Server → Client: Protected content + payment confirmation
```

### Payment Configuration

```typescript
interface PaymentConfig {
  tokenType: 'SOL' | 'USDC' | 'SPL';
  amount: number;
  recipient: PublicKey;
  mintAddress?: PublicKey;    // Required for SPL tokens
  decimals?: number;          // Token decimals
  createAccountIfNeeded?: boolean;
}
```

## 🛠️ API Reference

### X402SDK Class

#### Constructor Options

```typescript
new X402SDK({
  network: 'solana-devnet' | 'solana-mainnet',
  preferOnChain?: boolean,                    // Default: true
  defaultPaymentMethod?: 'onchain' | 'auto', // Default: 'auto'
  defaultFacilitator?: string                 // Facilitator URL
})
```

#### Payment Methods

```typescript
// Convenience methods
sdk.payments.sol(amount, recipient)
sdk.payments.usdc(amount, recipient)  
sdk.payments.spl(amount, recipient, mintAddress, decimals)

// Builder pattern
const payment = sdk.createPayment()
  .setTokenType('USDC')
  .setAmount(0.01)
  .setRecipient(recipientAddress)
  .createAccountIfNeeded(true)
  .build();

// Execute payments
await sdk.pay(paymentConfig, options)
await sdk.createSignedTransaction(paymentConfig, keypair)

// Verify payments
await sdk.verifyPayment(transaction, expectedConfig)
```

#### Utility Functions

```typescript
sdk.utils.getUSDCMint()                           // Get USDC mint address
sdk.utils.getExplorerUrl(signature)               // Generate explorer URL
sdk.utils.formatAmount(amount, tokenType)         // Format display amount
sdk.utils.parseX402Header(header)                 // Parse payment header
sdk.utils.createX402Header(paymentData)           // Create payment header
```

### Server Middleware

#### Express Middleware Factory

```typescript
import { createPaymentMiddleware } from 'x402-sdk/server';

createPaymentMiddleware({
  tokenType: 'SOL' | 'USDC' | 'SPL',
  price: number,                    // Amount required
  recipient: string | PublicKey,    // Payment destination
  network: 'solana-devnet' | 'solana-mainnet',
  mintAddress?: PublicKey,          // For SPL tokens
  createAccountIfNeeded?: boolean   // Auto-create token accounts
})
```

#### Manual Payment Verification

```typescript
import { verifyAndSubmitSerializedTransaction } from 'x402-sdk/server';

const result = await verifyAndSubmitSerializedTransaction(
  serializedTransaction,  // Base64 transaction from client
  expectedConfig,         // Expected payment parameters
  network                // Network to submit on
);

if (result.success) {
  console.log('Payment verified:', result.signature);
} else {
  console.error('Payment failed:', result.error);
}
```

## 💡 Examples

### SOL Micropayments

```typescript
// 0.001 SOL payment for API access
const solPayment = sdk.payments.sol(0.001, recipientAddress);
const result = await sdk.pay(solPayment, { payerKeypair: wallet });

console.log('Payment:', {
  signature: result.signature,
  explorer: result.explorerUrl,
  amount: result.paymentDetails.amount,
  recipient: result.paymentDetails.recipient
});
```

### USDC Payments with Auto Account Creation

```typescript
// 0.01 USDC payment with automatic token account creation
const usdcPayment = sdk.payments.usdc(0.01, recipientAddress);
const result = await sdk.pay(usdcPayment, { 
  payerKeypair: wallet,
  createAccountIfNeeded: true 
});
```

### Custom SPL Token Payments

```typescript
// Custom token payment
const customPayment = sdk.payments.spl(
  100,                          // Amount: 100 tokens
  recipientAddress,             // Recipient
  new PublicKey('mint...'),     // Token mint address
  9                             // Token decimals
);
```

### x402 Client Implementation

```typescript
async function makeProtectedRequest(url: string) {
  try {
    // Initial request
    const response = await fetch(url);
    
    if (response.status === 402) {
      // Payment required
      const paymentInfo = await response.json();
      
      // Create payment
      const payment = sdk.payments.usdc(
        paymentInfo.payment.amount,
        paymentInfo.payment.recipient
      );
      
      // Create signed transaction
      const signedTx = await sdk.createSignedTransaction(payment, wallet);
      
      // Retry with payment
      const paidResponse = await fetch(url, {
        headers: { 'X-Payment': signedTx.x402Header }
      });
      
      return await paidResponse.json();
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment request failed:', error);
  }
}
```

### Advanced Server Setup

```typescript
import express from 'express';
import { createPaymentMiddleware } from 'x402-sdk/server';

const app = express();

// Different payment tiers
const basicPayment = createPaymentMiddleware({
  tokenType: 'SOL',
  price: 0.001,
  recipient: process.env.WALLET_ADDRESS,
  network: 'solana-devnet'
});

const premiumPayment = createPaymentMiddleware({
  tokenType: 'USDC', 
  price: 0.01,
  recipient: process.env.WALLET_ADDRESS,
  network: 'solana-devnet'
});

// Protected endpoints
app.get('/api/basic', basicPayment, (req, res) => {
  res.json({ data: 'Basic tier content' });
});

app.get('/api/premium', premiumPayment, (req, res) => {
  res.json({ data: 'Premium tier content' });
});

// Batch payment endpoint
app.post('/api/batch', 
  createPaymentMiddleware({
    tokenType: 'USDC',
    price: (req) => req.body.items.length * 0.001, // Dynamic pricing
    recipient: process.env.WALLET_ADDRESS,
    network: 'solana-devnet'
  }),
  (req, res) => {
    res.json({ 
      processed: req.body.items.length,
      total_cost: req.body.items.length * 0.001 
    });
  }
);
```

## 🔧 Configuration

### Network Configuration

```typescript
// Development
const sdk = new X402SDK({ 
  network: 'solana-devnet',
  preferOnChain: true
});

// Production
const sdk = new X402SDK({ 
  network: 'solana-mainnet',
  preferOnChain: true
});
```

### Custom RPC Endpoints

```typescript
const sdk = new X402SDK({
  network: 'solana-devnet',
  rpcUrl: 'https://your-custom-rpc.com'
});
```

## 🚨 Error Handling

```typescript
try {
  const result = await sdk.pay(payment, { payerKeypair: wallet });
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_FUNDS':
      console.log('Wallet needs more tokens');
      break;
    case 'INVALID_RECIPIENT':
      console.log('Invalid recipient address');
      break;
    case 'NETWORK_ERROR':
      console.log('Network connectivity issue');
      break;
    case 'TRANSACTION_FAILED':
      console.log('Transaction failed on-chain');
      break;
    default:
      console.log('Payment failed:', error.message);
  }
}
```

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the robust [Solana](https://solana.com/) blockchain
- Inspired by the [x402 protocol](https://github.com/coinbase/x402)
- Thanks to the Solana developer community

---

**Built for the Solana ecosystem** 
