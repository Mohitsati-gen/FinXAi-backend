// seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Account from "./src/models/account.model.js";
import Transaction from "./src/models/transaction.model.js";
import { DB_NAME } from "./src/constants.js";

dotenv.config();

const seedTransactions = async () => {
  try {
    // ── fix 1: add your DB name at the end of the URI ──
    const uri    = process.env.MONGODB_URI;
const dbName = DB_NAME;
    console.log("Connecting to:", uri);
await mongoose.connect(`${uri}/${dbName}`);
    console.log("Connected to MongoDB ✅");

    // ── fix 2: store result in lowercase "account" variable ──
    const account = await Account.findOne(); // ← lowercase, this is the document
    console.log("Account found:", account);

    if (!account) {
      console.log("❌ No account found — make sure DB name is correct in MONGODB_URI");
      process.exit(1);
    }

    console.log(`Linking to: ${account.name} (${account._id})`);

    const dummy = [
      {
        type:        "INCOME",
        amount:      7900,
        description: "Received salary",
        category:    "Salary",
        date:        new Date("2026-04-1"),
        isRecurring: false,
        clerkUserId: account.clerkUserId,  // ← lowercase account
        accountId:   account._id,          // ← lowercase account
        status:      "COMPLETED",
      },
      {
        type:        "INCOME",
        amount:      2647,
        description: "Received freelance",
        category:    "Freelance",
        date:        new Date("2026-04-1"),
        isRecurring: false,
        clerkUserId: account.clerkUserId,
        accountId:   account._id,
        status:      "COMPLETED",
      },
      {
        type:        "EXPENSE",
        amount:      1881,
        description: "Paid for travel",
        category:    "Travel",
        date:        new Date("2026-04-1"),
        isRecurring: false,
        clerkUserId: account.clerkUserId,
        accountId:   account._id,
        status:      "COMPLETED",
      },
      {
        type:        "EXPENSE",
        amount:      160,
        description: "Paid for entertainment",
        category:    "Entertainment",
        date:        new Date("2026-04-1"),
        isRecurring: false,
        clerkUserId: account.clerkUserId,
        accountId:   account._id,
        status:      "COMPLETED",
      },
      {
        type:              "EXPENSE",
        amount:            1500,
        description:       "Flat Rent",
        category:          "Rental",
        date:              new Date("2026-04-3"),
        isRecurring:       true,
        recurringInterval: "MONTHLY",
        clerkUserId:       account.clerkUserId,
        accountId:         account._id,
        status:            "COMPLETED",
      },
      {
        type:        "INCOME",
        amount:      947,
        description: "Received investments",
        category:    "Investments",
        date:        new Date("2026-04-2"),
        isRecurring: false,
        clerkUserId: account.clerkUserId,
        accountId:   account._id,
        status:      "COMPLETED",
      },
    ];

    const inserted = await Transaction.insertMany(dummy);
    console.log(`✅ Inserted ${inserted.length} transactions`);
    inserted.forEach(t => {
      console.log(`  ${t.type.padEnd(8)} | ${t.description.padEnd(25)} | _id: ${t._id}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
};

seedTransactions();