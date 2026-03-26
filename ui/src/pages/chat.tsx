import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/contexts/chat";
import { useTray } from "@/contexts/tray";

function formatRole(role: string): string {
  if (role === "user") return "You";
  if (role === "assistant") return "Boswell";
  return "System";
}

export default function ChatPage() {
  const { trayId, addItem } = useTray();
  const {
    messages,
    isSending,
    error,
    proposedEvidence,
    isProposingEvidence,
    proposeError,
    send,
    proposeEvidence,
    clearProposedEvidence,
    reset,
  } = useChat();

  const [draft, setDraft] = useState<string>("");
  const [evidenceQuery, setEvidenceQuery] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const canSend = draft.trim().length > 0 && !isSending;
  const canPropose = evidenceQuery.trim().length > 0 && !isProposingEvidence;

  const evidenceHint = useMemo(() => {
    if (!trayId) return "Tray not initialized yet.";
    return "Proposed evidence is not used for synthesis until you add items to your tray.";
  }, [trayId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chat (evidence-grounded)</CardTitle>
          <CardDescription>
            Ask questions; answers must be supported by your Evidence tray excerpts and cite them as [T1], [T2], …
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              Reset chat
            </Button>
            <div className="text-xs text-muted-foreground">
              {evidenceHint}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div
            ref={scrollRef}
            className="h-[52vh] overflow-y-auto rounded-md border bg-background p-3"
          >
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">{formatRole(m.role)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAtMs).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a close-reading question. Example: 'What evidence supports the claim that X is ironic?'"
              className="min-h-[110px]"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  const q = draft.trim();
                  setDraft("");
                  await send(q);
                }}
                disabled={!canSend}
              >
                {isSending ? "Sending…" : "Send"}
              </Button>
              <div className="text-xs text-muted-foreground">
                Tip: if the tray is empty/insufficient, propose evidence below and add it to the tray.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Propose evidence (semantic retrieval)</CardTitle>
          <CardDescription>
            Retrieve candidate passages. They are not automatically cited—add the ones you trust to your Evidence tray.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={evidenceQuery}
              onChange={(e) => setEvidenceQuery(e.target.value)}
              placeholder="What evidence do you need? (e.g., 'friendship as moral education')"
            />
            <Button onClick={async () => proposeEvidence(evidenceQuery)} disabled={!canPropose}>
              {isProposingEvidence ? "Searching…" : "Propose"}
            </Button>
            <Button variant="outline" onClick={clearProposedEvidence} disabled={proposedEvidence.length === 0}>
              Clear
            </Button>
          </div>

          {proposeError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {proposeError}
            </div>
          )}

          {proposedEvidence.length === 0 ? (
            <div className="text-sm text-muted-foreground">No proposed evidence yet.</div>
          ) : (
            <div className="space-y-3">
              {proposedEvidence.map((h) => (
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
                          note: `Proposed evidence (semantic score ${h.score.toFixed(3)}): "${evidenceQuery.trim()}"`,
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
    </div>
  );
}

