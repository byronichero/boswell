import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { useTray } from "@/contexts/tray";
import { api } from "@/lib/api";
import type { SemanticSearchResponse } from "@/types";

export default function SemanticPage() {
  const { periodId, softScope } = useCorpusScope();
  const { addItem } = useTray();

  const [query, setQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [result, setResult] = useState<SemanticSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.postSemantic({
        query: query.trim(),
        limit,
        period_id: periodId,
        soft_scope: softScope,
      });
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
        <CardTitle>Semantic search</CardTitle>
        <CardDescription>Vector retrieval over scoped chunks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Query (e.g., 'moral education and friendship')"
          />
          <Input
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value || "10"))}
            type="number"
            min={1}
            max={50}
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

        {result && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {result.hits.length} hits · scope periods: {result.scope_period_ids.join(", ")}
            </div>
            {result.hits.map((h) => (
              <div key={`${h.work_id}-${h.chunk_index}`} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{h.work_title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {h.locator} · score {h.score.toFixed(3)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () =>
                      addItem({
                        work_id: h.work_id,
                        locator: h.locator,
                        excerpt: h.text,
                        note: `Semantic hit (score ${h.score.toFixed(3)}): "${query.trim()}"`,
                      })
                    }
                  >
                    Add to tray
                  </Button>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm">{h.text}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

