"use client";
import React, { useMemo, useState } from "react";
import {
  TrendingDown, TrendingUp, Wallet, Plus, ArrowUpRight,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { filterToday, filterThisMonth, calculateSummaryTotals } from "@/lib/calculations";
import { formatCurrency, formatTime, getRelativeDateLabel } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Transaction } from "@/types";

export function DashboardPage() {
  const { transactions, categories, settings, isLoading, loadDemoData } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [deleteTx, setDeleteTx] = useState<Transaction | undefined>();

  const todayTxns = useMemo(() => filterToday(transactions), [transactions]);
  const monthTxns = useMemo(() => filterThisMonth(transactions), [transactions]);

  const todayTotals = useMemo(() => calculateSummaryTotals(todayTxns), [todayTxns]);
  const monthTotals = useMemo(() => calculateSummaryTotals(monthTxns), [monthTxns]);
  const allTotals = useMemo(() => calculateSummaryTotals(transactions), [transactions]);

  const recentTxns = transactions.slice(0, 10);

  function getCategoryIcon(catId: string) {
    return categories.find((c) => c.id === catId)?.icon ?? "📦";
  }

  function getCategoryName(catId: string) {
    return categories.find((c) => c.id === catId)?.name ?? catId;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button onClick={() => { setEditTx(undefined); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
        </Button>
      </div>

      {/* Quick Add */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
            ⚡ Quick Add
          </p>
          <QuickAdd />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Today Expense</p>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{formatCurrency(todayTotals.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Today Income</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(todayTotals.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Month Expense</p>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{formatCurrency(monthTotals.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Month Income</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(monthTotals.totalIncome)}</p>
          </CardContent>
        </Card>
      </div>

      {settings.monthlyBudget && settings.monthlyBudget > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Monthly Budget</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Spent {formatCurrency(monthTotals.totalExpenses)} of {formatCurrency(settings.monthlyBudget)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${(monthTotals.totalExpenses / settings.monthlyBudget) > 0.9 ? "text-red-400" : (monthTotals.totalExpenses / settings.monthlyBudget) > 0.7 ? "text-amber-400" : "text-emerald-400"}`}>
                  {Math.min(100, Math.round((monthTotals.totalExpenses / settings.monthlyBudget) * 100))}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthTotals.totalExpenses >= settings.monthlyBudget
                    ? "Over budget"
                    : `${formatCurrency(settings.monthlyBudget - monthTotals.totalExpenses)} left`}
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(100, (monthTotals.totalExpenses / settings.monthlyBudget) * 100)}
              indicatorClassName={
                (monthTotals.totalExpenses / settings.monthlyBudget) > 0.9
                  ? "bg-red-500"
                  : (monthTotals.totalExpenses / settings.monthlyBudget) > 0.7
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Balance Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">This Month Income</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(monthTotals.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">This Month Expense</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(monthTotals.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-lg font-bold ${monthTotals.netBalance >= 0 ? "text-primary" : "text-red-400"}`}>
                {formatCurrency(monthTotals.netBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo data prompt */}
      {transactions.length === 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-10 text-center space-y-3">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No transactions yet.</p>
            <p className="text-sm text-muted-foreground">Start with Quick Add above, or load demo data.</p>
            <Button variant="outline" size="sm" onClick={loadDemoData}>
              Load Demo Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {recentTxns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <a href="/transactions" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {recentTxns.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => { setEditTx(tx); setFormOpen(true); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/60 cursor-pointer transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                    {getCategoryIcon(tx.categoryId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(tx.categoryId)} · {getRelativeDateLabel(tx.date)}, {formatTime(tx.time)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-sm ${
                      tx.type === "expense" ? "text-red-400" :
                      tx.type === "income" ? "text-emerald-400" :
                      tx.type === "money_given" ? "text-orange-400" :
                      "text-blue-400"
                    }`}>
                      {tx.type === "expense" || tx.type === "money_given" ? "−" : "+"}
                      {formatCurrency(tx.amount)}
                    </p>
                    <TypeBadge type={tx.type} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(undefined); }}
        initial={editTx}
        editId={editTx?.id}
      />
      {deleteTx && (
        <DeleteTransactionDialog
          transaction={deleteTx}
          onClose={() => setDeleteTx(undefined)}
        />
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: Transaction["type"] }) {
  const map = {
    expense: { label: "Expense", variant: "expense" as const },
    income: { label: "Income", variant: "income" as const },
    money_given: { label: "Given", variant: "given" as const },
    money_received: { label: "Received", variant: "received" as const },
    transfer: { label: "Transfer", variant: "secondary" as const },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{label}</Badge>;
}
