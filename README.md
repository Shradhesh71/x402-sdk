# X402 SDK - Solana Payment Gateway

[![npm version](https://badge.fury.io/js/x402-sdk-solana.svg)](https://www.npmjs.com/package/x402-sdk-solana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for HTTP 402 micropayments on Solana. Add pay-per-use to your APIs with one line of code.

**Features:** SOL/USDC/CASH payments • Phantom wallet support • Express middleware • Auto verification • TypeScript

## 📦 Installation

```bash
npm install x402-sdk-solana
```

## 🚀 Quick Start

### Client Integration

```typescript
import { X402SDK } from 'x402-sdk-solana';
import { Keypair } from '@solana/web3.js';

// Initialize SDK
const sdk = new X402SDK({ network: 'solana-devnet' });

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
import { createPaymentMiddleware } from 'x402-sdk-solana';

const app = express();

// Add payment protection to endpoints
app.get('/premium-content', 
  createPaymentMiddleware({
    tokenType: 'SOL',
    price: 0.001,
    recipient: 'your-wallet-address',
    network: 'solana-devnet'
  }),
  (req, res) => {
    res.json({ content: 'Premium content unlocked!' });
  }
);

app.listen(3000);
```

## � How it Works

```
1. Client → Server: Request protected resource
2. Server → Client: 402 Payment Required + payment details
3. Client: Creates & signs payment transaction
4. Client → Server: Retry request with X-Payment header
5. Server: Verifies payment & submits to blockchain
6. Server → Client: Protected content + payment confirmation
```

## 🛠️ API Reference

### X402SDK Class

```typescript
// Initialize
const sdk = new X402SDK({
  network: 'solana-devnet' | 'solana-mainnet'
});

// Payment methods
sdk.payments.sol(amount, recipient)
sdk.payments.usdc(amount, recipient)
sdk.payments.spl(amount, recipient, mintAddress, decimals)

// Phantom CASH payments (browser only)
await sdk.payWithPhantomCash(paymentReq, {
  connection,
  provider: window.phantom.solana,
  cashMint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT'
})

// Execute payments
await sdk.pay(paymentConfig, { payerKeypair: wallet })
await sdk.createSignedTransaction(paymentConfig, keypair)

// Utilities
sdk.utils.getUSDCMint()
sdk.utils.getExplorerUrl(signature)
```

### Server Middleware

```typescript
import { createPaymentMiddleware } from 'x402-sdk-solana';

createPaymentMiddleware({
  tokenType: 'SOL' | 'USDC',
  price: number,
  recipient: string,
  network: 'solana-devnet' | 'solana-mainnet'
})
```

## Examples

### Phantom Wallet CASH Payments

```typescript
import { payWithPhantomCash } from 'x402-sdk-solana';
import { Connection } from '@solana/web3.js';

// Connect Phantom wallet
const provider = window.phantom?.solana;
await provider.connect();

// Pay with CASH token
const result = await payWithPhantomCash(
  {
    amount: '0.01',
    payment_payload: {
      recipient: 'recipient-wallet-address'
    }
  },
  {
    connection: new Connection('https://api.devnet.solana.com'),
    provider,
    cashMint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT'
  }
);

console.log(`✅ CASH payment sent: ${result.txSignature}`);
```

### Complete x402 Flow

```typescript
// Client - handles 402 responses automatically
async function makeRequest(url: string) {
  const response = await fetch(url);
  
  if (response.status === 402) {
    // Payment required - create and send payment
    const payment = sdk.payments.sol(0.001, 'recipient-address');
    const signedTx = await sdk.createSignedTransaction(payment, wallet);
    
    // Retry with payment header
    return fetch(url, {
      headers: { 'X-Payment': signedTx.x402Header }
    });
  }
  
  return response;
}
```

### Multiple Payment Options

```typescript
// Server with different pricing tiers
const basicPayment = createPaymentMiddleware({
  tokenType: 'SOL',
  price: 0.001,
  recipient: 'your-address',
  network: 'solana-devnet'
});

const premiumPayment = createPaymentMiddleware({
  tokenType: 'USDC', 
  price: 0.01,
  recipient: 'your-address',
  network: 'solana-devnet'
});

const cashPayment = createPaymentMiddleware({
  tokenType: 'SPL',
  price: 0.01,
  recipient: 'your-address',
  network: 'solana-devnet',
  mintAddress: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
  decimals: 6
});

app.get('/api/basic', basicPayment, (req, res) => {
  res.json({ data: 'Basic content' });
});

app.get('/api/premium', premiumPayment, (req, res) => {
  res.json({ data: 'Premium content' });
});

app.get('/api/cash', cashPayment, (req, res) => {
  res.json({ data: 'CASH token content' });
});
```

## 🔧 Configuration

```typescript
// Development
const sdk = new X402SDK({ network: 'solana-devnet' });

// Production  
const sdk = new X402SDK({ network: 'solana-mainnet' });
```

## 🚨 Error Handling

```typescript
try {
  const result = await sdk.pay(payment, { payerKeypair: wallet });
} catch (error) {
  console.log('Payment failed:', error.message);
  // Handle insufficient funds, network errors, etc.
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

 **Built for the Solana ecosystem** • [npm](https://www.npmjs.com/package/x402-sdk-solana) • [GitHub](https://github.com/Shradhesh71/x402-sdk) 