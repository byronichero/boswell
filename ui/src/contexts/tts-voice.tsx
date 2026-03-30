import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** Kokoro British English pipeline. */
export const TTS_LANG_CODE = "b" as const;

export type TtsVoiceId = "bm_george" | "bf_lily";

export const TTS_VOICE_OPTIONS: ReadonlyArray<{ readonly id: TtsVoiceId; readonly label: string }> = [
  { id: "bm_george", label: "British · Male" },
  { id: "bf_lily", label: "British · Female" },
];

/** Kokoro-only: calmer vs faster playback (same model). */
export type TtsReadingPreset = "narration" | "preview";

export const TTS_PRESET_OPTIONS: ReadonlyArray<{
  readonly id: TtsReadingPreset;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}> = [
  {
    id: "narration",
    label: "Narration",
    shortLabel: "Calmer",
    description: "Slower, calmer delivery — best for long passages (free, local Kokoro).",
  },
  {
    id: "preview",
    label: "Quick preview",
    shortLabel: "Faster",
    description: "Faster playback — good for skimming (same Kokoro model).",
  },
];

const STORAGE_KEY = "boswell-tts-voice";
const STORAGE_PRESET_KEY = "boswell-tts-preset";

function parseStored(raw: string | null): TtsVoiceId {
  if (raw === "bf_lily" || raw === "bm_george") return raw;
  return "bm_george";
}

function readInitial(): TtsVoiceId {
  if (globalThis.window === undefined) return "bm_george";
  return parseStored(globalThis.window.localStorage.getItem(STORAGE_KEY));
}

function parsePreset(raw: string | null): TtsReadingPreset {
  if (raw === "preview" || raw === "narration") return raw;
  return "narration";
}

function readInitialPreset(): TtsReadingPreset {
  if (globalThis.window === undefined) return "narration";
  return parsePreset(globalThis.window.localStorage.getItem(STORAGE_PRESET_KEY));
}

interface TtsVoiceContextValue {
  readonly voice: TtsVoiceId;
  readonly setVoice: (id: TtsVoiceId) => void;
  readonly langCode: typeof TTS_LANG_CODE;
  readonly readingPreset: TtsReadingPreset;
  readonly setReadingPreset: (id: TtsReadingPreset) => void;
}

const TtsVoiceContext = createContext<TtsVoiceContextValue | null>(null);

export function TtsVoiceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [voice, setVoiceState] = useState<TtsVoiceId>(readInitial);
  const [readingPreset, setReadingPresetState] = useState<TtsReadingPreset>(readInitialPreset);

  const setVoice = useCallback((id: TtsVoiceId) => {
    setVoiceState(id);
    globalThis.window?.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const setReadingPreset = useCallback((id: TtsReadingPreset) => {
    setReadingPresetState(id);
    globalThis.window?.localStorage.setItem(STORAGE_PRESET_KEY, id);
  }, []);

  const value = useMemo(
    () => ({
      voice,
      setVoice,
      langCode: TTS_LANG_CODE,
      readingPreset,
      setReadingPreset,
    }),
    [voice, setVoice, readingPreset, setReadingPreset],
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
