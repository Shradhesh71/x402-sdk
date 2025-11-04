"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_MAINNET_MINT = exports.USDC_DEVNET_MINT = void 0;
exports.getUSDCMint = getUSDCMint;
exports.getConnection = getConnection;
exports.getOrCreateTokenAccount = getOrCreateTokenAccount;
exports.getTokenAccountInfo = getTokenAccountInfo;
exports.tokenAccountExists = tokenAccountExists;
exports.createSPLTransferInstruction = createSPLTransferInstruction;
exports.toTokenUnits = toTokenUnits;
exports.fromTokenUnits = fromTokenUnits;
exports.getMintInfo = getMintInfo;
exports.createSOLPaymentTransaction = createSOLPaymentTransaction;
exports.createSPLPaymentTransaction = createSPLPaymentTransaction;
exports.verifySPLTransferInstruction = verifySPLTransferInstruction;
exports.verifySOLTransferInstruction = verifySOLTransferInstruction;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Common mint addresses
exports.USDC_DEVNET_MINT = new web3_js_1.PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
exports.USDC_MAINNET_MINT = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
/**
 * Get USDC mint address for the given network
 */
function getUSDCMint(network) {
    return network.includes('mainnet') ? exports.USDC_MAINNET_MINT : exports.USDC_DEVNET_MINT;
}
/**
 * Get connection for the given network
 */
function getConnection(network) {
    const cluster = network === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
    return new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)(cluster), 'confirmed');
}
/**
 * Get or create associated token account
 */
async function getOrCreateTokenAccount(connection, payer, mint, owner) {
    const associatedTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner);
    try {
        await (0, spl_token_1.getAccount)(connection, associatedTokenAccount);
        return { address: associatedTokenAccount };
    }
    catch (error) {
        // Account doesn't exist, create instruction
        const instruction = (0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, associatedTokenAccount, owner, mint);
        return {
            address: associatedTokenAccount,
            instruction
        };
    }
}
/**
 * Get token account info including balance and existence
 */
async function getTokenAccountInfo(connection, tokenAccount) {
    try {
        const accountInfo = await (0, spl_token_1.getAccount)(connection, tokenAccount);
        return {
            address: tokenAccount,
            mint: accountInfo.mint,
            owner: accountInfo.owner,
            amount: accountInfo.amount,
            exists: true
        };
    }
    catch (error) {
        return null;
    }
}
/**
 * Check if token account exists
 */
async function tokenAccountExists(connection, tokenAccount) {
    try {
        await (0, spl_token_1.getAccount)(connection, tokenAccount);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Create SPL token transfer instruction
 */
function createSPLTransferInstruction(sourceTokenAccount, destinationTokenAccount, owner, amount) {
    return (0, spl_token_1.createTransferInstruction)(sourceTokenAccount, destinationTokenAccount, owner, amount);
}
/**
 * Convert amount to token units (handle decimals)
 */
function toTokenUnits(amount, decimals) {
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    return BigInt(Math.floor(amountNumber * Math.pow(10, decimals)));
}
/**
 * Convert token units to human readable amount
 */
function fromTokenUnits(amount, decimals) {
    return Number(amount) / Math.pow(10, decimals);
}
/**
 * Get mint info including decimals
 */
async function getMintInfo(connection, mint) {
    try {
        return await (0, spl_token_1.getMint)(connection, mint);
    }
    catch (error) {
        throw new Error(`Failed to get mint info for ${mint.toBase58()}: ${error}`);
    }
}
/**
 * Create a complete payment transaction for SOL
 */
async function createSOLPaymentTransaction(connection, payer, config) {
    const recipient = typeof config.recipient === 'string'
        ? new web3_js_1.PublicKey(config.recipient)
        : config.recipient;
    const lamports = toTokenUnits(config.amount, 9); // SOL has 9 decimals
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new web3_js_1.Transaction({
        feePayer: payer.publicKey,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });
    const transferInstruction = web3_js_1.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: Number(lamports),
    });
    transaction.add(transferInstruction);
    return transaction;
}
/**
 * Create a complete payment transaction for USDC/SPL tokens
 */
