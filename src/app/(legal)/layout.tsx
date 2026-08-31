import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-4">
          <Link href="/login" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              J
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">JobHawk</div>
              <div className="text-xs text-muted-foreground">AI Career Coach</div>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
