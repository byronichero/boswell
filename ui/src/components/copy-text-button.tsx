import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CopyTextButtonProps {
  /** Plain text to copy to the clipboard. */
  text: string;
  /** Accessible label for the control. */
  "aria-label"?: string;
  className?: string;
  /** `onPrimary`: light icon on filled primary bubbles (Home user messages). */
  variant?: "default" | "onPrimary";
}

/**
 * Icon button that copies text to the clipboard and briefly shows a checkmark.
 */
export function CopyTextButton({
  text,
  "aria-label": ariaLabel = "Copy text",
  className,
  variant = "default",
}: Readonly<CopyTextButtonProps>) {
  const [copied, setCopied] = useState(false);

  function handleCopy(): void {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 shrink-0",
        variant === "default" && "text-muted-foreground hover:text-foreground",
        variant === "onPrimary" &&
          "text-primary-foreground/85 hover:bg-primary-foreground/15 hover:text-primary-foreground",
        className,
      )}
      aria-label={ariaLabel}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </Button>
  );
}
