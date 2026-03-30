import { Button } from "@/components/ui/button";
import { useOllamaModel } from "@/contexts/ollama-model";
import { cn } from "@/lib/utils";

interface OllamaModelSelectProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly id?: string;
}

export function OllamaModelSelect({ className, disabled, id }: OllamaModelSelectProps) {
  const { models, model, setModel, loadError, isLoading, refresh } = useOllamaModel();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <label className="text-sm text-muted-foreground" htmlFor={id ?? "ollama-model"}>
        Model
      </label>
      <select
        id={id ?? "ollama-model"}
        className="h-9 min-w-[12rem] max-w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={disabled || isLoading || models.length === 0}
      >
        {models.length === 0 && !isLoading && <option value="">No models found</option>}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={disabled || isLoading}>
        {isLoading ? "Loading…" : "Refresh"}
      </Button>
      {loadError && (
        <span className="text-xs text-destructive" title={loadError}>
          Could not list models
        </span>
      )}
    </div>
  );
}
