import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** Kokoro British English pipeline. */
export const TTS_LANG_CODE = "b" as const;

export type TtsVoiceId = "bm_george" | "bf_lily";

export const TTS_VOICE_OPTIONS: ReadonlyArray<{ readonly id: TtsVoiceId; readonly label: string }> = [
  { id: "bm_george", label: "British · Male" },
  { id: "bf_lily", label: "British · Female" },
];

const STORAGE_KEY = "boswell-tts-voice";

function parseStored(raw: string | null): TtsVoiceId {
  if (raw === "bf_lily" || raw === "bm_george") return raw;
  return "bm_george";
}

function readInitial(): TtsVoiceId {
  if (globalThis.window === undefined) return "bm_george";
  return parseStored(globalThis.window.localStorage.getItem(STORAGE_KEY));
}

interface TtsVoiceContextValue {
  readonly voice: TtsVoiceId;
  readonly setVoice: (id: TtsVoiceId) => void;
  readonly langCode: typeof TTS_LANG_CODE;
}

const TtsVoiceContext = createContext<TtsVoiceContextValue | null>(null);

export function TtsVoiceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [voice, setVoiceState] = useState<TtsVoiceId>(readInitial);

  const setVoice = useCallback((id: TtsVoiceId) => {
    setVoiceState(id);
    globalThis.window?.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo(
    () => ({ voice, setVoice, langCode: TTS_LANG_CODE }),
    [voice, setVoice],
  );

  return <TtsVoiceContext.Provider value={value}>{children}</TtsVoiceContext.Provider>;
}

export function useTtsVoice(): TtsVoiceContextValue {
  const ctx = useContext(TtsVoiceContext);
  if (!ctx) {
    throw new Error("useTtsVoice must be used within TtsVoiceProvider");
  }
  return ctx;
}
