"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResult } from "@/types";

type Provider = "serpapi" | "gemini" | "notion" | "notion_data_source";

interface ProviderConfig {
  id: Provider;
  label: string;
  helper: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "serpapi",
    label: "SerpApi key",
    helper: "Used for Google Jobs search. https://serpapi.com",
  },
  {
    id: "gemini",
    label: "Gemini API key",
    helper: "Used for resume tailoring & PDF parsing. https://aistudio.google.com",
  },
  {
    id: "notion",
    label: "Notion integration token",
    helper: "Optional. Used to sync your tracker.",
  },
  {
    id: "notion_data_source",
    label: "Notion data source ID",
    helper: "Optional. Your Notion job database/data-source ID.",
  },
];

type StatusMap = Record<Provider, boolean>;

const EMPTY_STATUS: StatusMap = {
  serpapi: false,
  gemini: false,
  notion: false,
  notion_data_source: false,
};

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusMap>(EMPTY_STATUS);
  const [drafts, setDrafts] = useState<Record<Provider, string>>({
    serpapi: "",
    gemini: "",
    notion: "",
    notion_data_source: "",
  });
  const [savingId, setSavingId] = useState<Provider | null>(null);
  const [savedId, setSavedId] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/user/keys");
        const json = (await res.json()) as ApiResult<StatusMap>;
        if (json.success) setStatus(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(provider: Provider) {
    const value = drafts[provider];
    setSavingId(provider);
    setError(null);
    try {
      const res = await fetch("/api/user/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, value }),
      });
      const json = (await res.json()) as ApiResult<{ provider: Provider; set: boolean }>;
      if (!json.success) {
        setError(json.error);
        return;
      }
      setStatus((s) => ({ ...s, [provider]: json.data.set }));
      setDrafts((d) => ({ ...d, [provider]: "" }));
      setSavedId(provider);
      window.setTimeout(() => setSavedId(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Bring your own API keys. Values are encrypted at rest. Leave a field
          blank to clear a saved key.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : (
            PROVIDERS.map((p) => {
              const isSet = status[p.id];
              const isSaving = savingId === p.id;
              const justSaved = savedId === p.id;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={p.id}>{p.label}</Label>
                    {isSet && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3" /> Set
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.helper}</p>
                  <div className="flex gap-2">
                    <Input
                      id={p.id}
                      type="password"
                      autoComplete="off"
                      placeholder={isSet ? "•••••••••••• (saved)" : "Paste value"}
                      value={drafts[p.id]}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      onClick={() => save(p.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {justSaved ? "Saved" : "Save"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
