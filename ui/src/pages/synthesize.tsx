import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTray } from "@/contexts/tray";
import { api } from "@/lib/api";
import type { SynthesizeResponse } from "@/types";

export default function SynthesizePage() {
  const { trayId, tray, isLoading: trayLoading } = useTray();

  const [question, setQuestion] = useState<string>("");
  const [result, setResult] = useState<SynthesizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<void> {
    if (!trayId) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.synthesize({ tray_id: trayId, question: question.trim() });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  const isEmpty = !trayLoading && (tray?.items.length ?? 0) === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthesize</CardTitle>
        <CardDescription>
          Grounded analysis from the Evidence tray. The model must cite excerpts as [T1], [T2], etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty && (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Your tray is empty. Add excerpts from Concordance or Semantic results first.
          </div>
        )}

        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a close-reading question (e.g., 'How is friendship framed as moral education?')"
        />

        <Button onClick={() => void run()} disabled={isLoading || isEmpty || question.trim().length === 0 || !trayId}>
          {isLoading ? "Synthesizing…" : "Synthesize"}
        </Button>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-md border bg-background p-4">
            <div className="mb-2 text-xs text-muted-foreground">
              analysis_id={result.analysis_id ?? "—"} · tray_id={result.tray_id ?? "—"}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.content}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

