"use client";
import React, { useRef, useState } from "react";
import {
  Download, Upload, Trash2, Shield, Database, Palette,
  Tag, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import type { BackupData, ThemeMode, PaymentMethod } from "@/types";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { getPaymentMethodLabel } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SettingsPage() {
  const {
    settings, transactions, categories, budgets, recurringTransactions, loanRecords,
    updateSettings, importBackup, clearAllData, loadDemoData,
    addCategory, removeCategory,
  } = useStore();

  const [clearConfirm, setClearConfirm] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const importTxRef = useRef<HTMLInputElement>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");

  // ── Theme ────────────────────────────────────────────────────────────────────
  function handleThemeChange(theme: ThemeMode) {
    updateSettings({ theme });
    localStorage.setItem("et_theme", theme);
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : theme;
    document.documentElement.classList.toggle("light", resolved === "light");
    toast.success(`Theme changed to ${theme}`);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ["Date", "Time", "Description", "Category", "Type", "Amount", "Payment Method", "Person", "Notes"];
    const rows = transactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId;
      return [
        t.date, t.time, `"${t.description}"`, `"${cat}"`,
        t.type, t.amount, t.paymentMethod,
        t.person ?? "", `"${t.notes ?? ""}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    downloadFile(csv, `transactions-${getCurrentDate()}.csv`, "text/csv");
    toast.success(`Exported ${transactions.length} transactions`);
  }

  // ── Export JSON ────────────────────────────────────────────────────────────────
  function exportJSON() {
    const json = JSON.stringify(transactions, null, 2);
    downloadFile(json, `transactions-${getCurrentDate()}.json`, "application/json");
    toast.success(`Exported ${transactions.length} transactions`);
  }

  // ── Backup ────────────────────────────────────────────────────────────────────
  function exportBackup() {
    const backup: BackupData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      budgets,
      recurringTransactions,
      loanRecords,
      settings,
    };
    downloadFile(JSON.stringify(backup, null, 2), `backup-${getCurrentDate()}.json`, "application/json");
    toast.success("Backup exported");
  }

  // ── Import backup ─────────────────────────────────────────────────────────────
  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        const data: BackupData = JSON.parse(raw);
        if (!data.transactions || !Array.isArray(data.transactions)) {
          toast.error("Invalid backup file");
          return;
        }
        await importBackup(data);
        toast.success(`Restored ${data.transactions.length} transactions`);
      } catch {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Import transactions JSON/CSV ──────────────────────────────────────────────
  function handleImportTransactions(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(raw);
          const txns = Array.isArray(data) ? data : data.transactions;
          if (!Array.isArray(txns)) { toast.error("Invalid JSON format"); return; }
          const validTxns = txns.filter(validateTransaction);
          await importBackup({ transactions: validTxns });
          toast.success(`Imported ${validTxns.length} transactions`);
          if (validTxns.length < txns.length) {
            toast.warning(`${txns.length - validTxns.length} invalid records skipped`);
          }
        } else if (file.name.endsWith(".csv")) {
          const txns = parseCSVTransactions(raw);
          if (txns.length === 0) { toast.error("No valid rows found in CSV"); return; }
          await importBackup({ transactions: txns });
          toast.success(`Imported ${txns.length} transactions from CSV`);
        }
      } catch {
        toast.error("Failed to import file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Clear all data ────────────────────────────────────────────────────────────
  async function handleClearAll() {
    await clearAllData();
    toast.success("All data cleared");
    setClearConfirm(false);
  }

  // ── Add custom category ───────────────────────────────────────────────────────
  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    await addCategory({
      name: newCatName.trim(),
      icon: newCatIcon || "📦",
      isDefault: false,
      type: "both",
    });
    toast.success("Category added");
    setNewCatName("");
    setNewCatIcon("📦");
  }

  const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "debit_card", "credit_card", "bank_transfer", "other"];
  const THEMES: { value: ThemeMode; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "System" },
  ];

  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Privacy Notice */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Your data is private</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All data is stored locally on your device using IndexedDB. Nothing is sent to any server.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Choose your preferred appearance</p>
            </div>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleThemeChange(t.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    settings.theme === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Default Payment Method</p>
              <p className="text-xs text-muted-foreground">Used in Quick Add and forms</p>
            </div>
            <Select
              value={settings.defaultPaymentMethod}
              onValueChange={(v) => updateSettings({ defaultPaymentMethod: v as PaymentMethod })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Default Category</p>
              <p className="text-xs text-muted-foreground">Fallback category for quick entries</p>
            </div>
            <Select
              value={settings.defaultCategoryId ?? ""}
              onValueChange={(v) => updateSettings({ defaultCategoryId: v || undefined })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Other (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Other (default)</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Monthly Budget</p>
              <p className="text-xs text-muted-foreground">Overall monthly spending limit (₹)</p>
            </div>
            <Input
              type="number"
              placeholder="e.g. 20000"
              value={settings.monthlyBudget ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateSettings({ monthlyBudget: v ? parseFloat(v) : undefined });
              }}
              className="w-40"
              min={0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" /> Custom Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Emoji"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-16 text-center"
            />
            <Input
              placeholder="Category name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              className="flex-1"
            />
            <Button onClick={handleAddCategory} disabled={!newCatName.trim()} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Custom category list */}
          {customCategories.length > 0 ? (
            <div className="space-y-2">
              {customCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <button
                    onClick={async () => { await removeCategory(cat.id); toast.success("Category removed"); }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom categories yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" /> Data & Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p>{transactions.length} transactions · {categories.length} categories · {budgets.length} budgets</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportJSON} className="gap-2">
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>

          <input ref={importTxRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImportTransactions} />
          <Button variant="outline" onClick={() => importTxRef.current?.click()} className="w-full gap-2">
            <Upload className="w-4 h-4" />
            Import Transactions (JSON/CSV)
          </Button>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={exportBackup} className="gap-2">
              <Download className="w-4 h-4" />
              Export Backup
            </Button>
            <div>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
              <Button variant="outline" onClick={() => importRef.current?.click()} className="w-full gap-2">
                <Upload className="w-4 h-4" />
                Import Backup
              </Button>
            </div>
          </div>

          <Separator />

          <Button
            variant="outline"
            onClick={loadDemoData}
            className="w-full gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
          >
            Load Demo Data
          </Button>

          <Button
            variant="destructive"
            onClick={() => setClearConfirm(true)}
            className="w-full gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium">Expense Tracker v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">
            Personal finance tracker · Data stored locally · No account required
          </p>
        </CardContent>
      </Card>

      {/* Clear Confirm Dialog */}
      <AlertDialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL transactions, budgets, loan records, and settings.
              This cannot be undone. Consider exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function validateTransaction(tx: unknown): tx is import("@/types").Transaction {
  if (!tx || typeof tx !== "object") return false;
  const t = tx as Record<string, unknown>;
  if (typeof t.amount !== "number" || t.amount <= 0) return false;
  if (typeof t.description !== "string" || !t.description.trim()) return false;
  if (typeof t.type !== "string") return false;
  if (typeof t.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false;
  if (typeof t.time !== "string" || !/^\d{2}:\d{2}$/.test(t.time)) return false;
  return true;
}

function parseCSVTransactions(csv: string): import("@/types").Transaction[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results: import("@/types").Transaction[] = [];
  const now = new Date().toISOString();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const today = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
  const timeNow = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;

  const getType = (v: string): import("@/types").TransactionType => {
    const lower = v.toLowerCase().trim();
    if (lower.startsWith("income") || lower === "inc") return "income";
    if (lower.startsWith("money_given") || lower.includes("given")) return "money_given";
    if (lower.startsWith("money_received") || lower.includes("received") && lower.includes("money")) return "money_received";
    if (lower.startsWith("transfer")) return "transfer";
    return "expense";
  };

  const getPaymentMethod = (v: string): import("@/types").PaymentMethod => {
    const lower = v.toLowerCase().trim().replace(/[ _-]/g, "");
    if (lower === "cash") return "cash";
    if (lower === "upi") return "upi";
    if (lower === "debitcard" || lower === "debit") return "debit_card";
    if (lower === "creditcard" || lower === "credit") return "credit_card";
    if (lower === "banktransfer" || lower === "bank") return "bank_transfer";
    return "other";
  };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase()] = values[idx] ?? "";
    });

    const amount = parseFloat(row["amount"] || "0");
    if (!amount || amount <= 0) continue;

    const description = (row["description"] || "").trim();
    if (!description) continue;

    const date = row["date"] && /^\d{4}-\d{2}-\d{2}$/.test(row["date"]) ? row["date"] : today;
    const time = row["time"] && /^\d{2}:\d{2}/.test(row["time"]) ? row["time"].slice(0, 5) : timeNow;

    results.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`,
      type: getType(row["type"] || "expense"),
      amount,
      description,
      categoryId: "other",
      date,
      time,
      paymentMethod: getPaymentMethod(row["payment method"] || row["paymentmethod"] || "upi"),
      person: row["person"] || undefined,
      notes: row["notes"] || undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.trim().replace(/^"|"$/g, ""));
}
