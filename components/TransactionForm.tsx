"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import type { Transaction, TransactionType, PaymentMethod } from "@/types";
import { getCurrentDate, getCurrentTime } from "@/lib/utils";
import { getTransactionTypeLabel, getPaymentMethodLabel } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const TRANSACTION_TYPES: TransactionType[] = [
  "expense", "income", "money_given", "money_received", "transfer",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash", "upi", "debit_card", "credit_card", "bank_transfer", "other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Transaction>;
  editId?: string;
}

export function TransactionForm({ open, onClose, initial, editId }: Props) {
  const { categories, addTransaction, updateTransaction, settings } = useStore();

  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? settings.defaultCategoryId ?? "other");
  const [date, setDate] = useState(initial?.date ?? getCurrentDate());
  const [time, setTime] = useState(initial?.time ?? getCurrentTime());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? settings.defaultPaymentMethod
  );
  const [person, setPerson] = useState(initial?.person ?? "");
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync when `initial` changes (e.g., opening edit for different transaction)
  useEffect(() => {
    if (open) {
      setType(initial?.type ?? "expense");
      setAmount(initial?.amount?.toString() ?? "");
      setDescription(initial?.description ?? "");
      setCategoryId(initial?.categoryId ?? settings.defaultCategoryId ?? "other");
      setDate(initial?.date ?? getCurrentDate());
      setTime(initial?.time ?? getCurrentTime());
      setPaymentMethod(initial?.paymentMethod ?? settings.defaultPaymentMethod);
      setPerson(initial?.person ?? "");
      setMerchant(initial?.merchant ?? "");
      setNotes(initial?.notes ?? "");
      setTags((initial?.tags ?? []).join(", "));
      setErrors({});
    }
  }, [open, initial, settings.defaultPaymentMethod, settings.defaultCategoryId]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) errs.amount = "Enter a valid amount greater than 0";
    if (!description.trim()) errs.description = "Description is required";
    if (!date) errs.date = "Date is required";
    if (!time) errs.time = "Time is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const txData = {
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        categoryId,
        date,
        time,
        paymentMethod,
        person: person.trim() || undefined,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      if (editId) {
        await updateTransaction(editId, txData);
        toast.success("Transaction updated");
      } else {
        await addTransaction(txData);
        toast.success("Transaction added");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Filter categories by type
  const filteredCategories = categories.filter((c) => {
    if (type === "expense" || type === "money_given" || type === "transfer") {
      return c.type === "expense" || c.type === "both";
    }
    if (type === "income" || type === "money_received") {
      return c.type === "income" || c.type === "both";
    }
    return true;
  });

  // Group categories by parent
  const topLevel = filteredCategories.filter((c) => !c.parentId);
  const grouped = topLevel.map((parent) => ({
    parent,
    children: filteredCategories.filter((c) => c.parentId === parent.id),
  }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TRANSACTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {getTransactionTypeLabel(t)}
              </button>
            ))}
          </div>

          {/* Amount + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g. Chai, Auto, Salary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {grouped.map(({ parent, children }) => (
                  <React.Fragment key={parent.id}>
                    {children.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {parent.icon} {parent.name}
                        </div>
                        {children.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.icon} {parent.name}
                      </SelectItem>
                    )}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={errors.time ? "border-destructive" : ""}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Person + Merchant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="person">Person</Label>
              <Input
                id="person"
                placeholder="e.g. Rahul, Mummy"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                placeholder="e.g. Swiggy, Amazon"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          {/* Notes + Tags */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="e.g. essential, work, monthly"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
