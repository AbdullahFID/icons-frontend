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

export function setTheme(theme: Theme, originX?: number, originY?: number) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  if (originX !== undefined && originY !== undefined) {
    applyThemeReveal(theme, originX, originY);
  } else {
    applyTheme(theme);
  }
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

function applyThemeReveal(theme: Theme, x: number, y: number) {
  const doc = document.documentElement;
  const toggle = () => {
    if (theme === "dark") doc.classList.add("dark");
    else doc.classList.remove("dark");
  };

  if (typeof (document as any).startViewTransition === "function") {
    const maxR = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    doc.style.setProperty("--reveal-x", `${x}px`);
    doc.style.setProperty("--reveal-y", `${y}px`);
    doc.style.setProperty("--reveal-r", `${maxR}px`);
    (document as any).startViewTransition(async () => {
      toggle();
      await new Promise((r) => requestAnimationFrame(r));
    });
  } else {
    doc.classList.add("theme-transition");
    toggle();
    setTimeout(() => doc.classList.remove("theme-transition"), 450);
  }
}
