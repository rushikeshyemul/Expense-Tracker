"use client";
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { calculateSummaryTotals, getPaymentMethodLabel } from "@/lib/calculations";
import {
  formatCurrency, formatDate, formatTime, getCurrentDate,
} from "@/lib/utils";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";

export function DailySummaryPage() {
  const { transactions, categories } = useStore();
  const [date, setDate] = useState(getCurrentDate());
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [deleteTx, setDeleteTx] = useState<Transaction | undefined>();

  const dayTxns = useMemo(
    () => transactions.filter((t) => t.date === date).sort(
      (a, b) => b.time.localeCompare(a.time)
    ),
    [transactions, date]
  );

  const totals = useMemo(() => calculateSummaryTotals(dayTxns), [dayTxns]);

  function navigate(dir: -1 | 1) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + dir);
    setDate(d.toISOString().split("T")[0]);
  }

  const isToday = date === getCurrentDate();
  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  function getCategoryIcon(catId: string) {
    return categories.find((c) => c.id === catId)?.icon ?? "📦";
  }
  function getCategoryName(catId: string) {
    return categories.find((c) => c.id === catId)?.name ?? catId;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Summary</h1>
        <Button onClick={() => { setEditTx(undefined); setFormOpen(true); }} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <p className="font-semibold text-sm">{displayDate}</p>
          {isToday && <span className="text-xs text-primary">Today</span>}
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={isToday}
          className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {!isToday && (
          <Button variant="outline" size="sm" onClick={() => setDate(getCurrentDate())}>
            Today
          </Button>
        )}
      </div>

      {/* Date picker */}
      <div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          max={getCurrentDate()}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(totals.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net</p>
            <p className={`text-xl font-bold ${totals.netBalance >= 0 ? "text-primary" : "text-red-400"}`}>
              {formatCurrency(totals.netBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-bold">{totals.transactionCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      {dayTxns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No transactions on this day.</p>
            <Button variant="link" onClick={() => setFormOpen(true)}>Add one</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dayTxns.map((tx) => (
            <Card key={tx.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                    {getCategoryIcon(tx.categoryId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <Badge
                        variant={tx.type === "expense" ? "expense" : tx.type === "income" ? "income" : "secondary"}
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {tx.type === "expense" ? "Exp" : tx.type === "income" ? "Inc" : tx.type === "money_given" ? "Given" : "Rcvd"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(tx.categoryId)} · {getPaymentMethodLabel(tx.paymentMethod)} · {formatTime(tx.time)}
                    </p>
                    {tx.person && <p className="text-xs text-muted-foreground">Person: {tx.person}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${
                      tx.type === "expense" ? "text-red-400" :
                      tx.type === "income" ? "text-emerald-400" :
                      tx.type === "money_given" ? "text-orange-400" : "text-blue-400"
                    }`}>
                      {tx.type === "expense" || tx.type === "money_given" ? "−" : "+"}
                      {formatCurrency(tx.amount)}
                    </p>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button
                        onClick={() => { setEditTx(tx); setFormOpen(true); }}
                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTx(tx)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {tx.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pl-12">{tx.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(undefined); }}
        initial={editTx ? editTx : { date }}
        editId={editTx?.id}
      />
      {deleteTx && (
        <DeleteTransactionDialog transaction={deleteTx} onClose={() => setDeleteTx(undefined)} />
      )}
    </div>
  );
}
