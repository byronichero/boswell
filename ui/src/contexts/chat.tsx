import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useCorpusScope } from "@/contexts/corpus-scope";
import { useOllamaModel } from "@/contexts/ollama-model";
import { useTray } from "@/contexts/tray";
import { api } from "@/lib/api";
import type { SemanticHit, SemanticSearchResponse } from "@/types";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAtMs: number;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  proposedEvidence: SemanticHit[];
  isProposingEvidence: boolean;
  proposeError: string | null;
  send: (content: string) => Promise<void>;
  proposeEvidence: (query: string) => Promise<void>;
  clearProposedEvidence: () => void;
  reset: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function newId(prefix: string): string {
  const fallback = `${Date.now()}_${Math.random()}`;
  const uuid = globalThis.crypto?.randomUUID?.() ?? fallback;
  return `${prefix}_${uuid}`;
}

export function ChatProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { trayId, tray } = useTray();
  const { periodId, softScope } = useCorpusScope();
  const { model: ollamaChatModel } = useOllamaModel();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: newId("sys"),
      role: "system",
      content:
        "This assistant is evidence-grounded. To support a claim, add excerpts to your Evidence tray and ask a question. If the tray is insufficient, use “Propose evidence” to retrieve candidate passages and accept them into the tray.",
      createdAtMs: Date.now(),
    },
  ]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [proposedEvidence, setProposedEvidence] = useState<SemanticHit[]>([]);
  const [isProposingEvidence, setIsProposingEvidence] = useState<boolean>(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      const q = content.trim();
      if (!q) return;

      setError(null);
      setIsSending(true);

      const userMsg: ChatMessage = { id: newId("u"), role: "user", content: q, createdAtMs: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      try {
        if (!trayId || (tray?.items.length ?? 0) === 0) {
          const assistantMsg: ChatMessage = {
            id: newId("a"),
            role: "assistant",
            content:
              "Your Evidence tray is empty. Add excerpts from Concordance/Semantic search, or click “Propose evidence” to retrieve candidate passages you can accept into the tray.",
            createdAtMs: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          return;
        }

        const res = await api.synthesize({
          tray_id: trayId,
          question: q,
          ...(ollamaChatModel ? { model: ollamaChatModel } : {}),
        });
        const assistantMsg: ChatMessage = {
          id: newId("a"),
          role: "assistant",
          content: res.content,
          createdAtMs: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsSending(false);
      }
    },
    [trayId, tray, ollamaChatModel],
  );

  const proposeEvidence = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;

      setProposeError(null);
      setIsProposingEvidence(true);
      try {
        const res: SemanticSearchResponse = await api.postSemantic({
          query: q,
          limit: 12,
          period_id: periodId,
          soft_scope: softScope,
        });
        setProposedEvidence(res.hits);
      } catch (e) {
        setProposeError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsProposingEvidence(false);
      }
    },
    [periodId, softScope],
  );

  const clearProposedEvidence = useCallback(() => setProposedEvidence([]), []);

  const reset = useCallback(() => {
    setMessages((prev) => prev.slice(0, 1));
    setError(null);
    setProposedEvidence([]);
    setProposeError(null);
    setIsSending(false);
    setIsProposingEvidence(false);
  }, []);

  const value: ChatContextValue = useMemo(
    () => ({
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
    }),
    [messages, isSending, error, proposedEvidence, isProposingEvidence, proposeError, send, proposeEvidence, clearProposedEvidence, reset],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

