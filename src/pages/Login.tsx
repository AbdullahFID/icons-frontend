import { useState, useEffect } from "react";
import { login } from "../lib/auth";
import { isDevMode, setDevMode } from "../lib/devMode";
import { getTheme, setTheme, type Theme } from "../lib/theme";
import { Switch } from "../components/ui/switch";
import { cn } from "../lib/utils";
import { Lock, User, Eye, EyeOff, Code2, ArrowRight, Loader2, Sun, Moon } from "lucide-react";

const ENGSOC_LOGO =
  "https://www.engsoc.queensu.ca/wp-content/uploads/2024/01/EngSocLogo_ShortWordmark_WhiteText-3-300x300.png";

export default function LoginPage({
  onLogin,
  pageFading = false,
  onPageFaded,
}: {
  onLogin: () => void;
  pageFading?: boolean;
  onPageFaded?: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devEnabled, setDevEnabled] = useState(isDevMode());
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [iconSpin, setIconSpin] = useState(false);

  useEffect(() => {
    if (getTheme() === "dark") document.documentElement.classList.add("dark");
    requestAnimationFrame(() => setMounted(true));
    if (isDevMode()) {
      setUsername("admin");
      setPassword("password123");
    }
  }, []);

  function toggleTheme(e: React.MouseEvent) {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    setIconSpin(true);
    setTimeout(() => setIconSpin(false), 550);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    setTimeout(() => setTheme(next, x, y), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 400));

    if (login(username, password)) {
      setExiting(true);
      await new Promise((r) => setTimeout(r, 350));
      onLogin();
    } else {
      setError("Invalid username or password");
      setLoading(false);
    }
  }

  function handleDevToggle(enabled: boolean) {
    setDevMode(enabled);
    setDevEnabled(enabled);
    if (enabled) {
      setUsername("admin");
      setPassword("password123");
    } else {
      setUsername("");
      setPassword("");
    }
  }

  const ThemeIcon = currentTheme === "light" ? Moon : Sun;

  return (
    <div
      className={cn("login-page", pageFading && "login-page-fading")}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && pageFading && onPageFaded) {
          onPageFaded();
        }
      }}
    >
      <button
        onClick={toggleTheme}
        className="login-theme-toggle"
        aria-label={currentTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <ThemeIcon size={18} className={cn("theme-icon", iconSpin && "theme-icon-spin")} />
      </button>

      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-orb login-orb-4" />
        <div className="login-particles">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="login-particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
            }} />
          ))}
        </div>
        <div className="login-noise" />
      </div>

      <div className={cn(
        "login-card",
        mounted && !exiting && "login-card-visible",
        exiting && "login-card-exit",
      )}>
        <div className="login-shimmer" />
        <div className="login-border-glow" />

        <div className="flex flex-col items-center mb-8">
          <div className="login-logo-ring">
            <img src={ENGSOC_LOGO} alt="EngSoc" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold mt-5 tracking-tight">
            iCons Inventory
          </h1>
          <p className="text-sm login-subtext mt-1.5 font-light">
            Equipment Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="login-input-group">
            <User className="login-input-icon" />
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="Username"
              className="login-input"
              autoComplete="username"
              required
            />
          </div>

          <div className="login-input-group">
            <Lock className="login-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Password"
              className="login-input"
              style={{ paddingRight: 42 }}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 login-eye-btn transition-colors z-10"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="login-button group"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="login-dev-toggle">
          <div className="flex items-center gap-2">
            <Code2 className={cn("h-3.5 w-3.5 transition-colors", devEnabled ? "text-amber-500 dark:text-amber-400" : "login-icon-faint")} />
            <span className="text-xs login-subtext select-none">Developer Mode</span>
          </div>
          <Switch checked={devEnabled} onCheckedChange={handleDevToggle} />
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="h-px flex-1 login-divider" />
          <p className="text-[10px] login-faint-text whitespace-nowrap px-2">
            Team 887B &middot; APSC 103 &middot; Queen's University
          </p>
          <div className="h-px flex-1 login-divider" />
        </div>
      </div>
    </div>
  );
}
