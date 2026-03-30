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

export interface ConcordanceHit {
  work_id: number;
  work_title: string;
  locator: string;
  before: string;
  keyword: string;
  after: string;
}

export interface ConcordanceResponse {
  query: string;
  scope_period_ids: number[];
  hits: ConcordanceHit[];
  total_hits: number;
}

export interface KeywordEntry {
  term: string;
  count: number;
}

export interface KeywordResponse {
  scope_period_ids: number[];
  terms: KeywordEntry[];
}

export interface SemanticHit {
  score: number;
  work_id: number;
  work_title: string;
  chunk_index: number;
  text: string;
  locator: string;
}

export interface SemanticSearchRequest {
  query: string;
  limit: number;
  period_id: number | null;
  soft_scope: boolean;
}

export interface SemanticSearchResponse {
  query: string;
  scope_period_ids: number[];
  hits: SemanticHit[];
}

export interface StylisticsLiteResponse {
  work_id: number;
  title: string;
  char_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  dialogue_line_markers: number;
}

export interface TrayItemCreate {
  work_id: number;
  locator: string;
  excerpt: string;
  note?: string | null;
}

export interface TrayItemRead {
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
  items: TrayItemRead[];
}

export interface SynthesizeRequest {
  tray_id: string;
  question: string;
  period_id?: number | null;
  soft_scope?: boolean;
  model?: string | null;
}

export interface SynthesizeResponse {
  content: string;
  analysis_id: number | null;
  tray_id: string | null;
}

export interface ChatOpenMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOpenRequest {
  messages: ChatOpenMessage[];
  model?: string | null;
}

export interface OllamaModelsResponse {
  models: string[];
}

export interface ChatOpenResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface ReadyResponse {
  status: string;
  dependencies: Record<string, string>;
}

export interface KnowledgeBaseDocument {
  id: string;
  name: string;
  size_bytes: number;
  content_type: string;
  created_at: string;
}

export interface KnowledgeBaseJob {
  job_id: string;
  filename: string;
  status: "pending" | "running" | "completed" | "failed";
  chunks?: number | null;
  work_id?: number | null;
  error?: string | null;
}

