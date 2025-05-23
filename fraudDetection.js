const Transaction = require("../models/transaction");

// Rate limit for transactions
exports.checkTransactionRate = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Count transactions in the last 5 minutes
    const recentTransactionsCount = await Transaction.countDocuments({
      fromUserId: userId,
      createdAt: { $gte: fiveMinutesAgo },
      type: { $in: ["withdrawal", "transfer"] }
    });
    
    // Flag if more than 5 transactions in 5 minutes
    if (recentTransactionsCount >= 5) {
      req.isFlagged = true;
      req.flagReason = "High transaction rate detected";
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Check for large amount transactions
exports.checkLargeAmount = (req, res, next) => {
  const { amount } = req.body;
  // Flag transactions above 1000 units
  if (amount > 1000) {
    req.isFlagged = true;
    req.flagReason = "Large transaction amount";
  }
  next();
};