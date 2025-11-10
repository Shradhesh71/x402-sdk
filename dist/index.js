"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payWithPhantomCash = exports.Payments = exports.PaymentVerifier = exports.PaymentUtils = exports.PaymentBuilder = exports.X402SDK = void 0;
const web3_js_1 = require("@solana/web3.js");
const facilitator_1 = require("./facilitator");
const onchain_1 = require("./onchain");
const payment_builder_1 = require("./payment-builder");
Object.defineProperty(exports, "PaymentBuilder", { enumerable: true, get: function () { return payment_builder_1.PaymentBuilder; } });
Object.defineProperty(exports, "PaymentUtils", { enumerable: true, get: function () { return payment_builder_1.PaymentUtils; } });
Object.defineProperty(exports, "PaymentVerifier", { enumerable: true, get: function () { return payment_builder_1.PaymentVerifier; } });
Object.defineProperty(exports, "Payments", { enumerable: true, get: function () { return payment_builder_1.Payments; } });
const token_utils_1 = require("./token-utils");
const wallet_payments_1 = require("./wallet-payments");
class X402SDK {
    constructor(cfg) {
        this.cfg = cfg;
        if (cfg.defaultFacilitator) {
            this.facilitator = new facilitator_1.FacilitatorClient(cfg.defaultFacilitator, cfg.network);
        }
    }
    /**
     * Get the current SDK configuration
     */
    getConfig() {
        return { ...this.cfg };
    }
    /**
     * Returns the configured facilitator base URL or undefined
     */
    getFacilitatorUrl() {
        return this.cfg.defaultFacilitator;
    }
    /**
     * Set or change facilitator at runtime
     */
    setFacilitator(url) {
        this.cfg.defaultFacilitator = url;
        this.facilitator = new facilitator_1.FacilitatorClient(url, this.cfg.network);
    }
    /**
     * Get a connection to the Solana network
     */
    getConnection() {
        return (0, token_utils_1.getConnection)(this.cfg.network);
    }
    /**
     * Create a payment builder for easy payment configuration
     */
    createPayment() {
        return new payment_builder_1.PaymentBuilder();
    }
    /**
     * Quick access to common payment types
     */
    get payments() {
        return {
            sol: (amount, recipient) => payment_builder_1.Payments.sol(amount, recipient),
            usdc: (amount, recipient) => payment_builder_1.Payments.usdc(amount, recipient, this.cfg.network),
            spl: (amount, recipient, mintAddress, decimals = 6) => payment_builder_1.Payments.spl(amount, recipient, mintAddress, decimals)
        };
    }
    /**
     * Enhanced payment method with multi-token support
     */
    async pay(config, opts) {
        // Validate payment configuration
        const validation = payment_builder_1.PaymentUtils.validateConfig(config);
        if (!validation.isValid) {
            throw new Error(`Invalid payment configuration: ${validation.errors.join(', ')}`);
        }
        const method = opts?.method || this.cfg.defaultPaymentMethod || 'auto';
        const payerKeypair = opts?.payerKeypair;
        let useOnChain = false;
        if (method === 'onchain') {
            useOnChain = true;
        }
        else if (method === 'facilitator') {
            useOnChain = false;
        }
        else if (method === 'auto') {
            useOnChain = (this.cfg.preferOnChain === true) && !!payerKeypair;
        }
        if (useOnChain) {
            if (!payerKeypair) {
                throw new Error('Payer keypair is required for on-chain payments');
            }
            return await (0, onchain_1.submitPaymentOnChain)(config, {
                payerKeypair,
                network: this.cfg.network,
                simulateFirst: opts?.simulateFirst
            });
        }
        else {
            // Use facilitator
            if (!this.facilitator) {
                throw new Error('No facilitator configured. Call setFacilitator(url) or provide defaultFacilitator in SDKConfig.');
            }
            const paymentReq = payment_builder_1.PaymentUtils.toX402Requirements(config, this.cfg.network);
            return await this.facilitator.submitPayment(paymentReq);
        }
    }
    /**
     * Create a signed transaction without submitting (for x402 flow)
     */
    async createSignedTransaction(config, payerKeypair) {
        const validation = payment_builder_1.PaymentUtils.validateConfig(config);
        if (!validation.isValid) {
            throw new Error(`Invalid payment configuration: ${validation.errors.join(', ')}`);
        }
        const result = await (0, onchain_1.createSignedPaymentTransaction)(config, {
            payerKeypair,
            network: this.cfg.network
        });
        // Create x402 payment header
        const paymentProof = {
            x402Version: 1,
            scheme: 'exact',
            network: this.cfg.network,
            payload: {
                serializedTransaction: result.serializedTransaction
            }
        };
        const x402Header = payment_builder_1.PaymentUtils.createX402Header(paymentProof);
        return {
            ...result,
            x402Header
        };
    }
    /**
     * Verify a payment transaction
     */
    async verifyPayment(transaction, expectedConfig) {
        try {
            let tx;
            if (typeof transaction === 'string') {
                // Decode from base64 serialized transaction
                const txBuffer = Buffer.from(transaction, 'base64');
                tx = web3_js_1.Transaction.from(txBuffer);
            }
            else {
                tx = transaction;
            }
            return payment_builder_1.PaymentVerifier.verifyPaymentInstructions(tx, expectedConfig);
        }
        catch (error) {
            return {
                isValid: false,
                error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Legacy method for backward compatibility
     * Core method for paying for a resource. Strategy:
     * - If preferOnChain is true and caller provides a payer Keypair, perform on-chain submission
     * - Otherwise submit to the configured facilitator (hosted)
     */
    async payForResource(paymentReq, opts) {
        if (this.cfg.preferOnChain && opts?.payerKeypair) {
            const res = await (0, onchain_1.submitOnChainDirect)(paymentReq, {
                payerKeypair: opts.payerKeypair,
                network: this.cfg.network
            });
            return res;
        }
        if (!this.facilitator) {
            throw new Error('No facilitator configured. Call setFacilitator(url) or provide defaultFacilitator in SDKConfig.');
        }
        const exec = await this.facilitator.submitPayment(paymentReq);
        return exec;
    }
    /**
     * Enhanced verification helper
     */
    async verifyExec(exec) {
        return !!(exec?.txSignature || exec?.signature);
    }
    /**
     * Get transaction details from signature
     */
    async getTransactionDetails(signature) {
        const connection = this.getConnection();
        try {
            const transaction = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            return transaction;
        }
        catch (error) {
            throw new Error(`Failed to get transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Utility methods
     */
    get utils() {
        return {
            /**
             * Format amount for display
             */
            formatAmount: (amount, tokenType, decimals) => payment_builder_1.PaymentUtils.formatAmount(amount, tokenType, decimals),
            /**
             * Get explorer URL
             */
            getExplorerUrl: (signature) => payment_builder_1.PaymentUtils.getExplorerUrl(signature, this.cfg.network),
            /**
             * Parse x402 header
             */
            parseX402Header: (header) => payment_builder_1.PaymentUtils.parseX402Header(header),
            /**
             * Create x402 header
             */
            createX402Header: (data) => payment_builder_1.PaymentUtils.createX402Header(data),
            /**
             * Get USDC mint for current network
             */
            getUSDCMint: () => (0, token_utils_1.getUSDCMint)(this.cfg.network)
        };
    }
    async payWithPhantomCash(paymentReq, opts) {
        return (0, wallet_payments_1.payWithPhantomCash)(paymentReq, { connection: opts.connection, provider: opts.provider, cashMint: opts.cashMint });
    }
}
exports.X402SDK = X402SDK;
__exportStar(require("./server"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./token-utils"), exports);
var wallet_payments_2 = require("./wallet-payments");
Object.defineProperty(exports, "payWithPhantomCash", { enumerable: true, get: function () { return wallet_payments_2.payWithPhantomCash; } });
