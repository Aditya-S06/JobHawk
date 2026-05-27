"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileUp, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadResumePdf } from "@/lib/resume-parse-client";
import type { ResumeMeta } from "@/lib/resume-storage";

interface ResumeUploadProps {
  meta: ResumeMeta;
  hasMarkdown: boolean;
  onParsed: (markdown: string, fileName: string) => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function ResumeUpload({
  meta,
  hasMarkdown,
  onParsed,
  onRemove,
  compact = false,
}: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setParsing(true);
    try {
      const { markdown, fileName } = await uploadResumePdf(file);
      onParsed(markdown, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  const showPdfStatus = meta.source === "pdf" && meta.fileName && hasMarkdown && !parsing;

  if (showPdfStatus) {
    return (
      <div
        className={
          compact
            ? "rounded-md border bg-muted/40 px-3 py-2 space-y-2"
            : "rounded-lg border bg-muted/30 p-4 space-y-3"
        }
      >
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-green-600 shrink-0" />
          <span className="font-medium">{meta.fileName} uploaded</span>
        </div>
        {meta.uploadedAt && !compact && (
          <p className="text-xs text-muted-foreground">
            Converted {new Date(meta.uploadedAt).toLocaleString()}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={parsing}
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw className="size-3.5" />
            Replace PDF
          </Button>
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          )}
          {compact && (
            <Link
              href="/resume"
              className="inline-flex h-8 items-center text-sm text-primary underline-offset-4 hover:underline"
            >
              Edit on My Resume
            </Link>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onInputChange}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onInputChange}
      />
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={compact ? "w-full" : "w-full sm:w-auto"}
        disabled={parsing}
        onClick={() => inputRef.current?.click()}
      >
        {parsing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Converting resume…
          </>
        ) : (
          <>
            <FileUp className="size-4" />
            Upload PDF
          </>
        )}
      </Button>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          PDF is converted to markdown via Gemini and stored locally for tailoring. Max 5 MB.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
