import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TrialBanner } from "@/components/trial-banner";
import { WelcomeModal } from "@/components/welcome-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50/80">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <TrialBanner />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <WelcomeModal />
    </div>
  );
}
