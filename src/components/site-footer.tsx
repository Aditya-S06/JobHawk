import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex items-center justify-center gap-3 py-4 text-xs text-muted-foreground",
        className,
      )}
    >
      <Link href="/privacy" className="hover:underline">
        Privacy
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms" className="hover:underline">
        Terms
      </Link>
    </footer>
  );
}
