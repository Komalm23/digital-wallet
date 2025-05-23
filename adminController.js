const Transaction = require("../models/transaction");
const User = require("../models/user");
const Wallet = require("../models/wallet");

// Get all flagged transactions
exports.getFlaggedTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const flaggedTransactions = await Transaction.find({ flagged: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Transaction.countDocuments({ flagged: true });
    
    // Enrich transaction data with user info
    const enrichedTransactions = await Promise.all(flaggedTransactions.map(async (transaction) => {
      let enriched = transaction.toObject();
      
      if (transaction.fromUserId) {
        const fromUser = await User.findById(transaction.fromUserId);
        enriched.fromUser = fromUser ? {
          id: fromUser._id,
          username: fromUser.username,
          email: fromUser.email
        } : null;
      }
      
      if (transaction.toUserId) {
        const toUser = await User.findById(transaction.toUserId);
        enriched.toUser = toUser ? {
          id: toUser._id,
          username: toUser.username,
          email: toUser.email
        } : null;
      }
      
      return enriched;
    }));
    
    res.json({
      flaggedTransactions: enrichedTransactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get flagged transactions", error: error.message });
  }
};

// Get total balance across all wallets
exports.getTotalBalance = async (req, res) => {
  try {
    const result = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalBalance = result.length > 0 ? result[0].totalBalance : 0;
    const walletCount = result.length > 0 ? result[0].count : 0;
    
    res.json({
      totalBalance,
      walletCount
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get total balance", error: error.message });
  }
};

// Get top users by balance
exports.getTopUsersByBalance = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topWallets = await Wallet.find()
      .sort({ balance: -1 })
      .limit(limit);
    
    // Enrich with user data
    const enrichedWallets = await Promise.all(topWallets.map(async (wallet) => {
      const user = await User.findById(wallet.userId);
      return {
        userId: wallet.userId,
        username: user ? user.username : "Unknown user",
        balance: wallet.balance,
        currency: wallet.currency
      };
    }));
    
    res.json({ topUsers: enrichedWallets });
  } catch (error) {
    res.status(500).json({ message: "Failed to get top users", error: error.message });
  }
};

// Get top users by transaction volume
exports.getTopUsersByVolume = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    // Aggregate transaction volume for each user
    const result = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit },
          status: "completed"
        }
      },
      {
        $project: {
          userId: {
            $cond: [
              { $eq: ["$type", "deposit"] },
              "$toUserId",
              "$fromUserId"
            ]
          },
          amount: 1
        }
      },
      {
        $group: {
          _id: "$userId",
          transactionCount: { $sum: 1 },
          totalVolume: { $sum: "$amount" }
        }
      },
      {
        $sort: { totalVolume: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    // Enrich with user data
    const enrichedUsers = await Promise.all(result.map(async (item) => {
      const user = await User.findById(item._id);
      return {
        userId: item._id,
        username: user ? user.username : "Unknown user",
        transactionCount: item.transactionCount,
        totalVolume: item.totalVolume
      };
    }));
    
    res.json({
      topUsersByVolume: enrichedUsers,
      period: `Last ${days} days`
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get top users by volume", error: error.message });
  }
};