import { AppLayout } from "@/components/AppLayout";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";

export default function Page() {
  return (
    <AppLayout>
      <TransactionsPage />
    </AppLayout>
  );
}
