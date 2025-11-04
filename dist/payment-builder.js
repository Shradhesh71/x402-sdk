"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payments = exports.PaymentVerifier = exports.PaymentUtils = exports.PaymentBuilder = void 0;
const web3_js_1 = require("@solana/web3.js");
const token_utils_1 = require("./token-utils");
/**
 * Payment builder for creating standardized payment configurations
 */
class PaymentBuilder {
    constructor() {
        this.config = {};
    }
    /**
     * Set the token type for the payment
     */
    setTokenType(tokenType) {
        this.config.tokenType = tokenType;
        return this;
    }
    /**
     * Set the payment amount
     */
    setAmount(amount) {
        this.config.amount = amount;
        return this;
    }
    /**
     * Set the recipient address
     */
    setRecipient(recipient) {
        this.config.recipient = recipient;
        return this;
    }
    /**
     * Set custom mint address (for SPL tokens)
     */
    setMintAddress(mintAddress) {
        this.config.mintAddress = mintAddress;
        return this;
    }
    /**
     * Set token decimals
     */
    setDecimals(decimals) {
        this.config.decimals = decimals;
        return this;
    }
    /**
     * Enable automatic token account creation if needed
     */
    createAccountIfNeeded(create = true) {
        this.config.createAccountIfNeeded = create;
        return this;
    }
    /**
     * Build SOL payment configuration
     */
    static sol(amount, recipient) {
        return new PaymentBuilder()
            .setTokenType('SOL')
            .setAmount(amount)
            .setRecipient(recipient)
            .setDecimals(9);
    }
    /**
     * Build USDC payment configuration
     */
    static usdc(amount, recipient, network) {
        return new PaymentBuilder()
            .setTokenType('USDC')
            .setAmount(amount)
            .setRecipient(recipient)
            .setMintAddress((0, token_utils_1.getUSDCMint)(network))
            .setDecimals(6)
            .createAccountIfNeeded(true);
    }
    /**
     * Build custom SPL token payment configuration
     */
    static spl(amount, recipient, mintAddress, decimals = 6) {
        return new PaymentBuilder()
            .setTokenType('SPL')
            .setAmount(amount)
            .setRecipient(recipient)
            .setMintAddress(mintAddress)
            .setDecimals(decimals)
            .createAccountIfNeeded(true);
    }
    /**
     * Build the final payment configuration
     */
    build() {
        if (!this.config.tokenType) {
            throw new Error('Token type is required');
        }
        if (this.config.amount === undefined || this.config.amount === null) {
            throw new Error('Amount is required');
        }
        if (!this.config.recipient) {
            throw new Error('Recipient is required');
        }
        if (this.config.tokenType !== 'SOL' && !this.config.mintAddress) {
            throw new Error('Mint address is required for SPL token payments');
        }
        return this.config;
    }
}
exports.PaymentBuilder = PaymentBuilder;
/**
 * Utility functions for payment operations
 */
