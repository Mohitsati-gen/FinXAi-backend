import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js";

export const createAccount = async (req, res) => {
  try {
    // ✅ call it as a function
    const auth = req.auth();
    
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, type, balance, isDefault } = req.body;

    if (isDefault) {
      await Account.updateMany({ clerkUserId }, { isDefault: false });
    }

    const existingAccounts = await Account.countDocuments({ clerkUserId });

    const account = await Account.create({
      name,
      type,
      balance: parseFloat(balance) || 0,
      isDefault: isDefault || existingAccounts === 0,
      clerkUserId,
    });

    return res.status(201).json({ success: true, data: account });

  } catch (error) {
    console.error("Create account error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};


// GET all accounts for current user
export const getAccounts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const accounts = await Account.find({ clerkUserId: userId }).sort({ isDefault: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH set default account
export const setDefaultAccount = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;
    await Account.updateMany({ clerkUserId: userId }, { isDefault: false });
    await Account.findByIdAndUpdate(id, { isDefault: true });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getAccountById = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;

    const account = await Account.findOne({ _id: id, clerkUserId: userId });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// controllers/account.controller.js

export const getAccountTransactions = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;
    const { period = "1m" } = req.query;

    // verify account belongs to user
    const account = await Account.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // calculate start date based on period
    const now = new Date();
    let startDate = null;

    switch (period) {
      case "7d":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "1m":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3m":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "all":
      default:
        startDate = null; // no date filter
        break;
    }

    // build query
    const query = { accountId: id, userId };
    if (startDate) {
      query.date = { $gte: startDate };
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 }) // newest first
      .lean();

    res.status(200).json({
      success: true,
      data: transactions,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteAccount = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id }     = req.params;

    // verify account belongs to user
    const account = await Account.findOne({ _id: id, clerkUserId: userId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // delete all transactions of this account
    await Transaction.deleteMany({ accountId: id, clerkUserId: userId });

    // delete the account
    await Account.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Account and all its transactions deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};