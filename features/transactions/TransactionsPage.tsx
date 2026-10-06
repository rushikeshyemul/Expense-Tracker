"use client";
import React, { useMemo, useState, useCallback } from "react";
import { Search, Filter, X, Plus, Edit2, Trash2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import type { Transaction, TransactionFilters, DateRangeFilter, TransactionType, PaymentMethod } from "@/types";
import {
  formatCurrency, formatDate, formatTime, getCurrentDate,
  getStartOfWeek, getStartOfMonth, getStartOfLastMonth, getEndOfLastMonth,
} from "@/lib/utils";
import { getPaymentMethodLabel } from "@/lib/calculations";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function applyFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  let result = [...transactions];

  // Date range
  const today = getCurrentDate();
  if (filters.dateRange === "today") {
    result = result.filter((t) => t.date === today);
  } else if (filters.dateRange === "yesterday") {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yd = y.toISOString().split("T")[0];
    result = result.filter((t) => t.date === yd);
  } else if (filters.dateRange === "this_week") {
    result = result.filter((t) => t.date >= getStartOfWeek() && t.date <= today);
  } else if (filters.dateRange === "this_month") {
    result = result.filter((t) => t.date >= getStartOfMonth() && t.date <= today);
  } else if (filters.dateRange === "last_month") {
    result = result.filter((t) => t.date >= getStartOfLastMonth() && t.date <= getEndOfLastMonth());
  } else if (filters.dateRange === "custom" && filters.customStartDate && filters.customEndDate) {
    result = result.filter((t) => t.date >= filters.customStartDate! && t.date <= filters.customEndDate!);
  }

  // Type
  if (filters.type && filters.type !== "all") {
    result = result.filter((t) => t.type === filters.type);
  }

  // Category
  if (filters.categoryId) {
    result = result.filter((t) => t.categoryId === filters.categoryId);
  }

  // Payment method
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    result = result.filter((t) => t.paymentMethod === filters.paymentMethod);
  }

  // Amount range
  if (filters.minAmount !== undefined) {
    result = result.filter((t) => t.amount >= filters.minAmount!);
  }
  if (filters.maxAmount !== undefined) {
    result = result.filter((t) => t.amount <= filters.maxAmount!);
  }

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.person?.toLowerCase().includes(q) ?? false) ||
        (t.merchant?.toLowerCase().includes(q) ?? false) ||
        (t.notes?.toLowerCase().includes(q) ?? false) ||
        t.amount.toString().includes(q)
    );
  }

  return result;
}

