import { ExternalLink, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Same-origin path proxied by Vite to the `memgraph-lab` service (see vite.config.ts + compose BASE_PATH). */
const MEMGRAPH_LAB_EMBED_PATH = "/memgraph-lab/";

export default function GraphLabPage() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                <Network className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="font-serif text-2xl">Memgraph Lab</CardTitle>
                <CardDescription>
                  Explore the Boswell period–work graph (same Bolt data the backend uses via the{" "}
                  <span className="font-mono">memgraph</span> service). Lab runs as the{" "}
                  <span className="font-mono">memgraph-lab</span> service; this page loads it under the same origin
                  as the app so it can be embedded safely.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const href = new URL(MEMGRAPH_LAB_EMBED_PATH, globalThis.window?.location?.origin ?? "").href;
                globalThis.window?.open(href, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open in new tab
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Embedded path: <span className="font-mono">{MEMGRAPH_LAB_EMBED_PATH}</span> (Vite proxies to the Lab
            container). If port 3000 is published on the host, you can also open the Lab service directly at{" "}
            <span className="font-mono">http://localhost:3000/memgraph-lab/</span>.
          </p>
        </CardContent>
      </Card>

      <div className="min-h-[min(720px,calc(100vh-14rem))] flex-1 overflow-hidden rounded-lg border bg-muted/30">
        <iframe
          title="Memgraph Lab"
          src={MEMGRAPH_LAB_EMBED_PATH}
          className="h-full min-h-[560px] w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
