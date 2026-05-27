"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FileText,
  Sparkles,
  KanbanSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/search", label: "Search Jobs", icon: Briefcase },
  { href: "/resume", label: "My Resume", icon: FileText },
  { href: "/coach", label: "AI Coach Workspace", icon: Sparkles },
  { href: "/tracker", label: "Application Tracker", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 border-b">
        <Link href="/search" className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            J
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">JobHawk</div>
            <div className="text-xs text-muted-foreground">AI Career Coach</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <UserMenu email={userEmail} />
      </div>
    </aside>
  );
}
