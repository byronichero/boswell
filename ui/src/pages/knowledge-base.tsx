import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { KnowledgeBaseDocument, KnowledgeBaseJob, KnowledgeBaseSearchHit } from "@/types";

/** Matches backend default `max_upload_bytes` when env is unset. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchHits, setSearchHits] = useState<KnowledgeBaseSearchHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  /** Query string of the last successful search (for empty-state messaging). */
  const [lastSearchOk, setLastSearchOk] = useState<string | null>(null);

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
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File exceeds maximum size (${formatBytes(MAX_UPLOAD_BYTES)}).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const key = file.name.trim().toLowerCase();
    if (documents.some((d) => d.name.trim().toLowerCase() === key)) {
      setError(`A document named "${file.name}" already exists.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadStatus(`Uploading ${file.name}…`);
    setIngestStatus(null);
    try {
      const res = await api.uploadDocument(file);
      setUploadStatus(`Queued ${res.filename}. Waiting for storage…`);
      setJob({ job_id: res.job_id, filename: res.filename, status: "pending", kind: "upload" });
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
      setJob({ job_id: res.job_id, filename: res.filename, status: "pending", kind: "ingest" });
      setIngestStatus(`Job started: ${res.filename}`);
    } catch (e) {
      setIngestStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runSearch(): Promise<void> {
    const q = searchQuery.trim();
    if (!q) {
      setSearchError("Enter a search query.");
      return;
    }
    setSearchError(null);
    setSearchLoading(true);
    setLastSearchOk(null);
    try {
      const res = await api.searchKnowledgeBase(q, 15);
      setSearchHits(res.hits);
      setLastSearchOk(q);
    } catch (e) {
      setSearchHits([]);
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearchLoading(false);
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
          onClick={() =>
            window.open(`/api/documents/preview-html?doc_id=${encodeURIComponent(doc.id)}`, "_blank")
          }
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
        title="Run Ingest first to enable preview for this type (PDF uses inline preview; text uses HTML preview)."
      >
        Preview
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              Files go to MinIO; the upload job finishes when storage is ready—poll the job until it
              completes. Max {formatBytes(MAX_UPLOAD_BYTES)} per file. Duplicate names are rejected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose file
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
                {isLoading ? "Refreshing…" : "Refresh list"}
              </Button>
            </div>
            {uploadStatus && <div className="text-sm text-muted-foreground">{uploadStatus}</div>}
            {ingestStatus && <div className="text-sm text-muted-foreground">{ingestStatus}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semantic search</CardTitle>
            <CardDescription>
              Vector search over indexed chunks (corpus works and ingested uploads). Requires Ollama
              embeddings and Qdrant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch();
                }}
                className="sm:flex-1"
              />
              <Button onClick={() => void runSearch()} disabled={searchLoading}>
                {searchLoading ? "Searching…" : "Search"}
              </Button>
            </div>
            {searchError && <div className="text-sm text-destructive">{searchError}</div>}
            {searchHits.length > 0 && (
              <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
                {searchHits.map((h, i) => (
                  <li key={`${h.work_id}-${h.chunk_index}-${i}`} className="rounded-md border bg-muted/20 p-2">
                    <div className="font-medium text-foreground">
                      {h.work_title}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (work {h.work_id}, score {h.score.toFixed(3)})
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{h.text}</p>
                  </li>
                ))}
              </ul>
            )}
            {!searchLoading &&
              lastSearchOk === searchQuery.trim() &&
              searchHits.length === 0 &&
              !searchError && (
                <div className="text-sm text-muted-foreground">No hits.</div>
              )}
          </CardContent>
        </Card>
      </div>

      {job && (
        <div className="rounded-md border bg-muted/20 p-3 text-sm">
          <div className="font-medium">
            Job: {job.filename}
            {job.kind ? ` (${job.kind})` : ""}
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Preview, download, export markdown, and ingest into Qdrant.</CardDescription>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`/api/documents/download-md?doc_id=${encodeURIComponent(d.id)}`, "_blank")
                      }
                    >
                      Download MD
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
