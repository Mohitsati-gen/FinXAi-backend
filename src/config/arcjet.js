// src/config/arcjet.js
import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    // ── protect against common attacks ──
    shield({ mode: "LIVE" }),

    // ── block bots ──
    detectBot({
      mode: "LIVE",
      allow: [], // block all bots
    }),

    // ── rate limit — token bucket ──
    tokenBucket({
      mode:             "LIVE",
      refillRate:       10,   // refill 10 tokens every interval
      interval:         "1m", // every 1 minute
      capacity:         20,   // max 20 tokens at once
    }),
  ],
});

export default aj;