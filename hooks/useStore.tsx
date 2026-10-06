"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  Transaction,
  Category,
  Budget,
  RecurringTransaction,
  LoanRecord,
  AppSettings,
  RecurringFrequency,
} from "@/types";
import * as db from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";
import { generateId } from "@/lib/utils";
import {
  calculateSummaryTotals,
  calculateCategoryTotals,
  calculateDailyTotals,
  calculateBudgetUsage,
  calculateLoanBalances,
} from "@/lib/calculations";

// ─── Store Types ──────────────────────────────────────────────────────────────

interface StoreState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  loanRecords: LoanRecord[];
  settings: AppSettings;
  isLoading: boolean;
  isInitialized: boolean;
}

interface StoreActions {
  // Transactions
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  // Categories
  addCategory: (cat: Omit<Category, "id">) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  // Budgets
  addBudget: (b: Omit<Budget, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  // Recurring
  addRecurring: (r: Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  // Loans
  addLoan: (l: Omit<LoanRecord, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateLoan: (id: string, updates: Partial<LoanRecord>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  // Settings
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  // Backup
  importBackup: (data: {
    transactions?: Transaction[];
    categories?: Category[];
    budgets?: Budget[];
    recurringTransactions?: RecurringTransaction[];
    loanRecords?: LoanRecord[];
    settings?: AppSettings;
  }) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  reload: () => Promise<void>;
}

type Store = StoreState & StoreActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({
    transactions: [],
    categories: [],
    budgets: [],
    recurringTransactions: [],
    loanRecords: [],
    settings: {
      currency: "INR",
      currencySymbol: "₹",
      theme: "dark",
      defaultPaymentMethod: "upi",
      dataStoredLocally: true,
      version: "1.0.0",
    },
    isLoading: true,
    isInitialized: false,
  });

  const loadAll = useCallback(async () => {
    try {
      const [transactions, categories, budgets, recurringTransactions, loanRecords, settings] =
        await Promise.all([
          db.getAllTransactions(),
          db.getAllCategories(),
          db.getAllBudgets(),
          db.getAllRecurringTransactions(),
          db.getAllLoanRecords(),
          db.getSettings(),
        ]);

      const today = new Date();
      const updatedRecurring: RecurringTransaction[] = [];
      const newTxns: Transaction[] = [];

      for (const rt of recurringTransactions) {
        if (!rt.isActive) {
          updatedRecurring.push(rt);
          continue;
        }
        const generated = generateDueRecurring(rt, today);
        if (generated.txns.length > 0) {
          newTxns.push(...generated.txns);
          updatedRecurring.push({
            ...rt,
            lastGeneratedDate: generated.newLastDate,
            updatedAt: new Date().toISOString(),
          });
        } else {
          updatedRecurring.push(rt);
        }
      }

      if (newTxns.length > 0) {
        await db.bulkSaveTransactions(newTxns);
      }
      for (const ur of updatedRecurring) {
        await db.saveRecurringTransaction(ur);
      }

      const allTxns = [...newTxns, ...transactions].sort(
        (a, b) =>
          new Date(`${b.date}T${b.time}`).getTime() -
          new Date(`${a.date}T${a.time}`).getTime()
      );

      setState({
        transactions: allTxns,
        categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
        budgets,
        recurringTransactions: updatedRecurring,
        loanRecords,
        settings,
        isLoading: false,
        isInitialized: true,
      });
    } catch (e) {
      console.error("Store load error:", e);
      setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Transactions ────────────────────────────────────────────────────────────

  const addTransaction = useCallback(
    async (txData: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        ...txData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await db.saveTransaction(tx);
      setState((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions].sort(
          (a, b) =>
            new Date(`${b.date}T${b.time}`).getTime() -
            new Date(`${a.date}T${a.time}`).getTime()
        ),
      }));
      return tx;
    },
    []
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setState((prev) => {
        const txns = prev.transactions.map((t) =>
          t.id === id
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        );
        const updated = txns.find((t) => t.id === id);
        if (updated) db.saveTransaction(updated);
        return {
          ...prev,
          transactions: txns.sort(
            (a, b) =>
              new Date(`${b.date}T${b.time}`).getTime() -
              new Date(`${a.date}T${a.time}`).getTime()
          ),
        };
      });
    },
    []
  );

  const removeTransaction = useCallback(async (id: string) => {
    await db.deleteTransaction(id);
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  // ─── Categories ──────────────────────────────────────────────────────────────

  const addCategory = useCallback(async (catData: Omit<Category, "id">) => {
    const cat: Category = { ...catData, id: generateId() };
    await db.saveCategory(cat);
    setState((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
  }, []);

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      setState((prev) => {
        const cats = prev.categories.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        );
        const updated = cats.find((c) => c.id === id);
        if (updated) db.saveCategory(updated);
        return { ...prev, categories: cats };
      });
    },
    []
  );

  const removeCategory = useCallback(async (id: string) => {
    await db.deleteCategory(id);
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  }, []);

  // ─── Budgets ─────────────────────────────────────────────────────────────────

  const addBudget = useCallback(
    async (bData: Omit<Budget, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const b: Budget = { ...bData, id: generateId(), createdAt: now, updatedAt: now };
      await db.saveBudget(b);
      setState((prev) => ({ ...prev, budgets: [...prev.budgets, b] }));
    },
    []
  );

  const updateBudget = useCallback(
    async (id: string, updates: Partial<Budget>) => {
      setState((prev) => {
        const budgets = prev.budgets.map((b) =>
          b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
        );
        const updated = budgets.find((b) => b.id === id);
        if (updated) db.saveBudget(updated);
        return { ...prev, budgets };
      });
    },
    []
  );

  const removeBudget = useCallback(async (id: string) => {
    await db.deleteBudget(id);
    setState((prev) => ({ ...prev, budgets: prev.budgets.filter((b) => b.id !== id) }));
  }, []);

  // ─── Recurring ────────────────────────────────────────────────────────────────

  const addRecurring = useCallback(
    async (rData: Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const r: RecurringTransaction = { ...rData, id: generateId(), createdAt: now, updatedAt: now };
      await db.saveRecurringTransaction(r);
      setState((prev) => ({ ...prev, recurringTransactions: [...prev.recurringTransactions, r] }));
    },
    []
  );

  const updateRecurring = useCallback(
    async (id: string, updates: Partial<RecurringTransaction>) => {
      setState((prev) => {
        const rts = prev.recurringTransactions.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        );
        const updated = rts.find((r) => r.id === id);
        if (updated) db.saveRecurringTransaction(updated);
        return { ...prev, recurringTransactions: rts };
      });
    },
    []
  );

  const removeRecurring = useCallback(async (id: string) => {
    await db.deleteRecurringTransaction(id);
    setState((prev) => ({
      ...prev,
      recurringTransactions: prev.recurringTransactions.filter((r) => r.id !== id),
    }));
  }, []);

  // ─── Loans ───────────────────────────────────────────────────────────────────

  const addLoan = useCallback(
    async (lData: Omit<LoanRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const l: LoanRecord = { ...lData, id: generateId(), createdAt: now, updatedAt: now };
      await db.saveLoanRecord(l);
      setState((prev) => ({ ...prev, loanRecords: [...prev.loanRecords, l] }));
    },
    []
  );

  const updateLoan = useCallback(
    async (id: string, updates: Partial<LoanRecord>) => {
      setState((prev) => {
        const loans = prev.loanRecords.map((l) =>
          l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
        );
        const updated = loans.find((l) => l.id === id);
        if (updated) db.saveLoanRecord(updated);
        return { ...prev, loanRecords: loans };
      });
    },
    []
  );

  const removeLoan = useCallback(async (id: string) => {
    await db.deleteLoanRecord(id);
    setState((prev) => ({ ...prev, loanRecords: prev.loanRecords.filter((l) => l.id !== id) }));
  }, []);

  // ─── Settings ────────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    await db.saveSettings(updates);
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, []);

  // ─── Backup / Restore ─────────────────────────────────────────────────────────

  const importBackup = useCallback(
    async (data: {
      transactions?: Transaction[];
      categories?: Category[];
      budgets?: Budget[];
      recurringTransactions?: RecurringTransaction[];
      loanRecords?: LoanRecord[];
      settings?: AppSettings;
    }) => {
      if (data.transactions) await db.bulkSaveTransactions(data.transactions);
      if (data.categories) await db.bulkSaveCategories(data.categories);
      if (data.budgets) for (const b of data.budgets) await db.saveBudget(b);
      if (data.recurringTransactions)
        for (const r of data.recurringTransactions) await db.saveRecurringTransaction(r);
      if (data.loanRecords) for (const l of data.loanRecords) await db.saveLoanRecord(l);
      if (data.settings) await db.saveSettings(data.settings);
      await loadAll();
    },
    [loadAll]
  );

  const clearAllData = useCallback(async () => {
    await db.clearAllData();
    await loadAll();
  }, [loadAll]);

  const loadDemoData = useCallback(async () => {
    const { DEMO_TRANSACTIONS, DEMO_LOANS, DEMO_BUDGETS, DEMO_RECURRING } = await import("@/lib/demoData");
    await importBackup({
      transactions: DEMO_TRANSACTIONS,
      loanRecords: DEMO_LOANS,
      budgets: DEMO_BUDGETS,
      recurringTransactions: DEMO_RECURRING,
    });
  }, [importBackup]);

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await loadAll();
  }, [loadAll]);

