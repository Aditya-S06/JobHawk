"use client";

import { useEffect } from "react";
import { migrateLocalToServer } from "@/lib/migrate-local";

/**
 * Mount-once client component that migrates any legacy localStorage data
 * (resume, tracked jobs) into Supabase for the current user.
 */
export function MigrateLocalStorage({ userId }: { userId: string }) {
  useEffect(() => {
    void migrateLocalToServer(userId);
  }, [userId]);
  return null;
}
