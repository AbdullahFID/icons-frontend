// ---------------------------------------------------------------------------
// Layout.tsx — the shell that wraps every page.
//
// Responsibilities:
//   • Renders the desktop sidebar (left) and the mobile top-bar + bottom-nav
//   • Owns the dark/light theme toggle and the dev-mode toggle
//   • Shows a red badge on /logs when there are unread failed operations
//   • Hides the mobile bottom-nav when the user scrolls down (common mobile pattern)
//
// Page content is injected via <Outlet /> (React Router). Every <Route>
// under the top-level <Route element={<Layout />}> in App.tsx is rendered here.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { getUnreadFailureCount, clearUnreadFailures, onFailureCountChange } from "@/lib/operationQueue";
import { logout } from "@/lib/auth";
import {
  LayoutDashboard,
  ScanLine,
  Undo2,
  HardDrive,
  Users,
  History,
  ScrollText,
  BarChart3,
  Sun,
  Moon,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  X,
  LogOut,
} from "lucide-react";

// Single source of truth for every nav link. Changing the label or icon
// here updates both desktop + mobile nav at once.
const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/checkout", icon: ScanLine, label: "Checkout" },
  { to: "/return", icon: Undo2, label: "Return" },
  { to: "/inventory", icon: HardDrive, label: "Inventory" },
  { to: "/students", icon: Users, label: "Students" },
  { to: "/history", icon: History, label: "History" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
];

// On mobile, the bottom nav fits 4 items + a "More" button comfortably.
// The first five go in the visible pill; the rest live in the More panel.
const mobileMainItems = navItems.slice(0, 5);
const mobileMoreItems = navItems.slice(5);

// EngSoc's white-on-transparent wordmark — served from their website so we
// don't bundle it. If that URL ever 404s, swap to a local /public asset.
const ENGSOC_LOGO = "https://www.engsoc.queensu.ca/wp-content/uploads/2024/01/EngSocLogo_ShortWordmark_WhiteText-3-300x300.png";

