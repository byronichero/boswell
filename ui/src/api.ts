/** Typed fetch helpers for the Boswell API (proxied via Vite to the backend). */

export interface Period {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

export interface ScopeInfo {
  mode: string;
  center_period_id: number | null;
  included_period_ids: number[];
  included_period_names: string[];
}

export interface WorkListItem {
  id: number;
  title: string;
  author: string;
  year: number | null;
  period_id: number | null;
  period_name: string | null;
}

export interface TrayItem {
  tray_item_id: string;
  work_id: number;
  work_title: string;
  author: string;
  period_name: string | null;
  locator: string;
  excerpt: string;
  note: string | null;
  sort_order: number;
}

export interface TrayRead {
  tray_id: string;
  label: string | null;
  items: TrayItem[];
}

const json = async (r: Response) => {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json() as Promise<unknown>;
};

export async function fetchPeriods(): Promise<Period[]> {
  const r = await fetch("/api/periods");
  return json(r) as Promise<Period[]>;
}

export async function fetchScope(periodId: number | null, soft: boolean): Promise<ScopeInfo> {
  const q = new URLSearchParams();
  if (periodId != null) q.set("period_id", String(periodId));
  q.set("soft", soft ? "true" : "false");
  const r = await fetch(`/api/periods/scope?${q}`);
  return json(r) as Promise<ScopeInfo>;
}

export async function fetchWorks(periodId: number | null, soft: boolean): Promise<WorkListItem[]> {
  const q = new URLSearchParams();
  if (periodId != null) q.set("period_id", String(periodId));
  q.set("soft", soft ? "true" : "false");
  const r = await fetch(`/api/works?${q}`);
  return json(r) as Promise<WorkListItem[]>;
}

export async function createTray(): Promise<TrayRead> {
  const r = await fetch("/api/evidence-tray", { method: "POST" });
  return json(r) as Promise<TrayRead>;
}

export async function fetchTray(trayId: string): Promise<TrayRead> {
  const r = await fetch(`/api/evidence-tray/${trayId}`);
  return json(r) as Promise<TrayRead>;
}

export async function addTrayItem(
  trayId: string,
  body: { work_id: number; locator: string; excerpt: string; note?: string | null },
): Promise<TrayItem> {
  const r = await fetch(`/api/evidence-tray/${trayId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json(r) as Promise<TrayItem>;
}

export async function deleteTrayItem(trayId: string, itemId: string): Promise<void> {
  const r = await fetch(`/api/evidence-tray/${trayId}/items/${itemId}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
}

export interface ConcordanceResponse {
  query: string;
  scope_period_ids: number[];
  hits: Array<{
    work_id: number;
    work_title: string;
    locator: string;
    before: string;
    keyword: string;
    after: string;
  }>;
  total_hits: number;
}

export async function fetchConcordance(
  q: string,
  periodId: number | null,
  soft: boolean,
  context: number,
): Promise<ConcordanceResponse> {
  const params = new URLSearchParams({ q, context: String(context) });
  if (periodId != null) params.set("period_id", String(periodId));
  params.set("soft", soft ? "true" : "false");
  const r = await fetch(`/api/search/concordance?${params}`);
  return json(r) as Promise<ConcordanceResponse>;
}

export interface KeywordResponse {
  scope_period_ids: number[];
  terms: Array<{ term: string; count: number }>;
}

export async function fetchKeywords(periodId: number | null, soft: boolean): Promise<KeywordResponse> {
  const params = new URLSearchParams();
  if (periodId != null) params.set("period_id", String(periodId));
  params.set("soft", soft ? "true" : "false");
  const r = await fetch(`/api/search/keywords?${params}`);
  return json(r) as Promise<KeywordResponse>;
}

export interface SemanticResponse {
  query: string;
  scope_period_ids: number[];
  hits: Array<{
    score: number;
    work_id: number;
    work_title: string;
    chunk_index: number;
    text: string;
    locator: string;
  }>;
}

export async function postSemantic(
  query: string,
  periodId: number | null,
  soft: boolean,
  limit: number,
): Promise<SemanticResponse> {
  const r = await fetch("/api/search/semantic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, period_id: periodId, soft_scope: soft, limit }),
  });
  return json(r) as Promise<SemanticResponse>;
}

export interface StylisticsLite {
  work_id: number;
  title: string;
  char_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  dialogue_line_markers: number;
}

export async function fetchStylistics(workId: number): Promise<StylisticsLite> {
  const r = await fetch(`/api/works/${workId}/stylistics-lite`);
  return json(r) as Promise<StylisticsLite>;
}

export async function postSynthesize(trayId: string, question: string): Promise<{ content: string; analysis_id: number | null }> {
  const r = await fetch("/api/analysis/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tray_id: trayId, question }),
  });
  return json(r) as Promise<{ content: string; analysis_id: number | null }>;
}
