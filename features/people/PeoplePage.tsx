"use client";
import React, { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import { calculateLoanBalances } from "@/lib/calculations";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import type { LoanRecord, LoanStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function PeoplePage() {
  const { loanRecords, addLoan, updateLoan, removeLoan } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const balances = useMemo(() => calculateLoanBalances(loanRecords), [loanRecords]);

  const totalToReceive = balances.filter((b) => b.pendingAmount > 0).reduce((s, b) => s + b.pendingAmount, 0);
  const totalToPay = balances.filter((b) => b.pendingAmount < 0).reduce((s, b) => s + Math.abs(b.pendingAmount), 0);

  function getStatusBadge(status: LoanStatus) {
    if (status === "paid") return <Badge variant="success">Paid</Badge>;
    if (status === "partially_paid") return <Badge variant="warning">Partial</Badge>;
    return <Badge variant="expense">Pending</Badge>;
  }

  async function handleDelete() {
    if (!deleteId) return;
    await removeLoan(deleteId);
    toast.success("Record deleted");
    setDeleteId(null);
  }

  async function markStatus(loan: LoanRecord, status: LoanStatus) {
    const paidAmount = status === "paid" ? loan.principalAmount : loan.paidAmount;
    await updateLoan(loan.id, { status, paidAmount });
    toast.success(`Marked as ${status.replace("_", " ")}`);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">People & Loans</h1>
          <p className="text-sm text-muted-foreground">Track money lent and borrowed</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Record
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">To Receive</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalToReceive)}</p>
            <p className="text-xs text-muted-foreground">Others owe you</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">To Pay</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(totalToPay)}</p>
            <p className="text-xs text-muted-foreground">You owe others</p>
          </CardContent>
        </Card>
      </div>

      {/* Person-wise summary */}
      {balances.length > 0 && (
        <div className="space-y-3">
          {balances.map((balance) => {
            const personLoans = loanRecords.filter((l) => l.personName === balance.personName);
            const isExpanded = expandedPerson === balance.personName;

            return (
              <Card key={balance.personName}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedPerson(isExpanded ? null : balance.personName)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                        {balance.personName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{balance.personName}</p>
                        <p className="text-xs text-muted-foreground">{personLoans.length} records</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {balance.pendingAmount > 0 ? (
                          <div>
                            <p className="text-xs text-muted-foreground">To receive</p>
                            <p className="font-bold text-emerald-400">{formatCurrency(balance.pendingAmount)}</p>
                          </div>
                        ) : balance.pendingAmount < 0 ? (
                          <div>
                            <p className="text-xs text-muted-foreground">To pay</p>
                            <p className="font-bold text-red-400">{formatCurrency(Math.abs(balance.pendingAmount))}</p>
                          </div>
                        ) : (
                          <Badge variant="success">Settled</Badge>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      {personLoans.map((loan) => (
                        <div key={loan.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={loan.direction === "given" ? "given" : "received"}
                                className="text-xs"
                              >
                                {loan.direction === "given" ? "Given" : "Received"}
                              </Badge>
                              {getStatusBadge(loan.status)}
                              <span className="text-xs text-muted-foreground">{formatDate(loan.date)}</span>
                            </div>
                            <p className="font-semibold mt-1">{formatCurrency(loan.principalAmount)}</p>
                            {loan.paidAmount > 0 && loan.paidAmount < loan.principalAmount && (
                              <p className="text-xs text-muted-foreground">
                                Paid: {formatCurrency(loan.paidAmount)} · Pending: {formatCurrency(loan.principalAmount - loan.paidAmount)}
                              </p>
                            )}
                            {loan.notes && <p className="text-xs text-muted-foreground mt-1">{loan.notes}</p>}
                          </div>
                          <div className="flex flex-col gap-1">
                            {loan.status !== "paid" && (
                              <button
                                onClick={() => markStatus(loan, "paid")}
                                className="text-xs px-2 py-1 rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />Paid
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteId(loan.id)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors self-end"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loanRecords.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="text-muted-foreground">No records yet.</p>
            <Button onClick={() => setFormOpen(true)}>Add First Record</Button>
          </CardContent>
        </Card>
      )}

      <AddLoanDialog open={formOpen} onClose={() => setFormOpen(false)} onAdd={addLoan} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>This loan record will be permanently deleted.</AlertDialogDescription>
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

function AddLoanDialog({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (l: Omit<import("@/types").LoanRecord, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [personName, setPersonName] = useState("");
  const [direction, setDirection] = useState<"given" | "received">("given");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!personName.trim()) { setError("Person name is required"); return; }
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    await onAdd({
      personName: personName.trim(),
      direction,
      principalAmount: amt,
      paidAmount: 0,
      date,
      notes: notes.trim() || undefined,
      status: "pending",
      relatedTransactionIds: [],
    });
    toast.success("Loan record added");
    setPersonName(""); setAmount(""); setNotes(""); setError("");
    onClose();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Loan Record</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1">
            <Label>Person Name *</Label>
            <Input placeholder="e.g. Rahul, Ankit" value={personName} onChange={(e) => setPersonName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Direction *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["given", "received"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    direction === d ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {d === "given" ? "💸 I Gave" : "💰 I Received"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
