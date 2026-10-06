import { AppLayout } from "@/components/AppLayout";
import { BudgetsPage } from "@/features/budgets/BudgetsPage";

export default function Page() {
  return (
    <AppLayout>
      <BudgetsPage />
    </AppLayout>
  );
}
