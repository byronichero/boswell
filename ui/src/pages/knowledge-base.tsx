import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { KnowledgeBaseDocument, KnowledgeBaseJob } from "@/types";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [job, setJob] = useState<KnowledgeBaseJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!job) return;
    if (job.status !== "pending" && job.status !== "running") return;

    const interval = setInterval(async () => {
      try {
        const next = await api.getDocumentJob(job.job_id);
        setJob(next);
        if (next.status === "completed" || next.status === "failed") {
          clearInterval(interval);
          void load();
        }
      } catch {
        // ignore polling errors
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [job]);

  async function onUploadFile(file: File): Promise<void> {
    setUploadStatus(`Uploading ${file.name}…`);
    setIngestStatus(null);
    try {
      const res = await api.uploadDocument(file);
      setUploadStatus(`Uploaded ${res.filename}.`);
      setJob({ job_id: res.job_id, filename: res.filename, status: "completed" });
      await load();
    } catch (e) {
      setUploadStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function ingest(doc: KnowledgeBaseDocument): Promise<void> {
    setIngestStatus(`Indexing ${doc.name}…`);
    setError(null);
    try {
      const res = await api.ingestDocument(doc.id);
      setJob({ job_id: res.job_id, filename: res.filename, status: "pending" });
      setIngestStatus(`Job started: ${res.filename}`);
    } catch (e) {
      setIngestStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function renderPreviewButton(doc: KnowledgeBaseDocument): JSX.Element {
    const name = doc.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            window.open(`/api/documents/download?doc_id=${encodeURIComponent(doc.id)}&inline=1`, "_blank")
          }
        >
          Preview
        </Button>
      );
    }

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/documents/preview?doc_id=${encodeURIComponent(doc.id)}`, "_blank")}
        >
          Preview
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Preview not supported for this type (PDF uses inline preview; other formats ingest fine via Docling)."
      >
        Preview
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            Upload documents to MinIO. Ingesting a document creates a Work and indexes chunks into Qdrant (Memgraph is best-effort).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Upload
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUploadFile(f);
              }}
              accept=".txt,.md,.markdown,.pdf,.docx"
            />
            <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
              {isLoading ? "Refreshing…" : "Refresh"}
            </Button>
            <div className="text-xs text-muted-foreground">MVP ingest supports .txt/.md</div>
          </div>

          {uploadStatus && <div className="text-sm text-muted-foreground">{uploadStatus}</div>}
          {ingestStatus && <div className="text-sm text-muted-foreground">{ingestStatus}</div>}
          {job && (
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="font-medium">Job: {job.filename}</div>
              <div className="text-muted-foreground">
                status={job.status}
                {job.chunks != null && ` · chunks=${job.chunks}`}
                {job.work_id != null && ` · work_id=${job.work_id}`}
              </div>
              {job.error && <div className="mt-1 text-destructive">{job.error}</div>}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded files available for preview/download and ingestion.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && documents.length === 0 && (
            <div className="text-sm text-muted-foreground">No documents yet.</div>
          )}
          {!isLoading && documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{d.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatBytes(d.size_bytes)} · {d.content_type} · {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {renderPreviewButton(d)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`/api/documents/download?doc_id=${encodeURIComponent(d.id)}`, "_blank")
                      }
                    >
                      Download
                    </Button>
                    <Button size="sm" onClick={() => void ingest(d)}>
                      Ingest
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