export default function Layout() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [collapsed, setCollapsed] = useState(false);
  const [failureCount, setFailureCount] = useState(getUnreadFailureCount());
  const [moreOpen, setMoreOpen] = useState(false);
  const [iconSpin, setIconSpin] = useState(false);

  // Scroll tracking for the mobile bottom-nav hide-on-scroll behaviour.
  const [showBottomNav, setShowBottomNav] = useState(true);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close the "More" panel whenever the user navigates to a new page.
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // On first mount, apply the saved theme. `applyTheme` itself is called
  // by `setTheme`, but on mount we also need to sync the class directly
  // in case the user's saved preference is dark.
  useEffect(() => {
    if (currentTheme === "dark") document.documentElement.classList.add("dark");
  }, []);

  // Subscribe to failure-count changes for the red bell badge.
  useEffect(() => {
    return onFailureCountChange((count) => setFailureCount(count));
  }, []);

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    setIconSpin(true);
    setTimeout(() => setIconSpin(false), 550);
    setTheme(next);
  }

  // Hide the bottom nav when the user scrolls down past 60px, show it again
  // on any upward scroll. `passive: true` lets the browser keep scrolling
  // smooth even while we listen.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    function handleScroll() {
      const current = el!.scrollTop;
      if (current > lastScrollY.current && current > 60) setShowBottomNav(false);
      else setShowBottomNav(true);
      lastScrollY.current = current;
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let rafId = 0;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
        }
        const card = (e.target as HTMLElement).closest(".glass-card-interactive") as HTMLElement | null;
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
          card.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
        }
      });
    }
    document.addEventListener("mousemove", onMove, { passive: true });
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafId); };
  }, []);

  const isMoreActive = mobileMoreItems.some((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  const ThemeIcon = currentTheme === "light" ? Moon : Sun;

  return (
    <div className="flex h-screen bg-background bg-mesh">
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      {/* ============================== DESKTOP SIDEBAR ============================== */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col sidebar-transition overflow-hidden rounded-r-2xl shadow-xl",
          collapsed ? "w-[68px]" : "w-64"
        )}
        // Queen's-blue → EngSoc-purple diagonal gradient for the whole sidebar.
        style={{ background: "linear-gradient(165deg, #002452 0%, #0a1a3f 40%, #1a0a30 70%, #660099 100%)" }}
      >
        {/* Logo + wordmark */}
        <div className={cn("px-4 py-4 border-b border-white/10", collapsed && "px-3")}>
          <div className="flex items-center gap-2.5">
            <img src={ENGSOC_LOGO} alt="EngSoc" className="h-9 w-9 rounded-lg object-contain shrink-0 bg-white/10 p-0.5" />
            <div className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>
              <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">iCons Inventory</h1>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">Equipment Management</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className={cn("flex-1 py-3 space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {navItems.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.to === "/"}
              className={({ isActive }) => cn(
                "group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                // `gap-0` when collapsed so the icon is truly centred — a `gap-3`
                // reserves space for the 0-width label sibling and shifts the icon left.
                collapsed ? "justify-center gap-0 px-2" : "gap-3 px-3",
                isActive
                  ? "bg-gradient-to-r from-white/15 to-white/5 text-white shadow-sm border-l-2 border-queens-gold"
                  : "text-white/55 hover:bg-white/10 hover:text-white/90 border-l-2 border-transparent"
              )}
              title={collapsed ? item.label : undefined}
              // Clicking Logs clears the red failure badge.
              onClick={() => { if (item.to === "/logs") clearUnreadFailures(); }}
            >
              <div className="relative shrink-0">
                <item.icon className="h-[18px] w-[18px]" />
                {/* Red failure-count badge — only on Logs and only when >0 */}
                {item.to === "/logs" && failureCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center ring-2 ring-[#0a1a3f]">
                    {failureCount > 9 ? "9+" : failureCount}
                  </span>
                )}
              </div>
              <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer controls — theme, dev mode, collapse */}
        <div className={cn("border-t border-white/10 py-2", collapsed ? "px-2" : "px-3")}>
          <button onClick={toggleTheme} className={cn("flex items-center rounded-lg py-2 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white/90 transition-all w-full", collapsed ? "justify-center gap-0 px-2" : "gap-3 px-3")} title={currentTheme === "light" ? "Dark mode" : "Light mode"}>
            <ThemeIcon className={cn("h-4 w-4 shrink-0 theme-icon", iconSpin && "theme-icon-spin")} />
            <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>{currentTheme === "light" ? "Dark Mode" : "Light Mode"}</span>
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className={cn("flex items-center rounded-lg py-2 text-sm font-medium text-white/35 hover:bg-white/10 hover:text-white/60 transition-all w-full", collapsed ? "justify-center gap-0 px-2" : "gap-3 px-3")}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>Collapse</span>
          </button>
          <button onClick={() => logout()} className={cn("flex items-center rounded-lg py-2 text-sm font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all w-full", collapsed ? "justify-center gap-0 px-2" : "gap-3 px-3")} title="Sign out">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>Sign Out</span>
          </button>
        </div>

        {/* Tricolour accent + team attribution */}
        <div className={cn("border-t border-white/10", collapsed && "hidden")}>
          <div className="h-0.5 bg-gradient-to-r from-queens-gold via-queens-red to-engsoc-purple" />
          <div className="px-4 py-2"><p className="text-[10px] text-white/25">Team 887B &middot; APSC 103 &middot; Queen's University</p></div>
        </div>
      </aside>

      {/* ============================== MAIN CONTENT ============================== */}
      {/* `pb-24` on mobile leaves room for the floating bottom-nav pill. */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {/* Sticky mobile top bar — only visible below the md breakpoint */}
        <div className="md:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ENGSOC_LOGO} alt="EngSoc" className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5" />
            <span className="font-semibold text-sm">iCons</span>
          </div>
          <div className="flex items-center gap-2">
            {failureCount > 0 && (
              <NavLink to="/logs" onClick={() => clearUnreadFailures()} className="relative p-2 rounded-lg hover:bg-accent transition-colors" aria-label={`${failureCount} failed operations`}>
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
              </NavLink>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Toggle theme">
              <ThemeIcon className={cn("h-4 w-4 theme-icon", iconSpin && "theme-icon-spin")} />
            </button>
          </div>
        </div>
        <div className="page-transition max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8" key={location.pathname}><Outlet /></div>
      </main>

      {/* ============================== MOBILE NAV ============================== */}
      {/* Backdrop when the "More" panel is open — click anywhere to dismiss. */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[49] bg-black/40 backdrop-blur-sm more-backdrop" onClick={() => setMoreOpen(false)} />
      )}

      {/* Bottom nav pill + the "More" panel that extends up from it. Both
          share a single transform so they slide together on scroll. */}
      <div className={cn("md:hidden fixed bottom-4 left-3 right-3 z-50 bottom-nav-pill", !showBottomNav && !moreOpen && "bottom-nav-hidden")}>
        {/* More panel — grows upward from the pill. */}
        <div
          className={cn(
            "overflow-hidden rounded-t-2xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            moreOpen ? "max-h-[400px] opacity-100 mb-0" : "max-h-0 opacity-0 mb-0"
          )}
          style={{ background: "linear-gradient(165deg, #002452 0%, #0a1a3f 40%, #1a0a30 70%, #660099 100%)" }}
        >
          <div className="p-4 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase font-semibold tracking-wider">More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white" aria-label="Close more menu">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {mobileMoreItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"}
                  className={({ isActive }) => cn("flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all", isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}
                  onClick={() => { if (item.to === "/logs") clearUnreadFailures(); setMoreOpen(false); }}
                >
                  <div className="relative">
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.to === "/logs" && failureCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              onClick={() => { setMoreOpen(false); logout(); }}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign Out
            </button>
            <div className="h-0.5 bg-gradient-to-r from-queens-gold via-queens-red to-engsoc-purple rounded-full" />
            <p className="text-[10px] text-white/25 px-3.5 pb-0.5">Team 887B &middot; APSC 103</p>
          </div>
        </div>

        {/* The actual floating pill — rounded top corners disappear when the
            More panel is open so it looks like a single connected surface. */}
        <nav className={cn("glass shadow-xl px-1 py-1.5 flex items-center justify-around", moreOpen ? "rounded-b-2xl rounded-t-none" : "rounded-2xl")}>
          {mobileMainItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}
              className={({ isActive }) => cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0", isActive ? "text-primary bg-primary/10" : "text-muted-foreground")}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(!moreOpen)} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0", isMoreActive || moreOpen ? "text-primary bg-primary/10" : "text-muted-foreground")} aria-label="Open more menu">
            <div className="relative">
              <MoreHorizontal className="h-5 w-5" />
              {failureCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
            </div>
            <span className="text-[9px] font-medium leading-none">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
