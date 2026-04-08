import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface SplashScreenProps {
  /** Called after exit fade. Pass `true` to skip splash on future visits (localStorage). */
  readonly onEnter: (persistDismiss: boolean) => void;
}

type Phase = "quote" | "exit";

/**
 * Fading quote → fade out → app.
 */
export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("quote");
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Quote: fade in text on next frame
  useEffect(() => {
    if (phase !== "quote") return;
    setQuoteVisible(false);
    const id = requestAnimationFrame(() => setQuoteVisible(true));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // After quote is visible, hold then fade entire overlay out
  useEffect(() => {
    if (phase !== "quote" || !quoteVisible) return;
    const holdMs = 3200;
    const t = setTimeout(() => setPhase("exit"), holdMs);
    return () => clearTimeout(t);
  }, [phase, quoteVisible]);

  // Exit: opacity transition then dismiss
  useEffect(() => {
    if (phase !== "exit") return;
    const t = setTimeout(() => onEnter(dontShowAgain), 1000);
    return () => clearTimeout(t);
  }, [phase, dontShowAgain, onEnter]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-background transition-opacity duration-1000 ease-in-out",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      role="dialog"
      aria-label="Boswell introduction"
    >
      {(phase === "quote" || phase === "exit") && (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-6 transition-opacity duration-1000 ease-in",
            quoteVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <blockquote className="max-w-3xl text-center font-serif text-3xl font-medium leading-snug text-foreground md:text-5xl">
            I am lost without my Boswell.
          </blockquote>
          <label className="mt-10 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Don&apos;t show this intro again</span>
          </label>
        </div>
      )}
    </div>
  );
}
