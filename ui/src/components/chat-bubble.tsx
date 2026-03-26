import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/contexts/chat";
import { cn } from "@/lib/utils";

export function ChatBubble({ className }: Readonly<{ className?: string }>) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { messages, isSending, send } = useChat();

  const [open, setOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    if (pathname === "/chat") setOpen(false);
  }, [pathname]);

  if (pathname === "/chat") return null;

  const last = messages
    .slice()
    .reverse()
    .find((m) => m.role !== "system");

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {open && (
        <Card className="mb-3 w-[360px] shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Boswell chat</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/chat")}>
                Open
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {last && (
              <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                <div className="mb-1 font-medium">{last.role === "user" ? "You" : "Boswell"}</div>
                <div className="line-clamp-4 whitespace-pre-wrap">{last.content}</div>
              </div>
            )}
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask (tray-grounded)…"
              className="min-h-[90px]"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  const q = draft.trim();
                  setDraft("");
                  await send(q);
                }}
                disabled={isSending || draft.trim().length === 0}
              >
                {isSending ? "Sending…" : "Send"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/chat")}>
                Propose evidence
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        variant="accent"
        size="lg"
        className="rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle chat"
        title="Boswell chat"
      >
        Chat
      </Button>
    </div>
  );
}

