import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Replace with your custom intro; optional committed placeholder at this path. */
const INTRO_VIDEO_SRC = "/videos/boswell-intro.mp4";

interface SplashScreenProps {
  /** Called after exit fade. Pass `true` to skip splash on future visits (localStorage). */
  readonly onEnter: (persistDismiss: boolean) => void;
}

type Phase = "video" | "quote" | "exit";

/**
 * Intro MP4 → quote → fade out → app.
 */
export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("video");
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const goToQuote = useCallback(() => {
    setPhase("quote");
  }, []);

  const handleVideoEnded = useCallback(() => {
    goToQuote();
  }, [goToQuote]);

  const handleVideoError = useCallback(() => {
    goToQuote();
  }, [goToQuote]);

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
      {phase === "video" && (
        <>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            <video
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl ring-2 ring-primary/20"
              src={INTRO_VIDEO_SRC}
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnded}
              onError={handleVideoError}
            />
          </div>
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full shadow-md"
              aria-label={isMuted ? "Unmute" : "Mute"}
              onClick={() => setIsMuted((m) => !m)}
            >
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full shadow-md"
              aria-label="Skip intro"
              onClick={goToQuote}
            >
              Skip
            </Button>
          </div>
          <div className="flex justify-center border-t border-border/60 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span>Don&apos;t show this intro again</span>
            </label>
          </div>
        </>
      )}

      {(phase === "quote" || phase === "exit") && (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-6 transition-opacity duration-1000 ease-in",
            quoteVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <blockquote className="max-w-3xl text-center font-serif text-3xl font-medium leading-snug text-foreground md:text-5xl">
            I am lost without my Boswell.
          </blockquote>
        </div>
      )}
    </div>
  );
}
