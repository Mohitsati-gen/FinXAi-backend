import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    lastAlertSent: {
      type: Date,
      default: null,
    },

    clerkUserId: {
      type: String,
      required: true,
      unique: true,    // @@unique because one budget per user
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Budget ||
  mongoose.model("Budget", budgetSchema);