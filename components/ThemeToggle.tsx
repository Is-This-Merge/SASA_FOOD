"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => setTheme(getCurrentTheme()), []);

  const toggleTheme = () => {
    const nextTheme: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  const nextThemeLabel = theme === "dark" ? "라이트 모드" : "다크 모드";

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`${nextThemeLabel}로 전환`} title={`${nextThemeLabel}로 전환`}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.1A8 8 0 018.9 3.8 8 8 0 1020.2 15.1z" /></svg>
      )}
    </button>
  );
}
