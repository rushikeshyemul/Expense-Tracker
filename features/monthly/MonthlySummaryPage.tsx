"use client";
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { calculateMonthlyTotals, calculateCategoryTotals } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MonthlySummaryPage() {
  const { transactions, categories } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthly = useMemo(
    () => calculateMonthlyTotals(transactions, categories, year, month),
    [transactions, categories, year, month]
  );

  const catTotals = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const prefix = `${year}-${pad(month)}`;
    const monthTxns = transactions.filter((t) => t.date.startsWith(prefix));
    return calculateCategoryTotals(monthTxns, categories);
  }, [transactions, categories, year, month]);

  function navigate(dir: -1 | 1) {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });

  const savingsRate = monthly.income > 0
    ? Math.round((monthly.net / monthly.income) * 100)
    : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Monthly Summary</h1>

      {/* Month Navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-lg">{monthLabel}</p>
        </div>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {!isCurrentMonth && (
          <Button variant="outline" size="sm" onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>
            This Month
          </Button>
        )}
      </div>

      {/* Main Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Income</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(monthly.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(monthly.expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Savings</p>
            <p className={`text-xl font-bold ${monthly.net >= 0 ? "text-primary" : "text-red-400"}`}>
              {formatCurrency(monthly.net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Savings Rate</p>
            <p className={`text-xl font-bold ${savingsRate >= 0 ? "text-primary" : "text-red-400"}`}>
              {savingsRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-bold">{monthly.transactionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Daily Spend</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(monthly.averageDailySpending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Highest Spend Day</p>
            <p className="text-sm font-bold truncate">
              {monthly.highestSpendingDay ? formatDate(monthly.highestSpendingDay) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Top Category</p>
            <p className="text-sm font-bold truncate">{monthly.highestSpendingCategory ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {catTotals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {catTotals.map((ct) => {
              const cat = categories.find((c) => c.id === ct.categoryId);
              return (
                <div key={ct.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{cat?.icon ?? "📦"}</span>
                      <span className="font-medium">{ct.categoryName}</span>
                      <span className="text-xs text-muted-foreground">{ct.transactionCount} txns</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-red-400">{formatCurrency(ct.amount)}</span>
                      <span className="text-xs text-muted-foreground ml-2">{ct.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${ct.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {monthly.transactionCount === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No transactions for {monthLabel}.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