export function TransactionsPage() {
  const { transactions, categories } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [deleteTx, setDeleteTx] = useState<Transaction | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});

  const filtered = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);

  const getCategoryIcon = useCallback(
    (catId: string) => categories.find((c) => c.id === catId)?.icon ?? "📦",
    [categories]
  );
  const getCategoryName = useCallback(
    (catId: string) => categories.find((c) => c.id === catId)?.name ?? catId,
    [categories]
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "" && v !== "all").length;

  const DATE_RANGES: { value: DateRangeFilter; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom" },
  ];

  const TX_TYPES: { value: TransactionType | "all"; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "expense", label: "Expense" },
    { value: "income", label: "Income" },
    { value: "money_given", label: "Money Given" },
    { value: "money_received", label: "Money Received" },
  ];

  const PAYMENT_METHODS: { value: PaymentMethod | "all"; label: string }[] = [
    { value: "all", label: "All Methods" },
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "debit_card", label: "Debit Card" },
    { value: "credit_card", label: "Credit Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {transactions.length} transactions</p>
        </div>
        <Button onClick={() => { setEditTx(undefined); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search description, person, amount…"
              className="pl-9"
              value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
            className="gap-2 shrink-0"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary/20 text-primary text-xs px-1.5 rounded-full">{activeFilterCount}</span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setFilters({})}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card className="border-border">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* Date range */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date Range</p>
                  <Select
                    value={filters.dateRange ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, dateRange: v as DateRangeFilter || undefined }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Any date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Date</SelectItem>
                      {DATE_RANGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom date range */}
                {filters.dateRange === "custom" && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">From</p>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={filters.customStartDate ?? ""}
                        onChange={(e) => setFilters((f) => ({ ...f, customStartDate: e.target.value || undefined }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">To</p>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={filters.customEndDate ?? ""}
                        onChange={(e) => setFilters((f) => ({ ...f, customEndDate: e.target.value || undefined }))}
                      />
                    </div>
                  </>
                )}

                {/* Type */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Select
                    value={filters.type ?? "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, type: v as TransactionType | "all" }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TX_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Select
                    value={filters.categoryId ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v || undefined }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Any category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <Select
                    value={filters.paymentMethod ?? "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, paymentMethod: v as PaymentMethod | "all" }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No transactions found.</p>
            {activeFilterCount > 0 && (
              <Button variant="link" onClick={() => setFilters({})}>Clear filters</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {/* Desktop table header */}
          <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <span>Description</span>
            <span>Category</span>
            <span>Payment</span>
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span>Actions</span>
          </div>

          {filtered.map((tx) => (
            <Card key={tx.id} className="border-border hover:border-primary/30 transition-colors">
              {/* Mobile layout */}
              <div className="lg:hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                      {getCategoryIcon(tx.categoryId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <TypeBadge type={tx.type} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getCategoryName(tx.categoryId)} · {getPaymentMethodLabel(tx.paymentMethod)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)} {formatTime(tx.time)}
                        {tx.person && ` · ${tx.person}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${amountColor(tx.type)}`}>
                        {tx.type === "expense" || tx.type === "money_given" ? "−" : "+"}
                        {formatCurrency(tx.amount)}
                      </p>
                      <div className="flex gap-1 mt-1 justify-end">
                        <button
                          onClick={() => { setEditTx(tx); setFormOpen(true); }}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTx(tx)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{getCategoryIcon(tx.categoryId)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description}</p>
                    {tx.person && <p className="text-xs text-muted-foreground">{tx.person}</p>}
                  </div>
                  <TypeBadge type={tx.type} />
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap">{getCategoryName(tx.categoryId)}</p>
                <p className="text-sm text-muted-foreground whitespace-nowrap">{getPaymentMethodLabel(tx.paymentMethod)}</p>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  <p>{formatDate(tx.date)}</p>
                  <p className="text-xs">{formatTime(tx.time)}</p>
                </div>
                <p className={`font-bold text-sm text-right whitespace-nowrap ${amountColor(tx.type)}`}>
                  {tx.type === "expense" || tx.type === "money_given" ? "−" : "+"}
                  {formatCurrency(tx.amount)}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditTx(tx); setFormOpen(true); }}
                    className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTx(tx)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(undefined); }}
        initial={editTx}
        editId={editTx?.id}
      />
      {deleteTx && (
        <DeleteTransactionDialog transaction={deleteTx} onClose={() => setDeleteTx(undefined)} />
      )}
    </div>
  );
}

function amountColor(type: Transaction["type"]): string {
  if (type === "expense") return "text-red-400";
  if (type === "income") return "text-emerald-400";
  if (type === "money_given") return "text-orange-400";
  if (type === "money_received") return "text-blue-400";
  return "text-muted-foreground";
}

function TypeBadge({ type }: { type: Transaction["type"] }) {
  const map: Record<Transaction["type"], { label: string; variant: "expense" | "income" | "given" | "received" | "secondary" }> = {
    expense: { label: "Expense", variant: "expense" },
    income: { label: "Income", variant: "income" },
    money_given: { label: "Given", variant: "given" },
    money_received: { label: "Received", variant: "received" },
    transfer: { label: "Transfer", variant: "secondary" },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0 shrink-0">{label}</Badge>;
}
