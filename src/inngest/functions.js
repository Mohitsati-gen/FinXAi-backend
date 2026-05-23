import { inngest } from "./client.js";
import Budget from "../models/budget.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import { sendEmail } from "../lib/resend.js";
import { isTransactionDue, calculateNextRecurringDate } from "../lib/recurringUtils.js";
import { Resend } from "resend";
import { GoogleGenerativeAI }    from "@google/generative-ai";

const resend = new Resend(process.env.RESEND_API_KEY);


function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    triggers: [{ cron: "0 */6 * * *" }], // every 6 hours
  },
  async ({ step }) => {

    // Step 1 — fetch all budgets
    const budgets = await step.run("fetch-budgets", async () => {
      return await Budget.find({});
    });

    // Step 2 — check each budget
    for (const budget of budgets) {

      await step.run(`check-budget-${budget._id}`, async () => {

        // get the user
        const user = await User.findOne({ clerkUserId: budget.clerkUserId });
        if (!user) return;

        // get default account
        const defaultAccount = await Account.findOne({
          clerkUserId: budget.clerkUserId,
          isDefault: true,
        });
        if (!defaultAccount) return;

        // calculate total expenses for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const expenses = await Transaction.aggregate([
          {
            $match: {
              clerkUserId: budget.clerkUserId,
              accountId:   defaultAccount._id,
              type:        "EXPENSE",
              date:        { $gte: startOfMonth },
            },
          },
          {
            $group: {
              _id:   null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        const totalExpenses = expenses[0]?.total || 0;
        const percentageUsed = (totalExpenses / budget.amount) * 100;

      
        // send alert if >= 80% and not already sent this month
        const shouldAlert =
          percentageUsed >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()));

            

       if (shouldAlert) {
  await sendEmail({
    to: user.email,
    subject: `Budget Alert for ${defaultAccount.name}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Budget Alert</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align:center;">
                      <p style="margin:0; font-size:13px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#fef3c7;">
                        FinX AI
                      </p>
                      <h1 style="margin: 8px 0 0; font-size:26px; font-weight:700; color:#ffffff;">
                        Budget Alert
                      </h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 32px;">

                      <p style="margin: 0 0 6px; font-size:15px; color:#374151;">
                        Hi <strong>${user.name}</strong>,
                      </p>
                      <p style="margin: 0 0 24px; font-size:15px; color:#6b7280; line-height:1.6;">
                        You've used <strong style="color:#d97706;">${percentageUsed.toFixed(1)}%</strong> of your monthly budget for
                        <strong style="color:#111827;">${defaultAccount.name}</strong>.
                        Here's a quick summary:
                      </p>

                      <!-- Progress Bar -->
                      <div style="background:#f3f4f6; border-radius:999px; height:10px; margin-bottom:28px; overflow:hidden;">
                        <div style="background:${percentageUsed >= 100 ? '#ef4444' : percentageUsed >= 80 ? '#f59e0b' : '#10b981'}; width:${Math.min(percentageUsed, 100).toFixed(1)}%; height:100%; border-radius:999px;"></div>
                      </div>

                      <!-- Stats Cards -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                        <tr>

                          <!-- Budget Amount -->
                          <td width="32%" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:16px; text-align:center;">
                            <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#9ca3af;">Budget</p>
                            <p style="margin:0; font-size:20px; font-weight:700; color:#111827;">₹${parseFloat(budget.amount).toLocaleString("en-IN")}</p>
                          </td>

                          <td width="4%"></td>

                          <!-- Spent -->
                          <td width="32%" style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:16px; text-align:center;">
                            <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#d97706;">Spent</p>
                            <p style="margin:0; font-size:20px; font-weight:700; color:#d97706;">₹${parseFloat(totalExpenses).toLocaleString("en-IN")}</p>
                          </td>

                          <td width="4%"></td>

                          <!-- Remaining -->
                          <td width="32%" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; text-align:center;">
                            <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#16a34a;">Left</p>
                            <p style="margin:0; font-size:20px; font-weight:700; color:#16a34a;">₹${Math.max(0, budget.amount - totalExpenses).toLocaleString("en-IN")}</p>
                          </td>

                        </tr>
                      </table>

                      <!-- Warning Box -->
                      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:16px; margin-bottom:28px; display:flex; align-items:flex-start; gap:10px;">
                        <span style="font-size:18px;">⚠️</span>
                        <p style="margin:0; font-size:14px; color:#92400e; line-height:1.6;">
                          ${percentageUsed >= 100
                            ? "You have <strong>exceeded</strong> your monthly budget. Consider reviewing your expenses."
                            : `You're <strong>close to your limit</strong>. Only ₹${Math.max(0, budget.amount - totalExpenses).toLocaleString("en-IN")} remaining for this month.`
                          }
                        </p>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard"
                          style="display:inline-block; background:#f59e0b; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 32px; border-radius:8px;">
                          View Dashboard →
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9fafb; border-top:1px solid #f3f4f6; padding:20px 32px; text-align:center;">
                      <p style="margin:0; font-size:12px; color:#9ca3af;">
                        This alert was sent by <strong style="color:#f59e0b;">FinX AI</strong> because your spending reached ${percentageUsed.toFixed(0)}% of your budget.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
      </html>
    `,
  });

          // update lastAlertSent
          await Budget.findByIdAndUpdate(budget._id, {
            lastAlertSent: new Date(),
          });
        }
      });
    }
  }
);


// 1. Process a single recurring transaction
export const processRecurringTransaction = inngest.createFunction(
  {
    id:   "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit:  10,
      period: "1m",
      key:    "event.data.userId",
    },
    triggers: [{ event: "transaction.recurring.process" }], // ← moved inside
  },
  async ({ event, step }) => {

    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await Transaction.findOne({
        _id:         event.data.transactionId,
        clerkUserId: event.data.userId,
        isRecurring: true,
        status:      "COMPLETED",
      });

      if (!transaction || !isTransactionDue(transaction)) {
        console.log("Transaction not due or not found:", event.data.transactionId);
        return;
      }

      const balanceChange = transaction.type === "EXPENSE"
        ? -transaction.amount
        :  transaction.amount;

      await Transaction.create({
        type:        transaction.type,
        amount:      transaction.amount,
        description: `${transaction.description} (Recurring)`,
        date:        new Date(),
        category:    transaction.category,
        clerkUserId: transaction.clerkUserId,
        accountId:   transaction.accountId,
        isRecurring: false,
        status:      "COMPLETED",
      });

      await Account.findByIdAndUpdate(
        transaction.accountId,
        { $inc: { balance: balanceChange } }
      );

      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          lastProcessed:     new Date(),
          nextRecurringDate: calculateNextRecurringDate(
            new Date(),
            transaction.recurringInterval
          ),
        }
      );

      console.log(`✅ Processed recurring: ${transaction._id}`);
    });
  }
);


// 2. Trigger all due recurring transactions
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id:       "trigger-recurring-transactions",
    name:     "Trigger Recurring Transactions",
    triggers: [{ cron: "0 0 * * *" }], // ← moved inside
  },
  async ({ step }) => {

    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await Transaction.find({
          isRecurring: true,
          status:      "COMPLETED",
          $or: [
            { lastProcessed:     null                    },
            { nextRecurringDate: { $lte: new Date() } },
          ],
        }).lean();
      }
    );

    console.log(`Found ${recurringTransactions.length} due recurring transactions`);

    if (recurringTransactions.length === 0) {
      return { triggered: 0 };
    }

    const events = recurringTransactions.map(tx => ({
      name: "transaction.recurring.process",
      data: {
        transactionId: tx._id.toString(),
        userId:        tx.clerkUserId,
      },
    }));

    await inngest.send(events);

    return { triggered: recurringTransactions.length };
  }
);



// ── get last month's stats for a user ──
async function getMonthlyStats(clerkUserId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end   = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    clerkUserId,
    status: "COMPLETED",
    date:   { $gte: start, $lte: end },
  }).lean();

  const totalIncome   = transactions.filter(t => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const byCategory = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, amount]) => ({ category, amount }));

  return {
    totalIncome,
    totalExpenses,
    netIncome:        totalIncome - totalExpenses,
    byCategory,
    topCategories,
    transactionCount: transactions.length,
    savingsRate:      totalIncome > 0
      ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)
      : "0.0",
  };
}

// ── generate AI insights using Gemini ──
async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational. Use Indian Rupee (₹) for amounts.

    Financial Data for ${month}:
    - Total Income:    ₹${stats.totalIncome.toFixed(2)}
    - Total Expenses:  ₹${stats.totalExpenses.toFixed(2)}
    - Net Income:      ₹${stats.netIncome.toFixed(2)}
    - Savings Rate:    ${stats.savingsRate}%
    - Transactions:    ${stats.transactionCount}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`).join(", ")}

    Format as a JSON array of exactly 3 strings. No markdown, no extra text.
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    const result      = await model.generateContent(prompt);
    const text        = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("Gemini insights error:", err);
    return [
      `Your top spending was in ${stats.topCategories[0]?.category || "general expenses"} this month.`,
      "Consider setting a monthly budget to better track your spending.",
      "Review your recurring transactions — they add up quickly over time.",
    ];
  }
}

// ── generate classy HTML email ──
function generateReportHTML({ userName, month, stats, insights }) {
  const isPositive  = stats.netIncome >= 0;
  const savingsGood = parseFloat(stats.savingsRate) >= 20;
  const netColor    = isPositive ? "#16a34a" : "#dc2626";
  const netLabel    = isPositive ? "Surplus"  : "Deficit";

  const fmt = (n) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const categoryRows = stats.topCategories.map(({ category, amount }) => {
    const pct = stats.totalExpenses > 0
      ? Math.round((amount / stats.totalExpenses) * 100)
      : 0;
    return `
      <tr>
        <td style="padding:12px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${category}</td>
        <td style="padding:12px 0;text-align:right;font-size:13px;font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;padding-right:16px;">₹${fmt(amount)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;width:130px;">
          <div style="background:#f3f4f6;border-radius:99px;height:6px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#d97706,#f59e0b);height:6px;width:${pct}%;border-radius:99px;"></div>
          </div>
          <span style="font-size:10px;color:#9ca3af;">${pct}%</span>
        </td>
      </tr>`;
  }).join("");

  const insightCards = insights.map((text, i) => `
    <tr>
      <td style="padding-bottom:14px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:36px;vertical-align:top;padding-top:2px;">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#b45309,#d97706);color:#fff;font-size:12px;font-weight:800;text-align:center;line-height:28px;">${i + 1}</div>
            </td>
            <td style="font-size:13.5px;color:#374151;line-height:1.65;padding-left:4px;">${text}</td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Monthly Report – ${month}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- BRAND -->
  <tr><td align="center" style="padding-bottom:32px;">
    <div style="font-size:24px;font-weight:900;letter-spacing:-1px;color:#0f0a02;">
      FinX<span style="color:#d97706;">AI</span>
    </div>
    <p style="margin:5px 0 0;font-size:10.5px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.16em;">Monthly Financial Report</p>
  </td></tr>

  <!-- DARK HERO -->
  <tr><td style="background:linear-gradient(145deg,#111111,#1e1e1e);border-radius:20px 20px 0 0;padding:40px 40px 32px;overflow:hidden;position:relative;">
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.16em;">Report · ${month}</p>
    <h1 style="margin:0 0 6px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
      Hello, ${userName} 👋
    </h1>
    <p style="margin:0 0 32px;font-size:14px;color:rgba(255,255,255,0.45);">
      Here's your complete financial summary for last month.
    </p>

    <!-- STAT PILLS -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;padding-bottom:12px;">
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:16px 22px;">
            <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;">Income</p>
            <p style="margin:0;font-size:20px;font-weight:800;color:#4ade80;">₹${fmt(stats.totalIncome)}</p>
          </div>
        </td>
        <td style="padding-right:12px;padding-bottom:12px;">
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:16px 22px;">
            <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;">Expenses</p>
            <p style="margin:0;font-size:20px;font-weight:800;color:#f87171;">₹${fmt(stats.totalExpenses)}</p>
          </div>
        </td>
        <td style="padding-bottom:12px;">
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:16px 22px;">
            <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;">${netLabel}</p>
            <p style="margin:0;font-size:20px;font-weight:800;color:${isPositive ? "#4ade80" : "#f87171"};">
              ${isPositive ? "+" : "-"}₹${fmt(Math.abs(stats.netIncome))}
            </p>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- SAVINGS BAR -->
  <tr><td style="background:#fff;padding:22px 40px;border-left:1px solid #f0ece6;border-right:1px solid #f0ece6;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><p style="margin:0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Savings Rate</p></td>
        <td align="right">
          <span style="font-size:13px;font-weight:800;color:${savingsGood ? "#16a34a" : "#d97706"};">
            ${stats.savingsRate}%
          </span>
        </td>
      </tr>
    </table>
    <div style="background:#f3f4f6;border-radius:99px;height:8px;margin:10px 0 8px;overflow:hidden;">
      <div style="background:${savingsGood
        ? "linear-gradient(90deg,#16a34a,#4ade80)"
        : "linear-gradient(90deg,#d97706,#fbbf24)"
      };height:8px;width:${Math.min(Math.max(stats.savingsRate, 0), 100)}%;border-radius:99px;"></div>
    </div>
    <p style="margin:0;font-size:11.5px;color:#9ca3af;">
      ${savingsGood
        ? "✅ Excellent! You're saving more than 20% of your income."
        : "💡 Tip: Aim for 20%+ savings rate for long-term financial health."
      }
    </p>
  </td></tr>

  <!-- QUICK STATS ROW -->
  <tr><td style="background:#fafaf9;padding:20px 40px;border-left:1px solid #f0ece6;border-right:1px solid #f0ece6;border-top:1px solid #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background:#fff;border:1px solid #f0ece6;border-radius:14px;padding:14px 10px;">
          <p style="margin:0 0 3px;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Transactions</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">${stats.transactionCount}</p>
        </td>
        <td width="12"></td>
        <td align="center" style="background:#fff;border:1px solid #f0ece6;border-radius:14px;padding:14px 10px;">
          <p style="margin:0 0 3px;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Categories</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">${Object.keys(stats.byCategory).length}</p>
        </td>
        <td width="12"></td>
        <td align="center" style="background:#fff;border:1px solid #f0ece6;border-radius:14px;padding:14px 10px;">
          <p style="margin:0 0 3px;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Daily Avg</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">
            ₹${Math.round(stats.totalExpenses / 30).toLocaleString("en-IN")}
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- TOP CATEGORIES -->
  <tr><td style="background:#fff;padding:28px 40px;border-left:1px solid #f0ece6;border-right:1px solid #f0ece6;border-top:1px solid #f3f4f6;">
    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">
      Top Expense Categories
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${categoryRows}
    </table>
  </td></tr>

  <!-- AI INSIGHTS -->
  <tr><td style="background:linear-gradient(135deg,#fffbeb,#fefce8);border:1px solid #fde68a;padding:28px 40px;border-left:1px solid #fde68a;border-right:1px solid #fde68a;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="width:40px;vertical-align:middle;">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#b45309,#d97706);border-radius:12px;text-align:center;line-height:36px;font-size:18px;">✦</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <p style="margin:0;font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">AI Financial Insights</p>
          <p style="margin:2px 0 0;font-size:11px;color:#b45309;">Powered by Gemini AI</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${insightCards}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#fff;padding:28px 40px 36px;border-left:1px solid #f0ece6;border-right:1px solid #f0ece6;border-bottom:1px solid #f0ece6;border-radius:0 0 20px 20px;text-align:center;">
    <p style="margin:0 0 18px;font-size:13px;color:#6b7280;">
      Ready to take control of your finances?
    </p>
    <a href="${process.env.CORS_ORIGIN || "http://localhost:5173"}/dashboard"
      style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.03em;">
      View Full Dashboard →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td align="center" style="padding:28px 16px 0;">
    <p style="margin:0;font-size:11px;color:#c4c4c4;line-height:1.7;">
      You're receiving this because you have a FinX AI account.<br/>
      © ${new Date().getFullYear()} FinX AI · All rights reserved.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}


// THE INNGEST FUNCTION

export const generateMonthlyReports = inngest.createFunction(
  {
    id:       "generate-monthly-reports",
    name:     "Generate Monthly Reports",
    triggers: [{ cron: "0 0 1 * *" }],  // 1st of every month midnight
  },
  async ({ step }) => {

    // 1. fetch all users
    const users = await step.run("fetch-users", async () => {
      return await User.find({}).lean();
    });

    console.log(`Generating reports for ${users.length} users`);

    // 2. generate + send report for each user
    for (const user of users) {
      await step.run(`generate-report-${user._id}`, async () => {

        // last month
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const monthName = lastMonth.toLocaleString("default", { month: "long" });

        // get stats
        const stats = await getMonthlyStats(user.clerkUserId, lastMonth);

        // skip users with no transactions last month
        if (stats.transactionCount === 0) {
          console.log(`No transactions for ${user.email} — skipping`);
          return;
        }

        // get AI insights
        const insights = await generateFinancialInsights(stats, monthName);

        // generate HTML
        const html = generateReportHTML({
          userName: user.name,
          month:    monthName,
          stats,
          insights,
        });

        // send email via Resend
         await resend.emails.send({
          from:    "FinX AI <onboarding@resend.dev>",
          to:      "mohitsati583@gmail.com",
          subject: `Your ${monthName} Financial Report ✦ FinX AI`,
          html,
        });

        console.log(`✅ Report sent to ${user.email}`);
      });
    }

    return { processed: users.length };
  }
);