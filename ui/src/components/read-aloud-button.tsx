import { Loader2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTtsVoice } from "@/contexts/tts-voice";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ReadAloudButtonProps {
  /** Plain text to synthesize (line breaks preserved). */
  readonly text: string;
  readonly disabled?: boolean;
  readonly className?: string;
  /** Called when synthesis or playback fails. */
  readonly onError?: (message: string) => void;
  /** `icon`: compact control next to CopyTextButton; `default`: labeled outline button. */
  readonly variant?: "default" | "icon";
  /**
   * When `variant` is `icon`, match message bubble styling.
   * `onPrimary`: light icon on filled primary bubbles (Home user messages).
   */
  readonly iconTone?: "default" | "onPrimary";
}

function labelForPhase(phase: "idle" | "loading" | "playing"): string {
  if (phase === "loading") return "Preparing audio…";
  if (phase === "playing") return "Playing…";
  return "Read aloud";
}

/**
 * Fetches WAV audio from POST /api/tts (Kokoro in Docker) and plays it in the browser.
 */
export function ReadAloudButton({
  text,
  disabled,
  className,
  onError,
  variant = "default",
  iconTone = "default",
}: ReadAloudButtonProps) {
  const { voice, langCode, readingPreset } = useTtsVoice();
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onerror = null;
      a.onended = null;
      a.pause();
      a.src = "";
    }
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhase("idle");
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const play = useCallback(async () => {
    const t = text.trim();
    if (!t || disabled) return;
    cleanup();
    setPhase("loading");
    try {
      const blob = await api.postTts({
        text: t,
        voice,
        lang_code: langCode,
        preset: readingPreset,
      });
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => cleanup();
      audio.onerror = () => {
        onError?.("Audio playback failed.");
        cleanup();
      };
      await audio.play();
      setPhase("playing");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
      cleanup();
    }
  }, [text, disabled, cleanup, onError, voice, langCode, readingPreset]);

  const busy = phase !== "idle";

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0",
          iconTone === "default" && "text-muted-foreground hover:text-foreground",
          iconTone === "onPrimary" &&
            "text-primary-foreground/85 hover:bg-primary-foreground/15 hover:text-primary-foreground",
          className,
        )}
        disabled={disabled || !text.trim() || busy}
        aria-label={busy ? labelForPhase(phase) : "Read aloud"}
        onClick={() => void play()}
      >
        {phase === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Volume2 className={cn("h-3.5 w-3.5", phase === "playing" && "opacity-70")} aria-hidden />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={disabled || !text.trim() || busy}
      onClick={() => void play()}
    >
      {labelForPhase(phase)}
    </Button>
  );
}
