"use client";
import React, { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import { calculateBudgetUsage } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import type { Budget } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BudgetsPage() {
  const { budgets, categories, transactions, addBudget, removeBudget } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const usages = useMemo(
    () => calculateBudgetUsage(budgets, transactions),
    [budgets, transactions]
  );

  function getCategoryName(catId?: string) {
    if (!catId) return "Overall";
    return categories.find((c) => c.id === catId)?.name ?? catId;
  }

  async function handleDelete() {
    if (!deleteId) return;
    await removeBudget(deleteId);
    toast.success("Budget deleted");
    setDeleteId(null);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground">Track your monthly spending limits</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="text-muted-foreground">No budgets set yet.</p>
            <Button onClick={() => setFormOpen(true)}>Set Your First Budget</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {usages.map((usage) => {
            const budget = budgets.find((b) => b.id === usage.budgetId);
            return (
              <Card
                key={usage.budgetId}
                className={`border ${
                  usage.isOverBudget
                    ? "border-destructive/50 bg-destructive/5"
                    : usage.isNearLimit
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{usage.budgetName}</p>
                        {budget?.categoryId && (
                          <Badge variant="outline" className="text-xs">
                            {getCategoryName(budget.categoryId)}
                          </Badge>
                        )}
                        {usage.isOverBudget && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="w-3 h-3" /> Over Budget
                          </Badge>
                        )}
                        {usage.isNearLimit && !usage.isOverBudget && (
                          <Badge variant="warning" className="text-xs gap-1">
                            <AlertTriangle className="w-3 h-3" /> Near Limit
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Monthly · Resets 1st of every month</p>
                    </div>
                    <button
                      onClick={() => setDeleteId(usage.budgetId)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Progress
                    value={Math.min(usage.percentage, 100)}
                    className="h-2.5 mb-3"
                    indicatorClassName={
                      usage.isOverBudget
                        ? "bg-destructive"
                        : usage.isNearLimit
                        ? "bg-amber-500"
                        : "bg-primary"
                    }
                  />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Spent</p>
                      <p className="font-semibold text-red-400">{formatCurrency(usage.spentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className={`font-semibold ${usage.remainingAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(Math.abs(usage.remainingAmount))}
                        {usage.remainingAmount < 0 && " over"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="font-semibold">{formatCurrency(usage.budgetAmount)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">{usage.percentage.toFixed(1)}% used</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddBudgetDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categories}
        onAdd={addBudget}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this budget?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddBudgetDialog({
  open, onClose, categories, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string; icon?: string; type: string }[];
  onAdd: (b: Omit<import("@/types").Budget, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) { setError("Name is required"); return; }
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    await onAdd({
      name: name.trim(),
      amount: amt,
      categoryId: categoryId || undefined,
      period: "monthly",
    });
    toast.success("Budget added");
    setName(""); setAmount(""); setCategoryId(""); setError("");
    onClose();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Budget</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1">
            <Label>Budget Name *</Label>
            <Input placeholder="e.g. Monthly Budget, Food Budget" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Amount (₹) *</Label>
            <Input type="number" placeholder="20000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Category (optional — leave blank for overall)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Overall (all expenses)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Overall (all expenses)</SelectItem>
                {categories.filter((c) => c.type !== "income").map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Budget"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
