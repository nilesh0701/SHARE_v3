"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, toggleTheme } = useTheme();
  const iconSize = size === "sm" ? 16 : 18;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        color: "var(--app-fg)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {isDark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}

