import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ["CURRENT", "SAVINGS", "CREDIT", "INVESTMENT", "OTHER"] },
    balance: { type: Number, required: true, default: 0 },
    isDefault: { type: Boolean, default: false },
    clerkUserId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Account || mongoose.model("Account", accountSchema);