import { AppLayout } from "@/components/AppLayout";
import { SettingsPage } from "@/features/settings/SettingsPage";

export default function Page() {
  return (
    <AppLayout>
      <SettingsPage />
    </AppLayout>
  );
}
