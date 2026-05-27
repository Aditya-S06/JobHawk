"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResult, TailorResponse, TrackedJob } from "@/types";
import { loadTracked } from "@/lib/saved-jobs";
import { ResumeUpload } from "@/components/resume-upload";
import {
  loadResume,
  saveResume,
  type ResumeMeta,
} from "@/lib/resume-storage";

interface ChatMessage {
  role: "coach" | "user";
  content: string;
}

const INITIAL_CHAT: ChatMessage[] = [
  {
    role: "coach",
    content:
      "Paste a job description on the right, then click **Tailor Resume**. I'll rewrite your master resume for ATS and explain my edits below.",
  },
];

export default function CoachPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tailored, setTailored] = useState<TailorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatDraft, setChatDraft] = useState("");
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta>({ source: "markdown" });

  useEffect(() => {
    void loadResume()
      .then((r) => {
        setResumeText(r.rawText);
        setResumeMeta(r.meta);
      })
      .catch(() => undefined);
    void loadTracked()
      .then(setTrackedJobs)
      .catch(() => setTrackedJobs([]));
  }, []);

  function handleResumeParsed(markdown: string, fileName: string) {
    const meta: ResumeMeta = {
      source: "pdf",
      fileName,
      uploadedAt: new Date().toISOString(),
    };
    setResumeText(markdown);
    setResumeMeta(meta);
    void saveResume(markdown, meta).catch(() => undefined);
  }

  function handleJobSelect(id: string) {
    setSelectedJobId(id);
    if (!id) return;
    const job = trackedJobs.find((j) => j.id === id);
    if (!job) return;
    if (job.description && job.description.trim()) {
      setJobDescription(job.description);
    } else {
      setJobDescription("");
      setError(
        `"${job.title}" at ${job.company} was saved before descriptions were stored. Re-save it from the Search page, or paste the description manually.`,
      );
    }
  }

  async function runTailor() {
    setLoading(true);
    setError(null);
    setTailored(null);
    try {
      const res = await fetch("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const json = (await res.json()) as ApiResult<TailorResponse>;
      if (!json.success) {
        setError(json.error);
      } else {
        setTailored(json.data);
        setMessages((m) => [
          ...m,
          {
            role: "coach",
            content:
              "I tailored your resume. Review the right pane. Here's the gap analysis:\n\n" +
              json.data.gapAnalysis.map((g) => `- ${g}`).join("\n"),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function sendChat() {
    const trimmed = chatDraft.trim();
    if (!trimmed) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: trimmed },
      {
        role: "coach",
        content:
          "Streaming chat is wired in a future iteration. For now, use Tailor Resume to get strategic edits.",
      },
    ]);
    setChatDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-8 py-5 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">AI Coach Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Recruiter coach on the left. Live tailored resume on the right.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Left: chat + tailor controls */}
        <section className="flex flex-col border-r overflow-hidden min-h-0">
          <div className="shrink-0 max-h-40 overflow-y-auto px-6 py-3">
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={
                    msg.role === "coach"
                      ? "rounded-lg bg-muted px-4 py-3 text-sm whitespace-pre-wrap"
                      : "rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm ml-8 whitespace-pre-wrap"
                  }
                >
                  {msg.content}
                </div>
              ))}
              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-card">
            <div className="space-y-1.5">
              <Label className="text-xs">Resume (from My Resume)</Label>
              <ResumeUpload
                meta={resumeMeta}
                hasMarkdown={Boolean(resumeText.trim())}
                onParsed={handleResumeParsed}
                compact
              />
              {!resumeText.trim() && resumeMeta.source !== "pdf" && (
                <p className="text-xs text-muted-foreground">
                  Upload a PDF above or add your resume on the My Resume page.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="jd" className="text-xs">Target Job Description</Label>
                <select
                  aria-label="Load from saved jobs"
                  value={selectedJobId}
                  onChange={(e) => {
                    setError(null);
                    handleJobSelect(e.target.value);
                  }}
                  disabled={trackedJobs.length === 0}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs max-w-[60%] truncate disabled:opacity-50"
                >
                  <option value="">
                    {trackedJobs.length === 0
                      ? "No saved jobs"
                      : "Load from saved jobs..."}
                  </option>
                  {trackedJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (selectedJobId) setSelectedJobId("");
                }}
                placeholder="Paste the job description, or load one from your tracker above..."
                className="field-sizing-fixed h-32 min-h-32 max-h-32 resize-none overflow-y-auto text-xs"
              />
            </div>
            <Button
              onClick={runTailor}
              disabled={loading || !resumeText.trim() || !jobDescription.trim()}
              className="w-full"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Tailoring..." : "Tailor Resume"}
            </Button>

            <Separator />

            <div className="flex gap-2">
              <Textarea
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Ask the coach a question..."
                className="field-sizing-fixed min-h-10 max-h-24 resize-none overflow-y-auto text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <Button type="button" size="icon" onClick={sendChat}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Right: live tailored resume markdown viewer */}
        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-8 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tailored Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  {tailored ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{tailored.tailoredResume}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your tailored resume will render here once the coach finishes.
                    </p>
                  )}
                </CardContent>
              </Card>

              {tailored && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Why these edits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm list-disc pl-5">
                      {tailored.justification.map((j, i) => (
                        <li key={i}>{j}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {tailored && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Gap Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm list-disc pl-5">
                      {tailored.gapAnalysis.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