  const store: Store = useMemo(
    () => ({
      ...state,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addCategory,
      updateCategory,
      removeCategory,
      addBudget,
      updateBudget,
      removeBudget,
      addRecurring,
      updateRecurring,
      removeRecurring,
      addLoan,
      updateLoan,
      removeLoan,
      updateSettings,
      importBackup,
      clearAllData,
      loadDemoData,
      reload,
    }),
    [
      state,
      addTransaction, updateTransaction, removeTransaction,
      addCategory, updateCategory, removeCategory,
      addBudget, updateBudget, removeBudget,
      addRecurring, updateRecurring, removeRecurring,
      addLoan, updateLoan, removeLoan,
      updateSettings,
      importBackup, clearAllData, loadDemoData, reload,
    ]
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ─── Derived selectors ────────────────────────────────────────────────────────

export function useSummaryTotals(transactions: Transaction[]) {
  return useMemo(() => calculateSummaryTotals(transactions), [transactions]);
}

export function useCategoryTotals(
  transactions: Transaction[],
  categories: Category[]
) {
  return useMemo(
    () => calculateCategoryTotals(transactions, categories),
    [transactions, categories]
  );
}

export function useDailyTotals(transactions: Transaction[]) {
  return useMemo(() => calculateDailyTotals(transactions), [transactions]);
}

export function useBudgetUsage(budgets: Budget[], transactions: Transaction[]) {
  return useMemo(
    () => calculateBudgetUsage(budgets, transactions),
    [budgets, transactions]
  );
}

export function useLoanBalances(loans: LoanRecord[]) {
  return useMemo(() => calculateLoanBalances(loans), [loans]);
}

function generateDueRecurring(
  rt: RecurringTransaction,
  today: Date
): { txns: Transaction[]; newLastDate: string } {
  const txns: Transaction[] = [];
  const start = new Date(rt.startDate + "T00:00:00");
  const lastGenerated = rt.lastGeneratedDate
    ? new Date(rt.lastGeneratedDate + "T00:00:00")
    : null;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let cursor = new Date(start);
  if (lastGenerated) {
    cursor = new Date(lastGenerated);
    advanceByFrequency(cursor, rt.frequency);
  }

  const endDate = rt.endDate ? new Date(rt.endDate + "T00:00:00") : null;
  const todayStr = toDateStr(today);
  let newLastDate = rt.lastGeneratedDate ?? rt.startDate;

  while (toDateStr(cursor) <= todayStr) {
    if (endDate && cursor > endDate) break;
    const cursorStr = toDateStr(cursor);
    const existingSameDay = txns.find((t) => t.date === cursorStr);
    if (!existingSameDay) {
      const now = new Date().toISOString();
      const t: Transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${txns.length}`,
        type: rt.type,
        amount: rt.amount,
        description: rt.description,
        categoryId: rt.categoryId,
        date: cursorStr,
        time: rt.paymentMethod === "bank_transfer" ? "10:00" : `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`,
        paymentMethod: rt.paymentMethod,
        person: rt.person,
        merchant: rt.merchant,
        notes: rt.notes,
        tags: rt.tags,
        recurringId: rt.id,
        createdAt: now,
        updatedAt: now,
      };
      txns.push(t);
      newLastDate = cursorStr;
    }
    advanceByFrequency(cursor, rt.frequency);
  }

  return { txns, newLastDate };
}

function advanceByFrequency(d: Date, freq: RecurringFrequency) {
  if (freq === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (freq === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (freq === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (freq === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  }
}
