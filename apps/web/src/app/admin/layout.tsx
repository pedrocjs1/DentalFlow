import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dentiqa Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-950 text-white min-h-screen antialiased">{children}</div>;
}
