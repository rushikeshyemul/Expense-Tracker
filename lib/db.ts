import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Transaction,
  Category,
  Budget,
  RecurringTransaction,
  LoanRecord,
  AppSettings,
} from "@/types";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

const DB_NAME = "expense-tracker-db";
const DB_VERSION = 1;

// ── idb typed schema ─────────────────────────────────────────────────────────

interface ExpenseTrackerDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { date: string; type: string; categoryId: string };
  };
  categories: {
    key: string;
    value: Category;
  };
  budgets: {
    key: string;
    value: Budget;
  };
  recurringTransactions: {
    key: string;
    value: RecurringTransaction;
  };
  loanRecords: {
    key: string;
    value: LoanRecord;
  };
  settings: {
    key: string;
    value: AppSettings & { id: string };
  };
}

// ── Singleton DB promise ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<ExpenseTrackerDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ExpenseTrackerDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ExpenseTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", { keyPath: "id" });
          txStore.createIndex("date", "date");
          txStore.createIndex("type", "type");
          txStore.createIndex("categoryId", "categoryId");
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("budgets")) {
          db.createObjectStore("budgets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("recurringTransactions")) {
          db.createObjectStore("recurringTransactions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("loanRecords")) {
          db.createObjectStore("loanRecords", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll("transactions");
  return all.sort(
    (a, b) =>
      new Date(`${b.date}T${b.time}`).getTime() -
      new Date(`${a.date}T${a.time}`).getTime()
  );
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  await db.put("transactions", tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("transactions", id);
}

export async function bulkSaveTransactions(txns: Transaction[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("transactions", "readwrite");
  await Promise.all(txns.map((t) => tx.store.put(t)));
  await tx.done;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  const cats = await db.getAll("categories");
  if (cats.length === 0) {
    await bulkSaveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return cats;
}

export async function saveCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.put("categories", cat);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("categories", id);
}

export async function bulkSaveCategories(cats: Category[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("categories", "readwrite");
  await Promise.all(cats.map((c) => tx.store.put(c)));
  await tx.done;
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDB();
  return db.getAll("budgets");
}

export async function saveBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await db.put("budgets", budget);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("budgets", id);
}

// ── Recurring Transactions ────────────────────────────────────────────────────

export async function getAllRecurringTransactions(): Promise<RecurringTransaction[]> {
  const db = await getDB();
  return db.getAll("recurringTransactions");
}

export async function saveRecurringTransaction(rt: RecurringTransaction): Promise<void> {
  const db = await getDB();
  await db.put("recurringTransactions", rt);
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recurringTransactions", id);
}

// ── Loan Records ──────────────────────────────────────────────────────────────

export async function getAllLoanRecords(): Promise<LoanRecord[]> {
  const db = await getDB();
  return db.getAll("loanRecords");
}

export async function saveLoanRecord(loan: LoanRecord): Promise<void> {
  const db = await getDB();
  await db.put("loanRecords", loan);
}

export async function deleteLoanRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("loanRecords", id);
}

// ── Settings ──────────────────────────────────────────────────────────────────

const SETTINGS_KEY = "app_settings";

const DEFAULT_SETTINGS: AppSettings & { id: string } = {
  id: SETTINGS_KEY,
  currency: "INR",
  currencySymbol: "₹",
  theme: "dark",
  defaultPaymentMethod: "upi",
  dataStoredLocally: true,
  version: "1.0.0",
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const s = await db.get("settings", SETTINGS_KEY);
  return (s ?? DEFAULT_SETTINGS) as AppSettings;
}

export async function saveSettings(updates: Partial<AppSettings>): Promise<void> {
  const db = await getDB();
  const current = await getSettings();
  await db.put("settings", { ...current, ...updates, id: SETTINGS_KEY });
}

// ── Backup / Restore ──────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const stores = ["transactions", "categories", "budgets", "recurringTransactions", "loanRecords", "settings"] as const;
  await Promise.all(stores.map((s) => db.clear(s)));
  // Don't reset dbPromise — keep the same connection, just clear the data
}
