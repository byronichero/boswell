import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { theme, setTheme } = useTheme();

  function cycleTheme(): void {
    if (theme === "light") {
      setTheme("dark");
      return;
    }
    if (theme === "dark") {
      setTheme("system");
      return;
    }
    setTheme("light");
  }

  let icon: React.ReactNode = <Monitor className="h-4 w-4" />;
  if (theme === "light") icon = <Sun className="h-4 w-4" />;
  if (theme === "dark") icon = <Moon className="h-4 w-4" />;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(className)}
      onClick={cycleTheme}
      aria-label="Toggle theme"
      title={`Theme: ${theme}`}
    >
      {icon}
    </Button>
  );
}

