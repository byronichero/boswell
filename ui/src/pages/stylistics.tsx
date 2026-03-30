import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { api } from "@/lib/api";
import type { StylisticsLiteResponse } from "@/types";

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

export default function StylisticsPage() {
  const { works, isLoading: worksLoading } = useCorpusScope();
  const [workId, setWorkId] = useState<number | null>(null);
  const [result, setResult] = useState<StylisticsLiteResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workId != null) return;
    if (works.length === 0) return;
    setWorkId(works[0].id);
  }, [workId, works]);

  async function run(): Promise<void> {
    if (workId == null) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.getStylistics(workId);
      setResult(res);
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
          Heuristic counts for one work: words (Latin letters + apostrophe tokens), simple sentence splits, and
          punctuation. Useful for comparing prose habits—not a full stylometry pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Button onClick={() => void run()} disabled={isLoading || workId == null}>
            {isLoading ? "Computing…" : "Compute"}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Prose-oriented.</strong> Sentences are split on{" "}
              <span className="font-mono">. ? !</span> followed by space; poetry, drama, stage directions, or
              unpunctuated text will skew sentence averages. Word tokens are ASCII letters plus apostrophe (see
              Keywords tool). Punctuation rates are per 1,000 word tokens. Treat as exploratory, not definitive.
            </div>

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
