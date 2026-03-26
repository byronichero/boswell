import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { api } from "@/lib/api";
import type { KeywordResponse } from "@/types";

export default function KeywordsPage() {
  const { periodId, softScope } = useCorpusScope();
  const [limit, setLimit] = useState<number>(50);
  const [result, setResult] = useState<KeywordResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.getKeywords(periodId, softScope, limit);
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
        <CardTitle>Keywords</CardTitle>
        <CardDescription>Top token counts (stopwords removed).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value || "50"))}
            type="number"
            min={10}
            max={200}
            className="sm:w-36"
          />
          <Button onClick={() => void run()} disabled={isLoading}>
            {isLoading ? "Loading…" : "Compute"}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              scope periods: {result.scope_period_ids.join(", ")}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.terms.map((t) => (
                <div key={t.term} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <div className="font-mono text-sm">{t.term}</div>
                  <div className="text-sm text-muted-foreground">{t.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

