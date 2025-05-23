// controllers/walletController.js
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const User = require("../models/user");
const mongoose = require("mongoose");

// Get wallet balance for current user
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    
    res.json({
      balance: wallet.balance,
      currency: wallet.currency,
      updatedAt: wallet.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get balance", error: error.message });
  }
};

// Deposit money to current user"s wallet
exports.deposit = async (req, res) => {
  
  try {
    const { amount } = req.body;
    const userId = req.user._id;
    
    // Find or create user"s wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
      await wallet.save();
    }
    
    // Create the transaction
    const transaction = new Transaction({
      type: "deposit",
      amount: amount,
      toUserId: userId,
      status: "pending",
      flagged: req.isFlagged || false,
      flagReason: req.flagReason
    });

    // Update transaction status
    transaction.status = "completed";
    await transaction.save();
    
    // Update wallet balance
    wallet.balance += parseFloat(amount);
    wallet.updatedAt = Date.now();
    await wallet.save();
    
    
    res.json({
      message: "Deposit successful",
      transaction: {
        id: transaction._id,
        amount,
        type: "deposit",
        status: "completed",
        timestamp: transaction.createdAt
      },
      newBalance: wallet.balance
    });
  } catch (error) {
    res.status(500).json({ message: "Deposit failed", error: error.message });
  }
};

// Withdraw money from current user"s wallet
exports.withdraw = async (req, res) => {
  
  try {
    const { amount } = req.body;
    const userId = req.user._id;
    
    // Find user"s wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    
    // Check if enough balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }
    
    // Create the transaction
    const transaction = new Transaction({
      type: "withdrawal",
      amount,
      fromUserId: userId,
      status: "pending",
      flagged: req.isFlagged || false,
      flagReason: req.flagReason
    });
    
    transaction.status = "completed";
    await transaction.save();
    
    // Update wallet balance
    wallet.balance -= parseFloat(amount);
    wallet.updatedAt = Date.now();
    await wallet.save();
    
    res.json({
      message: "Withdrawal successful",
      transaction: {
        id: transaction._id,
        amount,
        type: "withdrawal",
        status: "completed",
        timestamp: transaction.createdAt
      },
      newBalance: wallet.balance
    });
  } catch (error) {
    res.status(500).json({ message: "Withdrawal failed", error: error.message });
  }
};

// Transfer money to another user
exports.transfer = async (req, res) => {
  
  try {
    const { amount, recipientUsername } = req.body;
    const senderId = req.user._id;
    
    // Find recipient
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }
    
    // Check if sending to self
    if (senderId.toString() === recipient._id.toString()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }
    
    // Find sender"s wallet
    const senderWallet = await Wallet.findOne({ userId: senderId });
    if (!senderWallet) {
      return res.status(404).json({ message: "Sender wallet not found" });
    }
    
    // Check if enough balance
    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }
    
    // Find or create recipient"s wallet
    let recipientWallet = await Wallet.findOne({ userId: recipient._id });
    if (!recipientWallet) {
      recipientWallet = new Wallet({ userId: recipient._id, balance: 0 });
      await recipientWallet.save();
    }
    
    // Create the transaction
    const transaction = new Transaction({
      type: "transfer",
      amount,
      fromUserId: senderId,
      toUserId: recipient._id,
      status: "pending",
      flagged: req.isFlagged || false,
      flagReason: req.flagReason
    });
    
    transaction.status = "completed";
    await transaction.save();
    
    // Update wallets
    senderWallet.balance -= parseFloat(amount);
    senderWallet.updatedAt = Date.now();
    await senderWallet.save();
    
    recipientWallet.balance += parseFloat(amount);
    recipientWallet.updatedAt = Date.now();
    await recipientWallet.save();
    
    // Update transaction status
    
    res.json({
      message: "Transfer successful",
      transaction: {
        id: transaction._id,
        amount,
        type: "transfer",
        recipient: recipientUsername,
        status: "completed",
        timestamp: transaction.createdAt
      },
      newBalance: senderWallet.balance
    });
  } catch (error) {
    res.status(500).json({ message: "Transfer failed", error: error.message });
  }
};

// Get transaction history for current user
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find transactions where user is sender or recipient
    const transactions = await Transaction.find({
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    // Count total transactions
    const total = await Transaction.countDocuments({
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    });
    
    // Format transactions for response
    const formattedTransactions = await Promise.all(transactions.map(async (transaction) => {
      let formattedTx = {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        timestamp: transaction.createdAt
      };
      
      // Add sender/recipient info for transfers
      if (transaction.type === "transfer") {
        if (transaction.fromUserId.toString() === userId.toString()) {
          // Outgoing transfer
          const recipient = await User.findById(transaction.toUserId);
          formattedTx.direction = "outgoing";
          formattedTx.with = recipient ? recipient.username : "Unknown user";
        } else {
          // Incoming transfer
          const sender = await User.findById(transaction.fromUserId);
          formattedTx.direction = "incoming";
          formattedTx.with = sender ? sender.username : "Unknown user";
        }
      }
      
      return formattedTx;
    }));
    
    res.json({
      transactions: formattedTransactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get transaction history", error: error.message });
  }
};