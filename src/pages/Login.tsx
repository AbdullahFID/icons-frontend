import { useState, useEffect } from "react";
import { loginAs } from "../lib/auth";
import { initDB, dbGetAllAccounts } from "../lib/indexedDB";
import { getTheme, setTheme, type Theme } from "../lib/theme";
import { cn } from "../lib/utils";
import { ArrowRight, Loader2, Sun, Moon, Shield, UserCog } from "lucide-react";
import type { Account } from "../types";

const ENGSOC_LOGO =
  "https://www.engsoc.queensu.ca/wp-content/uploads/2024/01/EngSocLogo_ShortWordmark_WhiteText-3-300x300.png";

const AVATAR_COLORS = [
  "from-queens-blue to-engsoc-purple",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
];

export default function LoginPage({
  onLogin,
  pageFading = false,
  onPageFaded,
}: {
  onLogin: () => void;
  pageFading?: boolean;
  onPageFaded?: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [iconSpin, setIconSpin] = useState(false);

  useEffect(() => {
    if (getTheme() === "dark") document.documentElement.classList.add("dark");
    requestAnimationFrame(() => setMounted(true));

    (async () => {
      await initDB();
      const accts = await dbGetAllAccounts();
      setAccounts(accts);
      setLoadingAccounts(false);
    })();
  }, []);

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    setIconSpin(true);
    setTimeout(() => setIconSpin(false), 550);
    setTheme(next);
  }

  async function handleSignIn(account: Account) {
    setSelectedId(account.id);
    await new Promise((r) => setTimeout(r, 300));
    loginAs(account);
    setExiting(true);
    await new Promise((r) => setTimeout(r, 350));
    onLogin();
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

        <div className="flex flex-col items-center mb-6">
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

        <div className="space-y-2">
          <p className="text-xs login-subtext font-medium uppercase tracking-wider text-center mb-3">
            Select your account
          </p>

          {loadingAccounts ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-foreground/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-foreground/10 rounded w-24" />
                    <div className="h-2.5 bg-foreground/10 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm login-subtext">No accounts yet.</p>
              <p className="text-xs login-subtext mt-1">Add accounts from the Dashboard.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {accounts.map((account, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const RoleIcon = account.role === "admin" ? Shield : UserCog;
                const isSelected = selectedId === account.id;

                return (
                  <button
                    key={account.id}
                    onClick={() => handleSignIn(account)}
                    disabled={selectedId !== null}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
                      "border border-foreground/[0.04] hover:border-foreground/10",
                      "bg-foreground/[0.02] hover:bg-foreground/[0.05]",
                      isSelected && "border-primary/30 bg-primary/10 scale-[0.98]",
                      selectedId !== null && !isSelected && "opacity-40",
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm transition-transform duration-200",
                      colorClass,
                      isSelected && "scale-90",
                    )}>
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{account.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RoleIcon className="h-3 w-3 opacity-50" />
                        <span className="text-[11px] opacity-50 capitalize">{account.role}</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                    ) : (
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-50 group-hover:translate-x-1 transition-all" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
