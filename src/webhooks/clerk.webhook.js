import { Webhook } from "svix";
import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js";
import Budget from "../models/budget.model.js";

export const clerkWebhook = async (req, res) => {
  try {
    // ── 1. Verify the request actually came from Clerk ──
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ message: "Webhook secret not set" });
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    let event;

    try {
      event = wh.verify(req.body, {
        "svix-id":        req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"],
      });
          console.log("Webhook hit:", event.type); // check terminal when user signs up

    } catch (err) {
      // signature mismatch — not from Clerk
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const data = event.data;

    // ── 2. Handle each event type ──

    if (event.type === "user.created") {
  const firstName = data.first_name || "";
  const lastName  = data.last_name  || "";
  const email     = data.email_addresses[0]?.email_address || "";

  // upsert instead of create — safe if replayed multiple times
  await User.findOneAndUpdate(
    { clerkUserId: data.id },
    {
      clerkUserId: data.id,
      email,
      name:     `${firstName} ${lastName}`.trim() || email.split("@")[0],
      imageUrl: data.image_url || "",
    },
    { upsert: true, new: true }
  );

  console.log(`✅ User created in DB: ${data.id}`);
}

    if (event.type === "user.updated") {
      const firstName = data.first_name || "";
      const lastName  = data.last_name  || "";
      const email     = data.email_addresses[0]?.email_address || "";

      await User.findOneAndUpdate(
        { clerkUserId: data.id },
        {
          email,
          name:     `${firstName} ${lastName}`.trim() || email.split("@")[0],
          imageUrl: data.image_url || "",
        },
        { new: true }
      );

      console.log(`✅ User updated in DB: ${data.id}`);
    }

    if (event.type === "user.deleted") {
      const clerkUserId = data.id;

      // delete in order — children before parent
      await Transaction.deleteMany({ clerkUserId });
      await Account.deleteMany({ clerkUserId });
      await Budget.deleteMany({ clerkUserId });
      await User.findOneAndDelete({ clerkUserId });

      console.log(`✅ User and all data deleted from DB: ${clerkUserId}`);
    }

    // always return 200 to Clerk so it knows webhook was received
    return res.status(200).json({ message: "Webhook received" });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ message: error.message });
  }
};