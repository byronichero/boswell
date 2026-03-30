import { type TtsReadingPreset, TTS_PRESET_OPTIONS, useTtsVoice } from "@/contexts/tts-voice";
import { cn } from "@/lib/utils";

interface TtsPresetSelectProps {
  readonly id: string;
  readonly compact?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
}

/**
 * Kokoro-only reading style: calmer narration vs faster preview (same open model).
 */
export function TtsPresetSelect({ id, compact, className, disabled }: TtsPresetSelectProps) {
  const { readingPreset, setReadingPreset } = useTtsVoice();

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="shrink-0 text-sm text-muted-foreground">
        {compact ? "Style" : "Reading"}
      </label>
      <select
        id={id}
        className="h-9 min-w-0 max-w-[14rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={readingPreset}
        disabled={disabled}
        onChange={(e) => setReadingPreset(e.target.value as TtsReadingPreset)}
        title={TTS_PRESET_OPTIONS.find((o) => o.id === readingPreset)?.description}
      >
        {TTS_PRESET_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {compact ? o.shortLabel : `${o.label} (${o.shortLabel})`}
          </option>
        ))}
      </select>
    </div>
  );
}
