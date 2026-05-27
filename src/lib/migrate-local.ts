import {
  clearLegacyLocalResume,
  loadResume,
  readLegacyLocalResume,
  saveResume,
} from "@/lib/resume-storage";
import {
  clearLegacyLocalTracked,
  loadTracked,
  readLegacyLocalTracked,
  upsertTracked,
} from "@/lib/saved-jobs";

const FLAG_PREFIX = "jobhawk:migrated:";

/**
 * One-time migration of legacy localStorage data into Supabase.
 * Called from the dashboard layout on first mount per user.
 *
 * Migrates:
 *   jobhawk:resume + jobhawk:resume-meta -> resumes table
 *   jobhawk:tracked                       -> jobs table
 *
 * Does NOT touch jobhawk:search-cache (intentionally stays local — it's just
 * a SerpApi quota saver, not user data).
 */
export async function migrateLocalToServer(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const flagKey = `${FLAG_PREFIX}${userId}`;
  if (window.localStorage.getItem(flagKey)) return;

  try {
    // Resume
    const legacyResume = readLegacyLocalResume();
    if (legacyResume && legacyResume.rawText.trim().length > 0) {
      const server = await loadResume().catch(() => null);
      if (!server || !server.rawText.trim()) {
        await saveResume(legacyResume.rawText, legacyResume.meta);
      }
      clearLegacyLocalResume();
    }

    // Tracked jobs
    const legacyTracked = readLegacyLocalTracked();
    if (legacyTracked && legacyTracked.length > 0) {
      const server = await loadTracked().catch(() => [] as typeof legacyTracked);
      const seen = new Set(server.map((j) => j.id));
      for (const job of legacyTracked) {
        if (!seen.has(job.id)) {
          await upsertTracked(job).catch(() => undefined);
        }
      }
      clearLegacyLocalTracked();
    }

    window.localStorage.setItem(flagKey, new Date().toISOString());
  } catch {
    // Migration is best-effort. Don't block the UI on failure; user can
    // re-paste resume and re-save jobs manually.
  }
}
