import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { MigrateLocalStorage } from "@/components/migrate-local-storage";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive: middleware should already redirect, but guard at the layout
  // boundary so server data fetching always sees an authenticated user.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full">
      <SidebarNav userEmail={user.email ?? null} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      <MigrateLocalStorage userId={user.id} />
    </div>
  );
}
