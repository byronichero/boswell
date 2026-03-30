import { useState } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { useTray } from "@/contexts/tray";
import { api } from "@/lib/api";
import type { ConcordanceResponse } from "@/types";

export default function ConcordancePage() {
  const { periodId, softScope } = useCorpusScope();
  const { addItem } = useTray();

  const [query, setQuery] = useState<string>("");
  const [contextChars, setContextChars] = useState<number>(40);
  const [result, setResult] = useState<ConcordanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  async function run(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setTtsError(null);
    setResult(null);
    try {
      const res = await api.getConcordance(query.trim(), periodId, softScope, contextChars);
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
        <CardTitle>Concordance</CardTitle>
        <CardDescription>Keyword-in-context across scoped works.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search term (e.g., 'virtue')"
          />
          <Input
            value={String(contextChars)}
            onChange={(e) => setContextChars(Number(e.target.value || "40"))}
            type="number"
            min={5}
            max={200}
            className="sm:w-36"
          />
          <Button onClick={() => void run()} disabled={isLoading || query.trim().length === 0}>
            {isLoading ? "Searching…" : "Search"}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {ttsError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            Read aloud: {ttsError}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {result.total_hits} hits · scope periods: {result.scope_period_ids.join(", ")}
            </div>
            {result.hits.map((h, idx) => {
              const excerpt = `${h.before}${h.keyword}${h.after}`;
              return (
                <div key={`${h.work_id}-${idx}`} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{h.work_title}</div>
                      <div className="truncate text-xs text-muted-foreground">{h.locator}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <ReadAloudButton
                        variant="icon"
                        text={excerpt}
                        onError={(msg) => setTtsError(msg)}
                      />
                      <CopyTextButton text={excerpt} aria-label="Copy KWIC line" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () =>
                          addItem({
                            work_id: h.work_id,
                            locator: h.locator,
                            excerpt,
                            note: `Concordance hit: "${result.query}"`,
                          })
                        }
                      >
                        Add to tray
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 font-serif text-sm">
                    <span className="text-muted-foreground">{h.before}</span>
                    <span className="font-semibold text-accent">{h.keyword}</span>
                    <span className="text-muted-foreground">{h.after}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

