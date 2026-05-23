// controllers/transaction.controller.js
import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js"
import mongoose from "mongoose";
import { scanReceiptWithAI } from "../lib/gemini.js";

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await scanReceiptWithAI(req.file.buffer, req.file.mimetype);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Receipt scan error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to scan receipt" });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { userId } = req.auth();
    const {
      type,
      amount,
      accountId,
      category,
      date,
      description,
      isRecurring,
      recurringInterval,
    } = req.body;
    
    // ── validation ──
    if (!type || !amount || !accountId || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "type, amount, accountId, category and date are required",
      });
    }

    // ── find user ──
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ── verify account belongs to user ──
    const account = await Account.findOne({ _id: accountId, clerkUserId: userId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // ── calculate new balance ──
    // INCOME  → add to balance
    // EXPENSE → subtract from balance
    const balanceChange = type === "INCOME" ? amount : -amount;

    // ── create transaction + update balance atomically ──
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // create the transaction
      const [transaction] = await Transaction.create(
        [
          {
            type,
            amount,
            accountId,
            category,
            date:              new Date(date),
            description:       description || "",
            isRecurring:       isRecurring || false,
            recurringInterval: isRecurring ? recurringInterval : null,
            clerkUserId:       userId,
            status:            "COMPLETED",
          },
        ],
        { session }
      );

      // update account balance
      await Account.findByIdAndUpdate(
        accountId,
        { $inc: { balance: balanceChange } },
        { session }
      );

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data:    transaction,
      });

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id }     = req.params;  // transaction id from URL
    const { type, amount, category, date, description } = req.body;
 
    // ── find the existing transaction ──
    const existing = await Transaction.findOne({ _id: id, clerkUserId: userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
 
    // ── find the account ──
    const account = await Account.findById(existing.accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
 
    // ── reverse the old transaction's effect on balance ──
    // if old was INCOME → subtract it back
    // if old was EXPENSE → add it back
    const oldBalanceEffect = existing.type === "INCOME"
      ? -existing.amount   // reverse income
      :  existing.amount;  // reverse expense
 
    // ── apply the new transaction's effect on balance ──
    const newBalanceEffect = type === "INCOME"
      ?  amount   // add income
      : -amount;  // subtract expense
 
    const totalBalanceChange = oldBalanceEffect + newBalanceEffect;
 
    // ── update transaction ──
    const updated = await Transaction.findByIdAndUpdate(
      id,
      {
        type,
        amount,
        category,
        date:        new Date(date),
        description: description || "",
      },
      { returnDocument: "after" }  // return updated doc
    );
 
    // ── update account balance ──
    await Account.findByIdAndUpdate(
      existing.accountId,
      { $inc: { balance: totalBalanceChange } }
    );
 
    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data:    updated,
    });
 
  } catch (error) {
    console.error("Update transaction error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAccountTransactions = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id }     = req.params;  // accountId from URL

    // find user
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // fetch transactions for this account belonging to this user
    const transactions = await Transaction.find({
      accountId:   id,
      clerkUserId: userId,  // security check
    }).sort({ date: -1 }); // newest first

    res.status(200).json({
      success: true,
      data:    transactions,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkDeleteTransactions = async (req, res) => {
  try {
    const { userId } = req.auth(); // this is the clerkUserId string
    const { ids }    = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No transaction IDs provided" });
    }

    // find the user in DB
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ fix 1 — use userId (the clerk string) not user._id (ObjectId)
    const transactions = await Transaction.find({
      _id:         { $in: ids },
      clerkUserId: userId,   // ← userId is the raw clerk string from req.auth()
    });


    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: "No matching transactions found" });
    }

    // calculate balance changes per account
    const accountBalanceChanges = transactions.reduce((acc, tx) => {
      const change = tx.type === "EXPENSE" ? tx.amount : -tx.amount;
      acc[tx.accountId] = (acc[tx.accountId] || 0) + change;
      return acc;
    }, {});

    // ✅ fix 2 — use clerkUserId not userId when deleting
    await Transaction.deleteMany({
      _id:         { $in: ids },
      clerkUserId: userId,   // ← same fix here
    });

    // update account balances
    for (const [accountId, balanceChange] of Object.entries(accountBalanceChanges)) {
      await Account.findByIdAndUpdate(accountId, {
        $inc: { balance: balanceChange },
      });
    }

    res.status(200).json({
      success: true,
      message: `${transactions.length} transaction(s) deleted`,
    });

  } catch (error) {
    console.error("Bulk delete error:", error.message); // debug
    res.status(500).json({ success: false, message: error.message });
  }
};

