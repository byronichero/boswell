import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorpusScope } from "@/contexts/corpus-scope";

export default function CorpusPage() {
  const { works, isLoading, error } = useCorpusScope();

  let body: ReactNode = <div className="text-sm text-muted-foreground">Loading works…</div>;
  if (!isLoading && works.length === 0) {
    body = <div className="text-sm text-muted-foreground">No works in scope.</div>;
  } else if (!isLoading && works.length > 0) {
    body = (
      <div className="space-y-3">
        {works.map((w) => (
          <div key={w.id} className="rounded-md border bg-background p-3">
            <div className="text-sm font-medium">{w.title}</div>
            <div className="text-xs text-muted-foreground">
              {w.author}
              {w.year ? ` · ${w.year}` : ""}
              {w.period_name ? ` · ${w.period_name}` : ""}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corpus</CardTitle>
        <CardDescription>
          Works in the currently selected period scope.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {body}
      </CardContent>
    </Card>
  );
}

