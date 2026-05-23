import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["INCOME", "EXPENSE"],
        },

        amount: {
            type: Number,
            required: true,
        },

        description: {
            type: String,
            default: "",
        },

        date: {
            type: Date,
            required: true,
        },

        category: {
            type: String,
            required: true,
        },

        receiptUrl: {
            type: String,
            default: null,
        },

        // ── Recurring fields ──
        isRecurring: {
            type: Boolean,
            default: false,
        },

        recurringInterval: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", null],
            default: null,
        },

        nextRecurringDate: {
            type: Date,
            default: null,
        },

        lastProcessed: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ["COMPLETED", "PENDING", "FAILED"],
            default: "COMPLETED",
        },

        // ── Relations ──
        clerkUserId: {
            type: String,
            required: true,
            index: true,           // @@index([userId]) in Prisma
        },

        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,           // @@index([accountId]) in Prisma
        },
    },
    { timestamps: true }
);

export default mongoose.models.Transaction ||
    mongoose.model("Transaction", transactionSchema);