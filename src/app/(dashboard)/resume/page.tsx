"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResumeUpload } from "@/components/resume-upload";
import {
  loadResume,
  loadResumeMeta,
  saveResume,
  clearResume,
  type ResumeMeta,
} from "@/lib/resume-storage";

export default function ResumePage() {
  const [text, setText] = useState("");
  const [meta, setMeta] = useState<ResumeMeta>({ source: "markdown" });
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setText(loadResume());
    setMeta(loadResumeMeta());
    setHydrated(true);
  }, []);

  function persist(markdown: string, nextMeta: ResumeMeta) {
    setText(markdown);
    setMeta(nextMeta);
    saveResume(markdown, nextMeta);
  }

  function handlePdfParsed(markdown: string, fileName: string) {
    persist(markdown, {
      source: "pdf",
      fileName,
      uploadedAt: new Date().toISOString(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function handleRemove() {
    clearResume();
    setText("");
    setMeta({ source: "markdown" });
  }

  function save() {
    const nextMeta: ResumeMeta =
      meta.source === "pdf"
        ? meta
        : { source: "markdown" };
    persist(text, nextMeta);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  const defaultTab =
    hydrated && (meta.source === "pdf" || !text.trim()) ? "upload" : "edit";

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Resume</h1>
          <p className="text-sm text-muted-foreground">
            Upload a PDF or edit markdown. The AI Coach uses this as the source
            of truth when tailoring.
          </p>
        </div>
        <Button onClick={save}>
          <Save className="size-4" />
          {saved ? "Saved" : "Save"}
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" /> Resume Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} key={defaultTab}>
            <TabsList>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <ResumeUpload
                meta={meta}
                hasMarkdown={Boolean(text.trim())}
                onParsed={handlePdfParsed}
                onRemove={handleRemove}
              />
            </TabsContent>
            <TabsContent value="edit" className="mt-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "# Your Name\n\n**Email** · **GitHub** · **LinkedIn**\n\n## Education\n..."
                }
                className="field-sizing-fixed h-[60vh] min-h-[24rem] max-h-[60vh] resize-none overflow-y-auto font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="min-h-[60vh] rounded-md border bg-card p-6 prose prose-sm dark:prose-invert max-w-none overflow-y-auto">
                {text.trim() ? (
                  <ReactMarkdown>{text}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
