import { TTS_VOICE_OPTIONS, useTtsVoice } from "@/contexts/tts-voice";
import { cn } from "@/lib/utils";

interface TtsVoiceSelectProps {
  readonly id: string;
  /** Short labels for tight layouts (e.g. collapsed sidebar). */
  readonly compact?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
}

/**
 * Persisted Kokoro voice (British English): male vs female read-aloud.
 */
export function TtsVoiceSelect({ id, compact, className, disabled }: TtsVoiceSelectProps) {
  const { voice, setVoice } = useTtsVoice();

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="shrink-0 text-sm text-muted-foreground">
        {compact ? "Voice" : "Read-aloud"}
      </label>
      <select
        id={id}
        className="h-9 min-w-0 max-w-[14rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={voice}
        disabled={disabled}
        onChange={(e) => setVoice(e.target.value as "bm_george" | "bf_lily")}
        title="Kokoro TTS voice (British English)"
      >
        {TTS_VOICE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {compact ? (o.id === "bm_george" ? "Male" : "Female") : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
