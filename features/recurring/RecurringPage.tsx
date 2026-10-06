"use client";
import React, { useState } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import { formatCurrency, getCurrentDate } from "@/lib/utils";
import { getTransactionTypeLabel, getPaymentMethodLabel } from "@/lib/calculations";
import type { RecurringTransaction, TransactionType, PaymentMethod, RecurringFrequency } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurringPage() {
  const { recurringTransactions, categories, addRecurring, updateRecurring, removeRecurring } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function getCategoryName(catId: string) {
    return categories.find((c) => c.id === catId)?.name ?? catId;
  }
  function getCategoryIcon(catId: string) {
    return categories.find((c) => c.id === catId)?.icon ?? "📦";
  }

  async function handleDelete() {
    if (!deleteId) return;
    await removeRecurring(deleteId);
    toast.success("Recurring transaction deleted");
    setDeleteId(null);
  }

  async function toggleActive(rt: RecurringTransaction) {
    await updateRecurring(rt.id, { isActive: !rt.isActive });
    toast.success(rt.isActive ? "Paused" : "Resumed");
  }

  const active = recurringTransactions.filter((r) => r.isActive);
  const paused = recurringTransactions.filter((r) => !r.isActive);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} active · {paused.length} paused
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Recurring
        </Button>
      </div>

      {recurringTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="text-muted-foreground">No recurring transactions yet.</p>
            <p className="text-sm text-muted-foreground">Add your rent, EMI, salary, subscriptions…</p>
            <Button onClick={() => setFormOpen(true)}>Add First Recurring</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recurringTransactions.map((rt) => (
            <Card key={rt.id} className={`border-border ${!rt.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                    {getCategoryIcon(rt.categoryId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{rt.description}</p>
                      <Badge variant={rt.type === "income" ? "income" : "expense"} className="text-xs">
                        {getTransactionTypeLabel(rt.type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {rt.frequency}
                      </Badge>
                      {!rt.isActive && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(rt.categoryId)} · {getPaymentMethodLabel(rt.paymentMethod)} · Since {rt.startDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${rt.type === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                      {formatCurrency(rt.amount)}
                    </p>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button
                        onClick={() => toggleActive(rt)}
                        className={`p-1.5 rounded transition-colors ${
                          rt.isActive
                            ? "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
                            : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10"
                        }`}
                        title={rt.isActive ? "Pause" : "Resume"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(rt.id)}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddRecurringDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categories}
        onAdd={addRecurring}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
            <AlertDialogDescription>This will remove the recurring schedule. Existing transactions are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddRecurringDialog({
  open, onClose, categories, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string; icon?: string }[];
  onAdd: (r: Omit<import("@/types").RecurringTransaction, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("other");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "debit_card", "credit_card", "bank_transfer", "other"];
  const TX_TYPES: TransactionType[] = ["expense", "income"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim()) { setError("Description is required"); return; }
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    await onAdd({ type, amount: amt, description: description.trim(), categoryId, paymentMethod, frequency, startDate, isActive: true });
    toast.success("Recurring transaction added");
    setAmount(""); setDescription(""); setError("");
    onClose();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Recurring Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            {TX_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}>
                {getTransactionTypeLabel(t)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input placeholder="e.g. Rent, Salary, EMI" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Recurring"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
