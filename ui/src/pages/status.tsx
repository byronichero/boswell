import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { HealthResponse, ReadyResponse } from "@/types";

function pillClass(status: string): string {
  if (status === "ok" || status === "ready") return "bg-green-600/10 text-green-700 dark:text-green-300 border-green-600/20";
  if (status.startsWith("error")) return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const [h, r] = await Promise.all([api.getHealth(), api.getReady()]);
      setHealth(h);
      setReady(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHealth(null);
      setReady(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>App status</CardTitle>
        <CardDescription>
          Service availability and best-effort dependency checks (academic-friendly, not an observability platform).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Endpoints: <span className="font-mono">/health</span> and <span className="font-mono">/health/ready</span>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Backend</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClass(health?.status ?? "unknown")}`}>
                {health?.status ?? (isLoading ? "loading" : "unknown")}
              </span>
              {health?.service && <span className="text-sm font-medium">{health.service}</span>}
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Readiness</div>
            <div className="mt-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClass(ready?.status ?? "unknown")}`}>
                {ready?.status ?? (isLoading ? "loading" : "unknown")}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-background p-3">
          <div className="mb-2 text-xs text-muted-foreground">Dependencies</div>
          {ready?.dependencies ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ready.dependencies).map(([name, status]) => (
                <div key={name} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                  <div className="font-mono text-sm">{name}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClass(status)}`}>{status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : "No dependency information available."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