async function createSPLPaymentTransaction(connection, payer, config) {
    if (!config.mintAddress) {
        throw new Error('Mint address is required for SPL token payments');
    }
    const mint = typeof config.mintAddress === 'string'
        ? new web3_js_1.PublicKey(config.mintAddress)
        : config.mintAddress;
    const recipient = typeof config.recipient === 'string'
        ? new web3_js_1.PublicKey(config.recipient)
        : config.recipient;
    // Get mint info to determine decimals
    const mintInfo = await getMintInfo(connection, mint);
    const decimals = config.decimals || mintInfo.decimals;
    const amount = toTokenUnits(config.amount, decimals);
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new web3_js_1.Transaction({
        feePayer: payer.publicKey,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });
    // Get payer's token account
    const { address: payerTokenAccount, instruction: createPayerAccountIx } = await getOrCreateTokenAccount(connection, payer, mint, payer.publicKey);
    if (createPayerAccountIx) {
        transaction.add(createPayerAccountIx);
    }
    // Get recipient's token account
    const { address: recipientTokenAccount, instruction: createRecipientAccountIx } = await getOrCreateTokenAccount(connection, payer, mint, recipient);
    if (createRecipientAccountIx && config.createAccountIfNeeded) {
        transaction.add(createRecipientAccountIx);
    }
    // Add transfer instruction
    const transferInstruction = createSPLTransferInstruction(payerTokenAccount, recipientTokenAccount, payer.publicKey, amount);
    transaction.add(transferInstruction);
    return transaction;
}
/**
 * Verify SPL token transfer instruction
 */
async function verifySPLTransferInstruction(instruction, expectedRecipient, expectedAmount, expectedMint) {
    try {
        // Check if this is a Token Program instruction
        if (!instruction.programId.equals(spl_token_1.TOKEN_PROGRAM_ID)) {
            return false;
        }
        // SPL Token Transfer instruction layout:
        // [0] = instruction type (3 for Transfer)
        // [1-8] = amount (u64, little-endian)
        if (instruction.data.length >= 9 && instruction.data[0] === 3) {
            const transferAmount = instruction.data.readBigUInt64LE(1);
            // Verify amount
            if (transferAmount < expectedAmount) {
                return false;
            }
            // Verify accounts: [source, destination, owner]
            if (instruction.keys.length >= 2) {
                const destinationAccount = instruction.keys[1].pubkey;
                // Derive the expected associated token account for the recipient
                if (expectedMint) {
                    try {
                        const expectedTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(expectedMint, expectedRecipient);
                        if (!destinationAccount.equals(expectedTokenAccount)) {
                            return false;
                        }
                    }
                    catch (error) {
                        return false;
                    }
                }
                else {
                    // If no mint provided, we can't verify the token account derivation
                    return false;
                }
                return transferAmount >= expectedAmount;
            }
        }
        return false;
    }
    catch (error) {
        return false;
    }
}
/**
 * Verify SOL transfer instruction
 */
function verifySOLTransferInstruction(instruction, expectedRecipient, expectedAmount) {
    try {
        const SYSTEM_PROGRAM = new web3_js_1.PublicKey('11111111111111111111111111111111');
        if (!instruction.programId.equals(SYSTEM_PROGRAM)) {
            return false;
        }
        // SystemProgram.transfer has instruction type 2
        // Layout: [u32 instruction_type, u64 lamports]
        if (instruction.data.length === 12 && instruction.data[0] === 2) {
            const transferAmount = instruction.data.readBigUInt64LE(4);
            // Verify amount
            if (transferAmount < expectedAmount) {
                return false;
            }
            // Verify accounts: [from, to]
            if (instruction.keys.length >= 2) {
                const toAccount = instruction.keys[1].pubkey;
                return toAccount.equals(expectedRecipient) && transferAmount >= expectedAmount;
            }
        }
        return false;
    }
    catch (error) {
        return false;
    }
}
