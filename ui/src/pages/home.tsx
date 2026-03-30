import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { OllamaModelSelect } from "@/components/ollama-model-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useOllamaModel } from "@/contexts/ollama-model";
import { api } from "@/lib/api";
import type { ChatOpenMessage } from "@/types";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { model } = useOllamaModel();
  const [messages, setMessages] = useState<ChatOpenMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  async function send(): Promise<void> {
    const text = draft.trim();
    if (!text || isSending) return;
    setError(null);
    setDraft("");
    const previous = messages;
    const next: ChatOpenMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setIsSending(true);
    try {
      const res = await api.postChatOpen({
        messages: next,
        ...(model ? { model } : {}),
      });
      setMessages([...next, { role: "assistant", content: res.message }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages(previous);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <Card className="flex min-h-0 flex-1 flex-col border-border/60">
        <CardHeader className="shrink-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-serif text-2xl">Home</CardTitle>
              <CardDescription>
                Open conversation with Boswell. This is general chat (not tied to your Evidence tray). For
                analysis grounded in specific excerpts, use <strong>Evidence chat</strong> in the sidebar. New to the
                stack? See{" "}
                <Link to="/tutorial" className="font-medium text-primary underline underline-offset-4">
                  Getting started
                </Link>{" "}
                (corpus, scope, tray, demo seed).
              </CardDescription>
            </div>
            <OllamaModelSelect className="sm:justify-end" id="home-ollama-model" disabled={isSending} />
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-[280px] flex-1 space-y-4 overflow-y-auto rounded-md border bg-muted/20 p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Say hello, ask about a period or author, or compare two works—no tray required.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground"
                    : "mr-8 border bg-background text-foreground",
                )}
              >
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {m.role === "user" ? "You" : "Boswell"}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {isSending && (
              <div className="mr-8 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              className="min-h-[88px] flex-1 resize-none"
              placeholder="Message Boswell…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={isSending}
            />
            <Button className="shrink-0 sm:h-11" onClick={() => void send()} disabled={isSending || !draft.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
