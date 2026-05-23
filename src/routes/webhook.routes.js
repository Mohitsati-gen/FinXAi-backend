import express from "express";
import { clerkWebhook } from "../webhooks/clerk.webhook.js";

const router = express.Router();

// POST /api/webhook/clerk
router.post("/clerk", clerkWebhook);

export default router;