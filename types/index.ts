// ─── Transaction Types ───────────────────────────────────────────────────────

export type TransactionType =
  | "expense"
  | "income"
  | "money_given"
  | "money_received"
  | "transfer";

export type PaymentMethod =
  | "cash"
  | "upi"
  | "debit_card"
  | "credit_card"
  | "bank_transfer"
  | "other";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  paymentMethod: PaymentMethod;
  person?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  recurringId?: string; // link to RecurringTransaction
  loanId?: string; // link to LoanRecord
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// ─── Category Types ───────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parentId?: string; // for sub-categories
  icon?: string;
  color?: string;
  isDefault: boolean;
  type: "expense" | "income" | "both";
  keywords?: string[]; // for smart categorization
}

// ─── Budget Types ─────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  name: string;
  amount: number;
  categoryId?: string; // null = overall monthly budget
  period: "monthly" | "weekly" | "yearly";
  startDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Recurring Transaction Types ─────────────────────────────────────────────

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  person?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  frequency: RecurringFrequency;
  startDate: string; // ISO date
  endDate?: string; // optional end
  lastGeneratedDate?: string; // tracks last auto-generated
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Loan / People Types ──────────────────────────────────────────────────────

export type LoanStatus = "pending" | "partially_paid" | "paid";
export type LoanDirection = "given" | "received";

export interface LoanRecord {
  id: string;
  personName: string;
  direction: LoanDirection; // given = I gave money; received = I borrowed
  principalAmount: number;
  paidAmount: number;
  date: string;
  dueDate?: string;
  notes?: string;
  status: LoanStatus;
  relatedTransactionIds: string[]; // transactions that are part of this loan
  createdAt: string;
  updatedAt: string;
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings {
  currency: string; // "INR"
  currencySymbol: string; // "₹"
  theme: ThemeMode;
  defaultPaymentMethod: PaymentMethod;
  defaultCategoryId?: string;
  monthlyBudget?: number;
  dataStoredLocally: boolean;
  version: string;
}

// ─── Backup Types ─────────────────────────────────────────────────────────────

export interface BackupData {
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  loanRecords: LoanRecord[];
  settings: AppSettings;
}

// ─── Calculation Result Types ─────────────────────────────────────────────────

export interface SummaryTotals {
  totalIncome: number;
  totalExpenses: number;
  totalMoneyGiven: number;
  totalMoneyReceived: number;
  netBalance: number;
  transactionCount: number;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface DailyTotal {
  date: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface MonthlyTotal {
  year: number;
  month: number;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  averageDailySpending: number;
  highestSpendingDay?: string;
  highestSpendingCategory?: string;
}

export interface PaymentMethodTotal {
  method: PaymentMethod;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface BudgetUsage {
  budgetId: string;
  budgetName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean; // > 80%
}

export interface LoanBalance {
  personName: string;
  totalGiven: number;
  totalReceived: number;
  pendingAmount: number; // positive = they owe me; negative = I owe them
  loanIds: string[];
}

// ─── Quick Add Parse Result ───────────────────────────────────────────────────

export interface QuickAddResult {
  description: string;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  person?: string;
  confidence: "high" | "medium" | "low";
  needsConfirmation: boolean;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type DateRangeFilter =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export interface TransactionFilters {
  search?: string;
  dateRange?: DateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  type?: TransactionType | "all";
  categoryId?: string;
  paymentMethod?: PaymentMethod | "all";
  minAmount?: number;
  maxAmount?: number;
}
