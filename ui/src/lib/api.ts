import type {
  ChatOpenRequest,
  ChatOpenResponse,
  ConcordanceResponse,
  OllamaModelsResponse,
  HealthResponse,
  KnowledgeBaseDocument,
  KnowledgeBaseJob,
  KeywordResponse,
  Period,
  ReadyResponse,
  ScopeInfo,
  SemanticSearchRequest,
  SemanticSearchResponse,
  StylisticsLiteResponse,
  SynthesizeRequest,
  SynthesizeResponse,
  TrayItemCreate,
  TrayItemRead,
  TrayRead,
  WorkListItem,
} from "@/types";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(endpoint, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body?.detail === "string") message = body.detail;
      else if (body?.detail != null) message = JSON.stringify(body.detail);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: () => fetchAPI<HealthResponse>("/health"),
  getReady: () => fetchAPI<ReadyResponse>("/health/ready"),

  // Periods / scope
  getPeriods: () => fetchAPI<Period[]>("/api/periods"),
  getScope: (periodId: number | null, soft: boolean) => {
    const params = new URLSearchParams();
    if (periodId != null) params.set("period_id", String(periodId));
    params.set("soft", String(soft));
    return fetchAPI<ScopeInfo>(`/api/periods/scope?${params.toString()}`);
  },

  // Works
  getWorks: (periodId: number | null, soft: boolean) => {
    const params = new URLSearchParams();
    if (periodId != null) params.set("period_id", String(periodId));
    params.set("soft", String(soft));
    return fetchAPI<WorkListItem[]>(`/api/works?${params.toString()}`);
  },
  getStylistics: (workId: number) => fetchAPI<StylisticsLiteResponse>(`/api/works/${workId}/stylistics`),

  // Search tools
  getConcordance: (query: string, periodId: number | null, soft: boolean, context: number) => {
    const params = new URLSearchParams();
    params.set("q", query);
    if (periodId != null) params.set("period_id", String(periodId));
    params.set("soft", String(soft));
    params.set("context", String(context));
    return fetchAPI<ConcordanceResponse>(`/api/search/concordance?${params.toString()}`);
  },
  getKeywords: (periodId: number | null, soft: boolean, limit: number) => {
    const params = new URLSearchParams();
    if (periodId != null) params.set("period_id", String(periodId));
    params.set("soft", String(soft));
    params.set("limit", String(limit));
    return fetchAPI<KeywordResponse>(`/api/search/keywords?${params.toString()}`);
  },
  postSemantic: (body: SemanticSearchRequest) =>
    fetchAPI<SemanticSearchResponse>("/api/search/semantic", { method: "POST", body: JSON.stringify(body) }),

  // Evidence tray
  createTray: () => fetchAPI<TrayRead>("/api/evidence-tray", { method: "POST" }),
  getTray: (trayId: string) => fetchAPI<TrayRead>(`/api/evidence-tray/${trayId}`),
  addTrayItem: (trayId: string, item: TrayItemCreate) =>
    fetchAPI<TrayItemRead>(`/api/evidence-tray/${trayId}/items`, { method: "POST", body: JSON.stringify(item) }),
  deleteTrayItem: (trayId: string, trayItemId: string) =>
    fetchAPI<void>(`/api/evidence-tray/${trayId}/items/${trayItemId}`, { method: "DELETE" }),

  // Synthesis
  synthesize: (body: SynthesizeRequest) =>
    fetchAPI<SynthesizeResponse>("/api/analysis/synthesize", { method: "POST", body: JSON.stringify(body) }),

  // Ollama
  getOllamaModels: () => fetchAPI<OllamaModelsResponse>("/api/ollama/models"),

  // Open (ungrounded) chat
  postChatOpen: (body: ChatOpenRequest) =>
    fetchAPI<ChatOpenResponse>("/api/chat/open", { method: "POST", body: JSON.stringify(body) }),

  // Knowledge Base (documents)
  listDocuments: () => fetchAPI<KnowledgeBaseDocument[]>("/api/documents"),
  getDocumentJob: (jobId: string) => fetchAPI<KnowledgeBaseJob>(`/api/documents/jobs/${jobId}`),
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
    if (!response.ok) throw new Error(response.statusText);
    return (await response.json()) as { job_id: string; filename: string; document_id: string };
  },
  ingestDocument: (docId: string) =>
    fetchAPI<{ job_id: string; filename: string; document_id: string }>(`/api/documents/ingest?doc_id=${encodeURIComponent(docId)}`, {
      method: "POST",
    }),
};