class PaymentUtils {
    /**
     * Create x402 payment requirements from config
     */
    static toX402Requirements(config, network) {
        const decimals = config.decimals || (config.tokenType === 'SOL' ? 9 : 6);
        const amountInTokenUnits = (0, token_utils_1.toTokenUnits)(config.amount, decimals);
        return {
            amount: amountInTokenUnits.toString(),
            currency: config.tokenType,
            scheme: 'exact',
            payment_payload: {
                recipient: typeof config.recipient === 'string' ? config.recipient : config.recipient.toBase58(),
                tokenType: config.tokenType,
                mintAddress: config.mintAddress ? (typeof config.mintAddress === 'string' ? config.mintAddress : config.mintAddress.toBase58()) : undefined,
                decimals,
                network
            },
            tokenType: config.tokenType,
            mintAddress: config.mintAddress ? (typeof config.mintAddress === 'string' ? config.mintAddress : config.mintAddress.toBase58()) : undefined,
            createAccountIfNeeded: config.createAccountIfNeeded
        };
    }
    /**
     * Create payment config from x402 requirements
     */
    static fromX402Requirements(requirements) {
        const payload = requirements.payment_payload || {};
        return {
            tokenType: (requirements.tokenType || requirements.currency),
            amount: requirements.amount,
            recipient: payload.recipient || '',
            mintAddress: requirements.mintAddress || payload.mintAddress,
            decimals: payload.decimals,
            createAccountIfNeeded: requirements.createAccountIfNeeded
        };
    }
    /**
     * Validate payment configuration
     */
    static validateConfig(config) {
        const errors = [];
        if (!config.tokenType) {
            errors.push('Token type is required');
        }
        if (config.amount === undefined || config.amount === null) {
            errors.push('Amount is required');
        }
        else {
            const amount = typeof config.amount === 'string' ? parseFloat(config.amount) : config.amount;
            if (isNaN(amount) || amount <= 0) {
                errors.push('Amount must be a positive number');
            }
        }
        if (!config.recipient) {
            errors.push('Recipient is required');
        }
        else {
            try {
                if (typeof config.recipient === 'string') {
                    new web3_js_1.PublicKey(config.recipient);
                }
            }
            catch (error) {
                errors.push('Invalid recipient address');
            }
        }
        if (config.tokenType !== 'SOL' && !config.mintAddress) {
            errors.push('Mint address is required for SPL token payments');
        }
        if (config.mintAddress) {
            try {
                if (typeof config.mintAddress === 'string') {
                    new web3_js_1.PublicKey(config.mintAddress);
                }
            }
            catch (error) {
                errors.push('Invalid mint address');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Format amount for display
     */
    static formatAmount(amount, tokenType, decimals) {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        const dec = decimals || (tokenType === 'SOL' ? 9 : 6);
        // If amount is already in token units, convert to human readable
        if (numAmount > 1000000) {
            return `${(numAmount / Math.pow(10, dec)).toFixed(dec === 9 ? 4 : 2)} ${tokenType}`;
        }
        else {
            return `${numAmount.toFixed(dec === 9 ? 4 : 2)} ${tokenType}`;
        }
    }
    /**
     * Get explorer URL for transaction
     */
    static getExplorerUrl(signature, network) {
        const cluster = network.includes('mainnet') ? 'mainnet-beta' : 'devnet';
        return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
    }
    /**
     * Parse x402 payment header
     */
    static parseX402Header(header) {
        try {
            const decoded = Buffer.from(header, 'base64').toString('utf-8');
            return JSON.parse(decoded);
        }
        catch (error) {
            throw new Error('Invalid x402 payment header format');
        }
    }
    /**
     * Create x402 payment header
     */
    static createX402Header(data) {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }
}
exports.PaymentUtils = PaymentUtils;
/**
 * Payment verification utilities
 */
class PaymentVerifier {
    /**
     * Verify payment transaction instructions
     */
    static async verifyPaymentInstructions(transaction, expectedConfig) {
        try {
            const recipient = typeof expectedConfig.recipient === 'string'
                ? new web3_js_1.PublicKey(expectedConfig.recipient)
                : expectedConfig.recipient;
            const decimals = expectedConfig.decimals || (expectedConfig.tokenType === 'SOL' ? 9 : 6);
            const expectedAmount = (0, token_utils_1.toTokenUnits)(expectedConfig.amount, decimals);
            for (const instruction of transaction.instructions) {
                let isValid = false;
                if (expectedConfig.tokenType === 'SOL') {
                    isValid = (0, token_utils_1.verifySOLTransferInstruction)(instruction, recipient, expectedAmount);
                }
                else {
                    const mint = expectedConfig.mintAddress
                        ? (typeof expectedConfig.mintAddress === 'string'
                            ? new web3_js_1.PublicKey(expectedConfig.mintAddress)
                            : expectedConfig.mintAddress)
                        : undefined;
                    isValid = await (0, token_utils_1.verifySPLTransferInstruction)(instruction, recipient, expectedAmount, mint);
                }
                if (isValid) {
                    return {
                        isValid: true,
                        details: {
                            amount: Number(expectedAmount),
                            recipient: recipient.toBase58(),
                            tokenType: expectedConfig.tokenType,
                            mintAddress: expectedConfig.mintAddress
                                ? (typeof expectedConfig.mintAddress === 'string'
                                    ? expectedConfig.mintAddress
                                    : expectedConfig.mintAddress.toBase58())
                                : undefined
                        }
                    };
                }
            }
            return {
                isValid: false,
                error: `No valid ${expectedConfig.tokenType} transfer instruction found`
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
exports.PaymentVerifier = PaymentVerifier;
/**
 * Convenience functions for common payment types
 */
exports.Payments = {
    /**
     * Create SOL payment
     */
    sol: (amount, recipient) => PaymentBuilder.sol(amount, recipient).build(),
    /**
     * Create USDC payment
     */
    usdc: (amount, recipient, network) => PaymentBuilder.usdc(amount, recipient, network).build(),
    /**
     * Create custom SPL token payment
     */
    spl: (amount, recipient, mintAddress, decimals = 6) => PaymentBuilder.spl(amount, recipient, mintAddress, decimals).build()
};
