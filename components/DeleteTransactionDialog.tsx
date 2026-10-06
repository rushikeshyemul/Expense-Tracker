"use client";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import type { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export function DeleteTransactionDialog({ transaction, onClose }: Props) {
  const { removeTransaction } = useStore();

  async function handleDelete() {
    await removeTransaction(transaction.id);
    toast.success("Transaction deleted");
    onClose();
  }

  return (
    <AlertDialog open onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <strong>{transaction.description}</strong> ({formatCurrency(transaction.amount)})?
            This action cannot be undone and will update all totals.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
