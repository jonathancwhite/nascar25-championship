"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function subscribe() {
  return () => {};
}

/**
 * Light / dark / system theme picker (NASCAR-090). Renders after mount to avoid
 * hydration mismatch; preference persists via next-themes (localStorage).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const id = useId();

  if (!mounted) {
    return (
      <div
        className={cn(
          "border-input h-8 w-[7.5rem] rounded-lg border",
          className,
        )}
        aria-hidden
      />
    );
  }

  const current = MODES.find((m) => m.value === theme) ?? MODES[2];
  const Icon = current.icon;

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Color theme
      </label>
      <Icon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
        aria-hidden
      />
      <select
        id={id}
        value={theme ?? "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-[7.5rem] appearance-none rounded-lg border bg-transparent pr-2 pl-8 text-sm transition-colors outline-none focus-visible:ring-3"
      >
        {MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </div>
  );
}
