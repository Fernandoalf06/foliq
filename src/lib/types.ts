export type WalletType = "CASH" | "BANK" | "EWALLET" | "CREDIT" | "SAVINGS";
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";
export type CategoryType = "EXPENSE" | "INCOME";
export type RecurringCadence = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  currency: string;
}

export interface WalletItem {
  id: string;
  name: string;
  type: WalletType;
  currency: string;
  initialBalance: number;
  balance: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
}

export interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  note: string;
  occurredAt: string;
  wallet: { id: string; name: string; type: WalletType };
  targetWallet: { id: string; name: string; type: WalletType } | null;
  category: { id: string; name: string; icon: string; type: CategoryType } | null;
}

export interface BudgetItem {
  id: string;
  month: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "safe" | "warning" | "exceeded";
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  icon: string;
  total: number;
}

export interface DailySeriesPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
}

export interface RecurringRuleItem {
  id: string;
  title: string;
  type: CategoryType;
  amount: number;
  cadence: RecurringCadence;
  nextDueDate: string;
  dueStatus: "due" | "upcoming" | "scheduled";
  isActive: boolean;
  note: string;
  wallet: { id: string; name: string; type: WalletType };
  category: { id: string; name: string; icon: string; type: CategoryType };
}

export interface ApiTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface DashboardPayload {
  user: UserProfile;
  month: string;
  netWorth: number;
  cashflow: {
    income: number;
    expense: number;
    net: number;
    savingsRate: number;
  };
  wallets: WalletItem[];
  archivedWallets: WalletItem[];
  categories: CategoryItem[];
  transactions: TransactionItem[];
  budgets: BudgetItem[];
  recurringRules: RecurringRuleItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  dailySeries: DailySeriesPoint[];
}
