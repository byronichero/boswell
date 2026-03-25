import { useCallback, useEffect, useState } from "react";
import {
  type LucideIcon,
  BarChart3,
  Library,
  ListTree,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";

import {
  addTrayItem,
  createTray,
  deleteTrayItem,
  fetchConcordance,
  fetchKeywords,
  fetchPeriods,
  fetchScope,
  fetchStylistics,
  fetchTray,
  fetchWorks,
  postSemantic,
  postSynthesize,
  type Period,
  type ScopeInfo,
  type TrayItem,
  type TrayRead,
  type WorkListItem,
} from "./api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Tab = "browse" | "concordance" | "keywords" | "semantic" | "stylistics" | "synthesize";

const TRAY_KEY = "boswell_tray_id";

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "browse", label: "Corpus", icon: Library },
  { id: "concordance", label: "Concordance", icon: Search },
  { id: "keywords", label: "Keywords", icon: ListTree },
  { id: "semantic", label: "Semantic", icon: Sparkles },
  { id: "stylistics", label: "Stylistics", icon: BarChart3 },
  { id: "synthesize", label: "Synthesize", icon: MessageSquare },
];

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function App() {
  const [tab, setTab] = useState<Tab>("browse");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [soft, setSoft] = useState(true);
  const [scope, setScope] = useState<ScopeInfo | null>(null);
  const [works, setWorks] = useState<WorkListItem[]>([]);
  const [tray, setTray] = useState<TrayRead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [concQuery, setConcQuery] = useState("thee");
  const [concCtx, setConcCtx] = useState(40);
  const [concResult, setConcResult] = useState<Awaited<ReturnType<typeof fetchConcordance>> | null>(null);

  const [kwResult, setKwResult] = useState<Awaited<ReturnType<typeof fetchKeywords>> | null>(null);

  const [semQuery, setSemQuery] = useState("summer's day");
  const [semResult, setSemResult] = useState<Awaited<ReturnType<typeof postSemantic>> | null>(null);

  const [styleWorkId, setStyleWorkId] = useState<number | null>(null);
  const [styleResult, setStyleResult] = useState<Awaited<ReturnType<typeof fetchStylistics>> | null>(null);

  const [question, setQuestion] = useState(
    "What images connect love to natural cycles in the evidence?",
  );
  const [synthOut, setSynthOut] = useState<string | null>(null);

  const loadScope = useCallback(async () => {
    const s = await fetchScope(periodId, soft);
    setScope(s);
  }, [periodId, soft]);

  const loadWorks = useCallback(async () => {
    const w = await fetchWorks(periodId, soft);
    setWorks(w);
  }, [periodId, soft]);

  const ensureTray = useCallback(async () => {
    let id = localStorage.getItem(TRAY_KEY);
    if (id) {
      try {
        const t = await fetchTray(id);
        setTray(t);
        return;
      } catch {
        localStorage.removeItem(TRAY_KEY);
      }
    }
    const t = await createTray();
    localStorage.setItem(TRAY_KEY, t.tray_id);
    setTray(t);
  }, []);

  useEffect(() => {
    fetchPeriods()
      .then(setPeriods)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    loadScope().catch((e: Error) => setError(e.message));
  }, [loadScope]);

  useEffect(() => {
    loadWorks().catch((e: Error) => setError(e.message));
  }, [loadWorks]);

  useEffect(() => {
    if (works.length > 0 && styleWorkId == null) {
      setStyleWorkId(works[0].id);
    }
  }, [works, styleWorkId]);

  useEffect(() => {
    ensureTray().catch((e: Error) => setError(e.message));
  }, [ensureTray]);

  async function runConcordance() {
    setError(null);
    try {
      const r = await fetchConcordance(concQuery, periodId, soft, concCtx);
      setConcResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runKeywords() {
    setError(null);
    try {
      const r = await fetchKeywords(periodId, soft);
      setKwResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runSemantic() {
    setError(null);
    try {
      const r = await postSemantic(semQuery, periodId, soft, 10);
      setSemResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runStylistics() {
    if (styleWorkId == null) return;
    setError(null);
    try {
      const r = await fetchStylistics(styleWorkId);
      setStyleResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runSynthesize() {
    if (!tray?.tray_id) return;
    setError(null);
    try {
      const r = await postSynthesize(tray.tray_id, question);
      setSynthOut(r.content);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addToTray(workId: number, locator: string, excerpt: string) {
    if (!tray?.tray_id) return;
    setError(null);
    try {
      await addTrayItem(tray.tray_id, { work_id: workId, locator, excerpt });
      const updated = await fetchTray(tray.tray_id);
      setTray(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeItem(itemId: string) {
    if (!tray?.tray_id) return;
    await deleteTrayItem(tray.tray_id, itemId);
    const updated = await fetchTray(tray.tray_id);
    setTray(updated);
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar — Richelieu-style rail */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-secondary text-secondary-foreground">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-md">
            B
          </div>
          <div className="min-w-0">
            <div className="font-serif text-lg font-bold leading-tight tracking-tight">Boswell</div>
            <p className="truncate text-xs text-muted-foreground">Literary analysis</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-secondary-foreground hover:bg-muted/80",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          Evidence-grounded synthesis · NLTK-style workflow
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div>
            <h1 className="font-serif text-lg font-semibold text-foreground">Workspace</h1>
            <p className="text-xs text-muted-foreground">Browse the corpus, collect evidence, synthesize.</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            {error && (
              <Card className="mb-6 border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
              </Card>
            )}

            <Card className="mb-6 border-primary/20 bg-primary/[0.03]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Period scope</CardTitle>
                <CardDescription>
                  Soft mode includes neighboring periods (visible below). Hard filter comes later.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Period</label>
                  <select
                    className={selectClass}
                    value={periodId ?? ""}
                    onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All periods</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={soft}
                    onChange={(e) => setSoft(e.target.checked)}
                  />
                  Soft (neighbors)
                </label>
                {scope && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Including: </span>
                    {scope.included_period_names.join(", ") || "(none)"}
                  </p>
                )}
              </CardContent>
            </Card>

            {tab === "browse" && (
              <Card>
                <CardHeader>
                  <CardTitle>Works in scope</CardTitle>
                  <CardDescription>Corpus browse — titles and periods in the current filter.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                          <th className="p-3 font-medium">Title</th>
                          <th className="p-3 font-medium">Author</th>
                          <th className="p-3 font-medium">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {works.map((w) => (
                          <tr key={w.id} className="border-b border-border/80 hover:bg-muted/30">
                            <td className="p-3 font-medium">{w.title}</td>
                            <td className="p-3">{w.author}</td>
                            <td className="p-3 text-muted-foreground">{w.period_name ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {tab === "concordance" && (
              <Card>
                <CardHeader>
                  <CardTitle>Concordance (KWIC)</CardTitle>
                  <CardDescription>Keyword in context — add lines to the Evidence tray.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px] flex-1 space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Keyword</label>
                      <Input value={concQuery} onChange={(e) => setConcQuery(e.target.value)} />
                    </div>
                    <div className="w-24 space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Context</label>
                      <Input
                        type="number"
                        min={5}
                        max={200}
                        value={concCtx}
                        onChange={(e) => setConcCtx(Number(e.target.value))}
                      />
                    </div>
                    <Button type="button" onClick={() => void runConcordance()}>
                      Search
                    </Button>
                  </div>
                  {concResult && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {concResult.total_hits} hits (showing up to 200)
                      </p>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="p-2 text-left font-medium text-muted-foreground">Work</th>
                              <th className="p-2 text-left font-medium text-muted-foreground">Context</th>
                              <th className="p-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {concResult.hits.map((h, i) => (
                              <tr key={`${h.work_id}-${i}`} className="border-b border-border/60 hover:bg-muted/20">
                                <td className="p-2 align-top font-medium">{h.work_title}</td>
                                <td className="p-2 font-mono text-xs leading-relaxed">
                                  …{h.before}
                                  <mark className="bg-accent/25 text-foreground">{h.keyword}</mark>
                                  {h.after}…
                                </td>
                                <td className="p-2 align-top">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      void addToTray(
                                        h.work_id,
                                        h.locator,
                                        `${h.before}${h.keyword}${h.after}`.trim(),
                                      )
                                    }
                                  >
                                    Add
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "keywords" && (
              <Card>
                <CardHeader>
                  <CardTitle>Keywords</CardTitle>
                  <CardDescription>Frequency-style counts (English stopwords removed).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="button" variant="secondary" onClick={() => void runKeywords()}>
                    Refresh frequencies
                  </Button>
                  {kwResult && (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="p-3 text-left font-medium">Term</th>
                            <th className="p-3 text-left font-medium">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kwResult.terms.map((t) => (
                            <tr key={t.term} className="border-b border-border/60 hover:bg-muted/20">
                              <td className="p-3">{t.term}</td>
                              <td className="p-3 tabular-nums">{t.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "semantic" && (
              <Card>
                <CardHeader>
                  <CardTitle>Semantic search</CardTitle>
                  <CardDescription>Requires Ollama embeddings and Qdrant index (run init_data).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Input
                      className="max-w-xl flex-1"
                      value={semQuery}
                      onChange={(e) => setSemQuery(e.target.value)}
                    />
                    <Button type="button" onClick={() => void runSemantic()}>
                      Search
                    </Button>
                  </div>
                  {semResult && (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="p-2 text-left font-medium text-muted-foreground">Score</th>
                            <th className="p-2 text-left font-medium text-muted-foreground">Work</th>
                            <th className="p-2 text-left font-medium text-muted-foreground">Excerpt</th>
                            <th className="p-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {semResult.hits.map((h, i) => (
                            <tr key={`${h.work_id}-${h.chunk_index}-${i}`} className="border-b border-border/60">
                              <td className="p-2 tabular-nums text-muted-foreground">{h.score.toFixed(3)}</td>
                              <td className="p-2 font-medium">{h.work_title}</td>
                              <td className="p-2 font-mono text-xs">{h.text.slice(0, 400)}</td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void addToTray(h.work_id, h.locator, h.text)}
                                >
                                  Add
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "stylistics" && (
              <Card>
                <CardHeader>
                  <CardTitle>Stylistics (lite)</CardTitle>
                  <CardDescription>Observational metrics — not full stylometry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <select
                      className={cn(selectClass, "max-w-md")}
                      value={styleWorkId ?? ""}
                      onChange={(e) => setStyleWorkId(Number(e.target.value))}
                    >
                      {works.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="secondary" onClick={() => void runStylistics()}>
                      Compute
                    </Button>
                  </div>
                  {styleResult && (
                    <ul className="grid gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm">
                      <li>
                        <span className="text-muted-foreground">Characters:</span>{" "}
                        <span className="font-medium tabular-nums">{styleResult.char_count}</span>
                      </li>
                      <li>
                        <span className="text-muted-foreground">Sentences (heuristic):</span>{" "}
                        <span className="font-medium tabular-nums">{styleResult.sentence_count}</span>
                      </li>
                      <li>
                        <span className="text-muted-foreground">Avg sentence length (chars):</span>{" "}
                        <span className="font-medium tabular-nums">{styleResult.avg_sentence_length}</span>
                      </li>
                      <li>
                        <span className="text-muted-foreground">Dialogue quote markers:</span>{" "}
                        <span className="font-medium tabular-nums">{styleResult.dialogue_line_markers}</span>
                      </li>
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "synthesize" && (
              <Card>
                <CardHeader>
                  <CardTitle>Synthesize</CardTitle>
                  <CardDescription>
                    Grounded on the Evidence tray only. Expect citations like [T1], [T2]…
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
                  <Button type="button" variant="accent" onClick={() => void runSynthesize()}>
                    Run synthesis
                  </Button>
                  {synthOut && (
                    <div className="rounded-md border border-border bg-muted/20 p-4">
                      <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground">
                        {synthOut}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>

          {/* Evidence tray — persistent rail */}
          <aside className="flex w-[min(100%,400px)] shrink-0 flex-col border-l border-border bg-[hsl(var(--tray))] shadow-inner">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-serif text-base font-semibold">Evidence tray</h2>
              <p className="truncate text-xs text-muted-foreground">
                {tray?.tray_id ? `Session ${tray.tray_id.slice(0, 8)}…` : "Loading…"}
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {tray?.items.map((it: TrayItem) => (
                <Card key={it.tray_item_id} className="border-border/80 shadow-sm">
                  <CardContent className="p-4 pt-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug">{it.work_title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => void removeItem(it.tray_item_id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{it.locator}</p>
                    <p className="font-serif text-sm leading-relaxed text-foreground/90">
                      {it.excerpt.slice(0, 320)}
                      {it.excerpt.length > 320 ? "…" : ""}
                    </p>
                    <code className="mt-2 block truncate text-[10px] text-muted-foreground">{it.tray_item_id}</code>
                  </CardContent>
                </Card>
              ))}
              {!tray?.items.length && (
                <p className="text-center text-sm text-muted-foreground">No excerpts yet. Add from Concordance or Semantic.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
