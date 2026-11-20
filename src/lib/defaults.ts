export const DEFAULT_WALLETS = [
  { name: "Primary Bank", type: "BANK" as const, initialBalance: 0 },
  { name: "E-Wallet", type: "EWALLET" as const, initialBalance: 0 },
  { name: "Cash", type: "CASH" as const, initialBalance: 0 },
];

export const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", type: "EXPENSE" as const, icon: "utensils" },
  { name: "Transport", type: "EXPENSE" as const, icon: "car" },
  { name: "Bills & Utilities", type: "EXPENSE" as const, icon: "receipt" },
  { name: "Groceries", type: "EXPENSE" as const, icon: "bag" },
  { name: "Health", type: "EXPENSE" as const, icon: "heart" },
  { name: "Subscriptions", type: "EXPENSE" as const, icon: "repeat" },
  { name: "Housing", type: "EXPENSE" as const, icon: "home" },
  { name: "Other Expense", type: "EXPENSE" as const, icon: "tag" },
  { name: "Salary", type: "INCOME" as const, icon: "briefcase" },
  { name: "Freelance", type: "INCOME" as const, icon: "wallet" },
  { name: "Investment", type: "INCOME" as const, icon: "trending" },
  { name: "Gift & Bonus", type: "INCOME" as const, icon: "gift" },
];
