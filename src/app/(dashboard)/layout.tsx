import { SidebarNav } from "@/components/sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <SidebarNav />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
