"use client";
import React, { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Zap, X, Check } from "lucide-react";
import { parseQuickAdd, applyLearnedMappings, learnMapping } from "@/lib/quickAddParser";
import { useStore } from "@/hooks/useStore";
import type { QuickAddResult, TransactionType, PaymentMethod } from "@/types";
import { getCurrentDate, getCurrentTime, formatCurrency } from "@/lib/utils";
import { getTransactionTypeLabel, getPaymentMethodLabel } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ConfirmState {
  result: QuickAddResult;
  categoryId: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
}

export function QuickAdd() {
  const { addTransaction, categories, settings } = useStore();
  const [input, setInput] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleParse = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const raw = parseQuickAdd(trimmed);
    if (!raw) {
      toast.error("Couldn't parse that. Try 'Chai 15' or use the Add button.");
      return;
    }

    const result = applyLearnedMappings(raw);
    setConfirm({
      result,
      categoryId: result.categoryId ?? settings.defaultCategoryId ?? "other",
      type: result.type,
      paymentMethod: settings.defaultPaymentMethod,
    });
  }, [input, settings.defaultPaymentMethod, settings.defaultCategoryId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleParse();
    if (e.key === "Escape") {
      setInput("");
      setConfirm(null);
    }
  };

  const handleConfirmSave = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      await addTransaction({
        type: confirm.type,
        amount: confirm.result.amount,
        description: confirm.result.description,
        categoryId: confirm.categoryId,
        date: getCurrentDate(),
        time: getCurrentTime(),
        paymentMethod: confirm.paymentMethod,
        person: confirm.result.person,
      });

      // Learn the mapping
      learnMapping(confirm.result.description.toLowerCase(), confirm.categoryId);

      toast.success(`${confirm.result.description} ₹${confirm.result.amount} added`);
      setInput("");
      setConfirm(null);
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setConfirm(null);
    inputRef.current?.focus();
  };

  const TRANSACTION_TYPES: TransactionType[] = [
    "expense", "income", "money_given", "money_received",
  ];

  const PAYMENT_METHODS: PaymentMethod[] = [
    "cash", "upi", "debit_card", "credit_card", "bank_transfer", "other",
  ];

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Quick add: "Chai 15"  "Auto 50"  "Salary 29000"'
            className="pl-9 pr-4 h-11 text-base"
            disabled={saving}
          />
        </div>
        <Button
          onClick={handleParse}
          disabled={!input.trim() || saving}
          className="h-11 px-5 shrink-0"
        >
          Add
        </Button>
      </div>

      {/* Confirmation panel */}
      {confirm && (
        <div className="rounded-lg border border-primary/40 bg-card p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">{confirm.result.description}</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(confirm.result.amount)}
              </p>
            </div>
            <button
              onClick={handleDiscard}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Type */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Type</p>
              <Select
                value={confirm.type}
                onValueChange={(v) => setConfirm((prev) => prev ? { ...prev, type: v as TransactionType } : prev)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{getTransactionTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Category</p>
              <Select
                value={confirm.categoryId}
                onValueChange={(v) => setConfirm((prev) => prev ? { ...prev, categoryId: v } : prev)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Payment</p>
              <Select
                value={confirm.paymentMethod}
                onValueChange={(v) => setConfirm((prev) => prev ? { ...prev, paymentMethod: v as PaymentMethod } : prev)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConfirmSave} disabled={saving} className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              {saving ? "Saving…" : "Confirm & Save"}
            </Button>
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {confirm.result.confidence !== "high" && (
            <p className="text-xs text-amber-400">
              ⚠ Not 100% sure about the type — please verify before saving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
