// light/dark theme management
// stores preference in localStorage and applies to document

const THEME_KEY = "icons_theme";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    // check system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    // ignore
  }
  return "light";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}

export function applyTheme(theme: Theme) {
  const doc = document.documentElement;
  doc.classList.add("theme-transition");
  if (theme === "dark") {
    doc.classList.add("dark");
  } else {
    doc.classList.remove("dark");
  }
  setTimeout(() => doc.classList.remove("theme-transition"), 450);
}
