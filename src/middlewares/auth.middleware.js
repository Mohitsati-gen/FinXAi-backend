import { clerkMiddleware, requireAuth } from "@clerk/express";

export const initClerk = clerkMiddleware({
  acceptsToken: true, // ← accept Bearer tokens
});

export const verifyAuth = requireAuth({
  signInUrl: null,
});