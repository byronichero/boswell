import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { api } from "@/lib/api";
import type {
  StylisticsCompareResponse,
  StylisticsLiteResponse,
  StylisticsRollingResponse,
} from "@/types";
import { cn } from "@/lib/utils";

type Mode = "single" | "compare" | "rolling";

function Stat({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
}>) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint ? <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</div> : null}
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ProseDisclaimer() {
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-muted-foreground">
      <strong className="text-foreground">Prose-oriented.</strong> Sentences are split on{" "}
      <span className="font-mono">. ? !</span> followed by space; poetry, drama, stage directions, or unpunctuated
      text will skew sentence averages. Word tokens are ASCII letters plus apostrophe (see Keywords tool). Punctuation
      rates are per 1,000 word tokens. Treat as exploratory, not definitive.
    </div>
  );
}

function MetricsGrids({ result }: Readonly<{ result: StylisticsLiteResponse }>) {
  return (
    <>
      <div>
        <h3 className="mb-2 font-serif text-sm font-semibold tracking-tight">Scale</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Characters" value={result.char_count.toLocaleString()} />
          <Stat label="Word tokens" value={result.word_count.toLocaleString()} hint="Regex [A-Za-z']+ lowercased" />
          <Stat label="Sentences (heuristic)" value={result.sentence_count.toLocaleString()} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-serif text-sm font-semibold tracking-tight">Lexical</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Unique word types" value={result.unique_word_types.toLocaleString()} />
          <Stat
            label="Type–token ratio"
            value={result.type_token_ratio.toFixed(4)}
            hint="Types ÷ tokens; short texts inflate TTR"
          />
          <Stat
            label="Avg words / sentence"
            value={result.avg_words_per_sentence.toFixed(2)}
            hint="Based on heuristic sentences"
          />
          <Stat
            label="Avg chars / sentence"
            value={result.avg_sentence_length.toFixed(2)}
            hint="Mean characters per heuristic sentence"
          />
          <Stat label="Dialogue quote marks" value={result.dialogue_line_markers.toLocaleString()} hint='" “ ”' />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-serif text-sm font-semibold tracking-tight">Punctuation (raw counts)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Comma ," value={result.comma_count.toLocaleString()} />
          <Stat label="Semicolon ;" value={result.semicolon_count.toLocaleString()} />
          <Stat label="Colon :" value={result.colon_count.toLocaleString()} />
          <Stat label="Question ?" value={result.question_mark_count.toLocaleString()} />
          <Stat label="Exclamation !" value={result.exclamation_mark_count.toLocaleString()} />
          <Stat
            label="Em / en dash — –"
            value={result.dash_em_en_count.toLocaleString()}
            hint="Unicode U+2014 / U+2013 only"
          />
          <Stat label="Parenthesis (" value={result.paren_open_count.toLocaleString()} />
          <Stat label="Parenthesis )" value={result.paren_close_count.toLocaleString()} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-serif text-sm font-semibold tracking-tight">Punctuation (per 1,000 words)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Commas" value={result.comma_per_1k_words.toFixed(2)} />
          <Stat label="Semicolons" value={result.semicolon_per_1k_words.toFixed(2)} />
          <Stat label="Colons" value={result.colon_per_1k_words.toFixed(2)} />
          <Stat label="Question marks" value={result.question_per_1k_words.toFixed(2)} />
          <Stat label="Exclamation marks" value={result.exclamation_per_1k_words.toFixed(2)} />
        </div>
      </div>
    </>
  );
}

function MetricsSections({ result }: Readonly<{ result: StylisticsLiteResponse }>) {
  return (
    <>
      <ProseDisclaimer />
      <MetricsGrids result={result} />
    </>
  );
}

function Sparkline({ values, className }: Readonly<{ values: number[]; className?: string }>) {
  if (values.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough points to plot.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 480;
  const h = 72;
  const pad = 4;
  const xAt = (i: number) => (i / (values.length - 1)) * (w - 2 * pad) + pad;
  const yAt = (v: number) => {
    if (max === min) return h / 2;
    return h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  };
  const parts = values.map((v, i) => {
    const x = xAt(i).toFixed(1);
    const y = yAt(v).toFixed(1);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  });
  const d = parts.join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full max-w-lg text-primary", className)} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function WorkMetaLine({
  title,
  author,
  period,
  year,
}: Readonly<{ title: string; author: string; period: string | null; year: number | null }>) {
  return (
    <div className="mb-3 space-y-1">
      <div className="font-medium leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground">
        {author || "—"}
        {period ? ` · ${period}` : ""}
        {typeof year === "number" ? ` · ${year}` : ""}
      </div>
    </div>
  );
}

