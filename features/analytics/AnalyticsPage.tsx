"use client";
import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useStore } from "@/hooks/useStore";
import {
  calculateCategoryTotals,
  calculateDailyTotals,
  calculatePaymentMethodTotals,
  filterThisMonth,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CHART_COLORS = [
  "hsl(142,76%,46%)",
  "hsl(217,91%,60%)",
  "hsl(38,92%,50%)",
  "hsl(330,81%,60%)",
  "hsl(262,83%,58%)",
  "hsl(180,70%,50%)",
  "hsl(15,80%,55%)",
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export function AnalyticsPage() {
  const { transactions, categories } = useStore();

  const thisMonthTxns = useMemo(() => filterThisMonth(transactions), [transactions]);

  // Category totals
  const catTotals = useMemo(
    () => calculateCategoryTotals(thisMonthTxns, categories).slice(0, 8),
    [thisMonthTxns, categories]
  );

  // Daily totals for this month
  const dailyTotals = useMemo(() => {
    const dt = calculateDailyTotals(thisMonthTxns);
    return dt.slice(0, 30).reverse();
  }, [thisMonthTxns]);

  // Payment method totals
  const paymentTotals = useMemo(
    () => calculatePaymentMethodTotals(thisMonthTxns),
    [thisMonthTxns]
  );

  // Monthly comparison (last 6 months)
  const monthlyComparison = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const prefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const monthTxns = transactions.filter((t) => t.date.startsWith(prefix));
      const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      result.push({
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        income,
        expenses,
      });
    }
    return result;
  }, [transactions]);

  // Income vs expense pie
  const incomeExpensePie = useMemo(() => {
    const income = thisMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = thisMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return [
      { name: "Income", value: income },
      { name: "Expenses", value: expenses },
    ].filter((d) => d.value > 0);
  }, [thisMonthTxns]);

  const catChartData = catTotals.map((ct) => ({
    name: ct.categoryName.length > 10 ? ct.categoryName.slice(0, 10) + "…" : ct.categoryName,
    amount: ct.amount,
  }));

  const paymentChartData = paymentTotals.map((pt) => ({
    name: pt.method.replace("_", " ").toUpperCase(),
    amount: pt.amount,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Income vs Expenses (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyComparison} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="hsl(142,76%,46%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(0,84%,60%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Income vs expense pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">This Month Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeExpensePie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={incomeExpensePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {incomeExpensePie.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "hsl(142,76%,46%)" : "hsl(0,84%,60%)"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">No data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spending by Category (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              {catChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={catChartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Amount" radius={[0, 3, 3, 0]}>
                      {catChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No expense data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category list */}
          {catTotals.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                {catTotals.map((ct, i) => {
                  const cat = categories.find((c) => c.id === ct.categoryId);
                  return (
                    <div key={ct.categoryId} className="flex items-center gap-3">
                      <span className="text-base">{cat?.icon ?? "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{ct.categoryName}</span>
                          <span className="text-sm font-semibold text-red-400">{formatCurrency(ct.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${ct.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{ct.percentage}%</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Daily Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily Spending (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTotals} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(215,20%,65%)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(8)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(215,20%,65%)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="hsl(0,84%,60%)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="hsl(142,76%,46%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No data for this month</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spending by Payment Method (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="amount"
                      >
                        {paymentChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {paymentTotals.map((pt, i) => (
                      <div key={pt.method} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="capitalize">{pt.method.replace("_", " ")}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(pt.amount)}</span>
                          <span className="text-muted-foreground text-xs ml-2">{pt.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
