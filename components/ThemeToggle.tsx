"use client";

import { useEffect, useState } from "react";

// Light/dark toggle. The source of truth is the .dark class on <html>, set
// pre-paint by the script in app/layout.tsx; this button flips it and
// persists the choice. Icon state is resolved after mount so SSR HTML (which
// can't know the theme) never mismatches.

export type Theme = "light" | "dark";

interface Props {
  className?: string;
  /** Show "Dark mode"/"Light mode" text next to the icon. */
  showLabel?: boolean;
  /** Fires with the new theme - lets the map recreate itself dark/light. */
  onChange?: (theme: Theme) => void;
}

export default function ThemeToggle({ className, showLabel, onChange }: Props) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("punerents_theme", next);
    } catch {
      // Private mode etc. - the toggle still works for this visit.
    }
    setTheme(next);
    onChange?.(next);
  };

  return (
    <button
      onClick={flip}
      className={className}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
      {showLabel && (theme === "dark" ? " Light mode" : " Dark mode")}
    </button>
  );
}
