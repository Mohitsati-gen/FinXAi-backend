
// ── check if a recurring transaction is due ──
export function isTransactionDue(transaction) {
  if (!transaction.isRecurring) return false;

  const today = new Date();

  // never processed before → due now
  if (!transaction.lastProcessed) return true;

  // has a nextRecurringDate → check if it's today or past
  if (transaction.nextRecurringDate) {
    return new Date(transaction.nextRecurringDate) <= today;
  }

  return false;
}

// ── calculate next recurring date based on interval ──
export function calculateNextRecurringDate(fromDate, interval) {
  const date = new Date(fromDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      break;
  }

  return date;
}