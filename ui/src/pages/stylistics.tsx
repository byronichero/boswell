import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { api } from "@/lib/api";
import type { StylisticsLiteResponse } from "@/types";

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
        <CardDescription>Quick heuristic stats for one work.</CardDescription>
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
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Characters</div>
              <div className="text-lg font-semibold">{result.char_count.toLocaleString()}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Sentences</div>
              <div className="text-lg font-semibold">{result.sentence_count.toLocaleString()}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Avg sentence length</div>
              <div className="text-lg font-semibold">{result.avg_sentence_length.toFixed(2)}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Dialogue markers</div>
              <div className="text-lg font-semibold">{result.dialogue_line_markers}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