export default function StylisticsPage() {
  const { works, isLoading: worksLoading } = useCorpusScope();
  const [mode, setMode] = useState<Mode>("single");

  const [workId, setWorkId] = useState<number | null>(null);
  const [singleResult, setSingleResult] = useState<StylisticsLiteResponse | null>(null);

  const [workIdA, setWorkIdA] = useState<number | null>(null);
  const [workIdB, setWorkIdB] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<StylisticsCompareResponse | null>(null);

  const [rollWorkId, setRollWorkId] = useState<number | null>(null);
  const [windowWords, setWindowWords] = useState<string>("500");
  const [strideWords, setStrideWords] = useState<string>("250");
  const [sentenceSmooth, setSentenceSmooth] = useState<string>("5");
  const [rollingResult, setRollingResult] = useState<StylisticsRollingResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (works.length === 0) return;
    if (workId == null) setWorkId(works[0].id);
    if (workIdA == null) setWorkIdA(works[0].id);
    if (workIdB == null) setWorkIdB(works.length > 1 ? works[1].id : works[0].id);
    if (rollWorkId == null) setRollWorkId(works[0].id);
  }, [works, workId, workIdA, workIdB, rollWorkId]);

  async function runSingle(): Promise<void> {
    if (workId == null) return;
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    try {
      setSingleResult(await api.getStylistics(workId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function runCompare(): Promise<void> {
    if (workIdA == null || workIdB == null) return;
    setIsLoading(true);
    setError(null);
    setCompareResult(null);
    try {
      setCompareResult(await api.getStylisticsCompare(workIdA, workIdB));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function runRolling(): Promise<void> {
    if (rollWorkId == null) return;
    const ww = Number.parseInt(windowWords, 10);
    const sw = Number.parseInt(strideWords, 10);
    const sm = Number.parseInt(sentenceSmooth, 10);
    if (Number.isNaN(ww) || Number.isNaN(sw) || Number.isNaN(sm)) {
      setError("Window, stride, and smooth must be integers.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRollingResult(null);
    try {
      setRollingResult(
        await api.getStylisticsRolling(rollWorkId, {
          window_words: ww,
          stride_words: sw,
          sentence_smooth: sm,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stylistics (lite)</CardTitle>
        <CardDescription>
          Heuristic counts and series for teaching: single work, side-by-side comparison (same metrics), or rolling
          windows over the text. Genre is not modeled—use period and author as context only.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {(
            [
              ["single", "One work"],
              ["compare", "Compare two"],
              ["rolling", "Rolling windows"],
            ] as const
          ).map(([m, label]) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "single" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="h-9 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={workId ?? ""}
                onChange={(e) => setWorkId(e.target.value ? Number(e.target.value) : null)}
                disabled={worksLoading || works.length === 0}
              >
                {works.length === 0 ? (
                  <option value="">No works</option>
                ) : (
                  works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} — {w.author}
                    </option>
                  ))
                )}
              </select>
              <Button onClick={() => void runSingle()} disabled={isLoading || workId == null}>
                {isLoading ? "Computing…" : "Compute"}
              </Button>
            </div>
            {singleResult && <MetricsSections result={singleResult} />}
          </div>
        )}

        {mode === "compare" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Same lite metrics for two works—useful for arguing about diction, pacing, or punctuation habits. Period
              and author are shown for shelf context; Boswell does not store genre labels.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sty-a">
                  Work A
                </label>
                <select
                  id="sty-a"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={workIdA ?? ""}
                  onChange={(e) => setWorkIdA(e.target.value ? Number(e.target.value) : null)}
                  disabled={worksLoading || works.length === 0}
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} — {w.author}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sty-b">
                  Work B
                </label>
                <select
                  id="sty-b"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={workIdB ?? ""}
                  onChange={(e) => setWorkIdB(e.target.value ? Number(e.target.value) : null)}
                  disabled={worksLoading || works.length === 0}
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} — {w.author}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={() => void runCompare()}
              disabled={isLoading || workIdA == null || workIdB == null}
            >
              {isLoading ? "Comparing…" : "Compare"}
            </Button>

            {compareResult && (
              <div className="space-y-6">
                <ProseDisclaimer />
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <WorkMetaLine
                      title={compareResult.meta_a.title}
                      author={compareResult.meta_a.author}
                      period={compareResult.meta_a.period_name}
                      year={compareResult.meta_a.year}
                    />
                    <MetricsGrids result={compareResult.work_a} />
                  </div>
                  <div>
                    <WorkMetaLine
                      title={compareResult.meta_b.title}
                      author={compareResult.meta_b.author}
                      period={compareResult.meta_b.period_name}
                      year={compareResult.meta_b.year}
                    />
                    <MetricsGrids result={compareResult.work_b} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "rolling" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Rolling word windows</strong> show local type–token ratio (lexical
              density) and average word length over overlapping spans. <strong>Sentence smoothing</strong> is a moving
              average of words-per-sentence (heuristic sentences)—useful for pacing, not for poetry with unreliable
              sentence boundaries.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <select
                className="h-9 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm"
                value={rollWorkId ?? ""}
                onChange={(e) => setRollWorkId(e.target.value ? Number(e.target.value) : null)}
                disabled={worksLoading || works.length === 0}
              >
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title} — {w.author}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="win">
                    Window (words)
                  </label>
                  <Input
                    id="win"
                    className="h-9 w-24"
                    value={windowWords}
                    onChange={(e) => setWindowWords(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="stride">
                    Stride
                  </label>
                  <Input
                    id="stride"
                    className="h-9 w-24"
                    value={strideWords}
                    onChange={(e) => setStrideWords(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="smooth">
                    Sentence smooth
                  </label>
                  <Input
                    id="smooth"
                    className="h-9 w-24"
                    value={sentenceSmooth}
                    onChange={(e) => setSentenceSmooth(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={() => void runRolling()} disabled={isLoading || rollWorkId == null}>
                {isLoading ? "Computing…" : "Compute series"}
              </Button>
            </div>

            {rollingResult && (
              <div className="space-y-6">
                <WorkMetaLine
                  title={rollingResult.title}
                  author={rollingResult.author}
                  period={rollingResult.period_name}
                  year={rollingResult.year}
                />
                <div className="text-xs text-muted-foreground">
                  Parameters: window {rollingResult.window_words} words, stride {rollingResult.stride_words}, sentence
                  smooth {rollingResult.sentence_smooth}. Tokens: {rollingResult.total_word_tokens.toLocaleString()};
                  heuristic sentences: {rollingResult.total_sentences.toLocaleString()}.
                  {rollingResult.word_windows_truncated ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}
                      Word-window series truncated (max windows cap).
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="mb-1 font-serif text-sm font-semibold">Word-window type–token ratio</h3>
                  <Sparkline values={rollingResult.word_windows.map((p) => p.type_token_ratio)} />
                </div>
                <div>
                  <h3 className="mb-1 font-serif text-sm font-semibold">Sentence-length smoothing (words)</h3>
                  <Sparkline values={rollingResult.sentence_series.map((p) => p.rolling_avg_words)} />
                </div>

                <div>
                  <h3 className="mb-2 font-serif text-sm font-semibold">Word windows (sample)</h3>
                  <div className="max-h-48 overflow-auto rounded-md border text-xs">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-2 font-medium">#</th>
                          <th className="p-2 font-medium">Token range</th>
                          <th className="p-2 font-medium">TTR</th>
                          <th className="p-2 font-medium">Avg word len</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rollingResult.word_windows.slice(0, 24).map((row) => (
                          <tr key={row.window_index} className="border-b border-border/60">
                            <td className="p-2 tabular-nums">{row.window_index}</td>
                            <td className="p-2 font-mono text-[10px]">
                              {row.start_token_index}–{row.end_token_index}
                            </td>
                            <td className="p-2 tabular-nums">{row.type_token_ratio.toFixed(4)}</td>
                            <td className="p-2 tabular-nums">{row.avg_word_length.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
