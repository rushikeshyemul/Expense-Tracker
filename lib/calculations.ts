import type {
  Transaction,
  Category,
  Budget,
  LoanRecord,
  SummaryTotals,
  CategoryTotal,
  DailyTotal,
  MonthlyTotal,
  PaymentMethodTotal,
  BudgetUsage,
  LoanBalance,
  PaymentMethod,
  TransactionType,
} from "@/types";
import {
  getStartOfMonth,
  getStartOfLastMonth,
  getEndOfLastMonth,
  getCurrentDate,
} from "./utils";

// ─── Core Totals ──────────────────────────────────────────────────────────────

export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "income" || t.type === "money_received")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateTotalMoneyGiven(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "money_given")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateTotalMoneyReceived(
  transactions: Transaction[]
): number {
  return transactions
    .filter((t) => t.type === "money_received")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateNetBalance(transactions: Transaction[]): number {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = calculateTotalExpenses(transactions);
  return income - expenses;
}

export function calculateSummaryTotals(
  transactions: Transaction[]
): SummaryTotals {
  return {
    totalIncome: calculateTotalIncome(transactions),
    totalExpenses: calculateTotalExpenses(transactions),
    totalMoneyGiven: calculateTotalMoneyGiven(transactions),
    totalMoneyReceived: calculateTotalMoneyReceived(transactions),
    netBalance: calculateNetBalance(transactions),
    transactionCount: transactions.length,
  };
}

// ─── Date Filtering ───────────────────────────────────────────────────────────

export function filterByDate(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter(
    (t) => t.date >= startDate && t.date <= endDate
  );
}

export function filterToday(transactions: Transaction[]): Transaction[] {
  const today = getCurrentDate();
  return transactions.filter((t) => t.date === today);
}

export function filterThisMonth(transactions: Transaction[]): Transaction[] {
  const start = getStartOfMonth();
  const today = getCurrentDate();
  return filterByDate(transactions, start, today);
}

export function filterLastMonth(transactions: Transaction[]): Transaction[] {
  const start = getStartOfLastMonth();
  const end = getEndOfLastMonth();
  return filterByDate(transactions, start, end);
}

// ─── Category Totals ──────────────────────────────────────────────────────────

export function calculateCategoryTotals(
  transactions: Transaction[],
  categories: Category[]
): CategoryTotal[] {
  const expenseOnly = transactions.filter((t) => t.type === "expense");
  const totalExpenses = expenseOnly.reduce((s, t) => s + t.amount, 0);

  const map = new Map<string, { amount: number; count: number }>();
  for (const t of expenseOnly) {
    const existing = map.get(t.categoryId) ?? { amount: 0, count: 0 };
    map.set(t.categoryId, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  }

  const results: CategoryTotal[] = [];
  for (const [catId, data] of Array.from(map.entries())) {
    const cat = categories.find((c) => c.id === catId);
    results.push({
      categoryId: catId,
      categoryName: cat?.name ?? catId,
      amount: data.amount,
      transactionCount: data.count,
      percentage:
        totalExpenses > 0
          ? Math.round((data.amount / totalExpenses) * 1000) / 10
          : 0,
    });
  }

  return results.sort((a, b) => b.amount - a.amount);
}

// ─── Daily Totals ─────────────────────────────────────────────────────────────

export function calculateDailyTotals(
  transactions: Transaction[]
): DailyTotal[] {
  const map = new Map<
    string,
    { income: number; expenses: number; count: number }
  >();

  for (const t of transactions) {
    const existing = map.get(t.date) ?? { income: 0, expenses: 0, count: 0 };
    if (t.type === "income" || t.type === "money_received") {
      existing.income += t.amount;
    } else if (t.type === "expense") {
      existing.expenses += t.amount;
    }
    existing.count += 1;
    map.set(t.date, existing);
  }

  return Array.from(map.entries())
    .map(([date, data]) => ({
      date,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Monthly Totals ───────────────────────────────────────────────────────────

export function calculateMonthlyTotals(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month: number
): MonthlyTotal {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const prefix = `${year}-${pad(month)}`;

  const monthTxns = transactions.filter((t) => t.date.startsWith(prefix));
  const income = monthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Days in month with expenses
  const dailyExpMap = new Map<string, number>();
  for (const t of monthTxns.filter((tx) => tx.type === "expense")) {
    dailyExpMap.set(t.date, (dailyExpMap.get(t.date) ?? 0) + t.amount);
  }
  const daysWithExpenses = dailyExpMap.size;
  const avgDaily = daysWithExpenses > 0 ? expenses / daysWithExpenses : 0;

  // Highest spending day
  let highestDay = "";
  let highestDayAmt = 0;
  for (const [date, amt] of Array.from(dailyExpMap.entries())) {
    if (amt > highestDayAmt) {
      highestDayAmt = amt;
      highestDay = date;
    }
  }

  // Highest spending category
  const catTotals = calculateCategoryTotals(monthTxns, categories);
  const highestCat = catTotals[0]?.categoryName;

  return {
    year,
    month,
    income,
    expenses,
    net: income - expenses,
    transactionCount: monthTxns.length,
    averageDailySpending: Math.round(avgDaily * 100) / 100,
    highestSpendingDay: highestDay || undefined,
    highestSpendingCategory: highestCat,
  };
}

// ─── Payment Method Totals ────────────────────────────────────────────────────

export function calculatePaymentMethodTotals(
  transactions: Transaction[]
): PaymentMethodTotal[] {
  const expenseOnly = transactions.filter((t) => t.type === "expense");
  const total = expenseOnly.reduce((s, t) => s + t.amount, 0);

  const map = new Map<PaymentMethod, { amount: number; count: number }>();
  for (const t of expenseOnly) {
    const existing = map.get(t.paymentMethod) ?? { amount: 0, count: 0 };
    map.set(t.paymentMethod, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([method, data]) => ({
      method,
      amount: data.amount,
      transactionCount: data.count,
      percentage:
        total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Budget Usage ─────────────────────────────────────────────────────────────

export function calculateBudgetUsage(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetUsage[] {
  const thisMonthTxns = filterThisMonth(transactions).filter(
    (t) => t.type === "expense"
  );

  return budgets.map((budget) => {
    let spent = 0;
    if (budget.categoryId) {
      spent = thisMonthTxns
        .filter((t) => t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
    } else {
      spent = thisMonthTxns.reduce((s, t) => s + t.amount, 0);
    }

    const remaining = budget.amount - spent;
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      budgetAmount: budget.amount,
      spentAmount: spent,
      remainingAmount: remaining,
      percentage: Math.min(Math.round(percentage * 10) / 10, 100),
      isOverBudget: spent > budget.amount,
      isNearLimit: percentage >= 80 && spent <= budget.amount,
    };
  });
}

// ─── Loan Balances ────────────────────────────────────────────────────────────

export function calculateLoanBalances(loans: LoanRecord[]): LoanBalance[] {
  const map = new Map<
    string,
    { given: number; received: number; ids: string[] }
  >();

  for (const loan of loans) {
    const existing = map.get(loan.personName) ?? {
      given: 0,
      received: 0,
      ids: [],
    };
    if (loan.direction === "given") {
      existing.given += loan.principalAmount - loan.paidAmount;
    } else {
      existing.received += loan.principalAmount - loan.paidAmount;
    }
    existing.ids.push(loan.id);
    map.set(loan.personName, existing);
  }

  return Array.from(map.entries()).map(([personName, data]) => ({
    personName,
    totalGiven: data.given,
    totalReceived: data.received,
    pendingAmount: data.given - data.received,
    loanIds: data.ids,
  }));
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    expense: "Expense",
    income: "Income",
    money_given: "Money Given",
    money_received: "Money Received",
    transfer: "Transfer",
  };
  return labels[type];
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: "Cash",
    upi: "UPI",
    debit_card: "Debit Card",
    credit_card: "Credit Card",
    bank_transfer: "Bank Transfer",
    other: "Other",
  };
  return labels[method];
}

export function isExpenseType(type: TransactionType): boolean {
  return type === "expense" || type === "money_given";
}

export function isIncomeType(type: TransactionType): boolean {
  return type === "income" || type === "money_received";
}
