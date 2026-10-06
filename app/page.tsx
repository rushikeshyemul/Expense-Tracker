import { AppLayout } from "@/components/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

export default function Home() {
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}
