# FinXAI — Backend API

> Intelligent personal finance backend powering AI-driven insights, automated reporting, and real-time budget alerts.

🌐 **Frontend Live**: [fin-x-ai-frontend-1.vercel.app](https://fin-x-ai-frontend-1.vercel.app)

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Database | MongoDB + Mongoose |
| Authentication | Clerk (JWT verification) |
| Event-Driven Jobs | Inngest |
| Rate Limiting | Arcjet |
| Email | Resend |
| AI | Google Gemini AI |

---

## ✨ Features

- 🔐 **Clerk Auth Middleware** — Every route protected with JWT verification
- 🏦 **Account Management** — Create, update, delete financial accounts with default account support
- 💸 **Transaction Tracking** — Full CRUD with category tagging, income/expense classification
- 🔁 **Recurring Transactions** — Automated processing via Inngest cron jobs (daily, weekly, monthly, yearly)
- 📊 **Budget Alerts** — Real-time threshold monitoring with email notifications via Resend
- 📈 **Monthly Financial Reports** — AI-generated insights using Google Gemini, auto-sent every month
- 🧾 **AI Receipt Scanner** — Gemini Vision extracts transaction data from receipt images
- 🛡️ **Rate Limiting** — Arcjet protects all sensitive endpoints from abuse
- 🪝 **Clerk Webhooks** — Auto user creation/deletion synced with MongoDB

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   │   ├── account.controller.js
│   │   ├── budget.controller.js
│   │   ├── inngest.controller.js
│   │   ├── transaction.controller.js
│   │   └── user.controller.js
│   ├── db/
│   │   └── index.js
│   ├── inngest/
│   │   ├── client.js
│   │   └── functions.js
│   ├── lib/
│   │   ├── gemini.js
│   │   ├── recurringUtils.js
│   │   └── resend.js
│   ├── middlewares/
│   │   ├── arcjet.middleware.js
│   │   └── auth.middleware.js
│   ├── models/
│   ├── routes/
│   │   ├── account.routes.js
│   │   ├── budget.routes.js
│   │   ├── transaction.routes.js
│   │   ├── user.routes.js
│   │   └── webhook.routes.js
├── .env
├── .gitignore
├── app.js
├── constants.js
├── index.js
├── seed.js
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string

# Clerk
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Inngest
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=signkey_xxx

# Arcjet
ARCJET_KEY=xxx

# Resend
RESEND_API_KEY=re_xxx

# Gemini AI
GEMINI_API_KEY=xxx

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app
```

---

## 🛠️ Local Setup

```bash
# Clone repo
git clone https://github.com/yourusername/finxai-backend.git
cd finxai-backend

# Install dependencies
npm install

# Add environment variables
cp .env.example .env

# Run development server
npm run dev
```

---

## 🔄 Inngest Functions

| Function | Trigger | Description |
|---|---|---|
| `triggerRecurringTransactions` | Cron — daily | Finds all due recurring transactions |
| `processRecurringTransaction` | Event-driven | Processes each individual recurring transaction |
| `checkBudgetAlerts` | Event-driven | Checks budget thresholds, sends email alert |
| `generateMonthlyReports` | Cron — monthly | Generates AI report, emails to user |

---

## 📡 API Endpoints

### Accounts
```
GET    /api/accounts              — Get all user accounts
POST   /api/accounts              — Create new account
PATCH  /api/accounts/:id/default  — Set default account
DELETE /api/accounts/:id          — Delete account
```

### Transactions
```
GET    /api/transactions               — Get transactions (with filters)
POST   /api/transactions               — Create transaction
PUT    /api/transactions/:id           — Update transaction
DELETE /api/transactions/:id           — Delete transaction
POST   /api/transactions/scan-receipt  — AI receipt scanner
```

### Budgets
```
GET    /api/budget   — Get current budget
POST   /api/budget   — Create/update budget
```

### Webhooks
```
POST   /api/webhook/clerk   — Clerk user sync
POST   /api/inngest         — Inngest event handler
```

---

## 🚢 Deployment

Deployed on **Render** (free tier).

> ⚠️ Free tier spins down after inactivity — first request may take ~50s to wake up.

---

## 🔗 Related

- 🎨 [FinXAI Frontend](https://github.com/Mohitsati-gen/FinXAi-frontend) — React + Vite + Tailwind

---

## 📄 License

MIT
