import aj from "../config/arcjet.js";

export const arcjetMiddleware = async (req, res, next) => {
  try {

    // Use logged-in user ID
    // otherwise fallback to IP
    const fingerprint =
      req.auth?.()?.userId ||
      req.headers["x-forwarded-for"] ||
      req.ip;

    const decision = await aj.protect(req, {
      requested: 1,
      fingerprint,
    });

    // Request blocked
    if (decision.isDenied()) {

      // Rate limit exceeded
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down.",
        });
      }

      // Bot detected
      if (decision.reason.isBot()) {
        return res.status(403).json({
          success: false,
          message: "Bot traffic not allowed.",
        });
      }

      // Shield blocked request
      return res.status(403).json({
        success: false,
        message: "Request blocked.",
      });
    }

    // Allowed request
    next();

  } catch (error) {

    console.error("Arcjet error:", error.message);

    // Fail open
    next();
  }
};