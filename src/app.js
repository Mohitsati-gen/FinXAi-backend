import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import webhookRoutes from "./routes/webhook.routes.js";
import userRoutes from "./routes/user.routes.js";
import { initClerk, verifyAuth } from "./middlewares/auth.middleware.js";
import accountRoutes from "./routes/account.routes.js"
import transactionRoutes from "./routes/transaction.routes.js"
import budgetRoutes from "./routes/budget.routes.js";
import { serve } from "inngest/express";        // ✅ express adapter
import { inngest } from "./inngest/client.js";
import { processRecurringTransaction , triggerRecurringTransactions , checkBudgetAlerts ,generateMonthlyReports  } from "./inngest/functions.js";
const app = express()


// ✅ handle OPTIONS before EVERYTHING including cors and clerk
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// ✅ 1. CORS absolutely first
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// app.set("trust proxy", true); // ✅ add this near the top of app.js
// ✅ 3. Clerk after CORS

// ✅ 4. webhook needs raw body — before express.json()
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// ✅ 5. normal parsers
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [processRecurringTransaction,triggerRecurringTransactions,checkBudgetAlerts,generateMonthlyReports],
    isDev: true,
  })
);


app.use(initClerk);


// ✅ 6. routes
app.use("/api/user",     verifyAuth, userRoutes);
app.use("/api/accounts", verifyAuth, accountRoutes);
app.use("/api/transactions", verifyAuth,transactionRoutes);
app.use("/api/budget", budgetRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FinX AI backend is running 🚀",
  });
});

export { app }