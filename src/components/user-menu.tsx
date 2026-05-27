"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu({ email }: { email: string | null }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 leading-tight">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="truncate text-xs font-medium" title={email ?? ""}>
          {email ?? "(no email)"}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={signOut}
        disabled={signingOut}
        title="Sign out"
      >
        {signingOut ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
      </Button>
    </div>
  );
}
