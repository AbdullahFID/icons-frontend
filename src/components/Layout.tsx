import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isDevMode, setDevMode, onDevModeChange } from "@/lib/devMode";
import { getTheme, setTheme, applyTheme, type Theme } from "@/lib/theme";
import { getUnreadFailureCount, clearUnreadFailures, onFailureCountChange } from "@/lib/operationQueue";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  ScanLine,
  Undo2,
  HardDrive,
  Users,
  History,
  ScrollText,
  Code2,
  Sun,
  Moon,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/checkout", icon: ScanLine, label: "Checkout" },
  { to: "/return", icon: Undo2, label: "Return" },
  { to: "/inventory", icon: HardDrive, label: "Inventory" },
  { to: "/students", icon: Users, label: "Students" },
  { to: "/history", icon: History, label: "History" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
];

const ENGSOC_LOGO = "https://www.engsoc.queensu.ca/wp-content/uploads/2024/01/EngSocLogo_ShortWordmark_WhiteText-3-300x300.png";

export default function Layout() {
  const [devEnabled, setDevEnabled] = useState(isDevMode());
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [collapsed, setCollapsed] = useState(false);
  const [devKey, setDevKey] = useState(0);
  const [failureCount, setFailureCount] = useState(getUnreadFailureCount());

  // mobile bottom nav scroll behavior
  const [showBottomNav, setShowBottomNav] = useState(true);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  // apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  // listen for dev mode changes so child pages remount
  useEffect(() => {
    return onDevModeChange((enabled) => {
      setDevEnabled(enabled);
      setDevKey((k) => k + 1);
    });
  }, []);

  // listen for failure count changes for bell badge
  useEffect(() => {
    return onFailureCountChange((count) => setFailureCount(count));
  }, []);

  function toggleDevMode(enabled: boolean) {
    setDevMode(enabled);
  }

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    setTheme(next);
  }

  // hide bottom nav on scroll down, show on scroll up
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    function handleScroll() {
      const current = el!.scrollTop;
      if (current > lastScrollY.current && current > 60) {
        setShowBottomNav(false);
      } else {
        setShowBottomNav(true);
      }
      lastScrollY.current = current;
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex h-screen bg-background bg-mesh">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col sidebar-transition overflow-hidden rounded-r-2xl shadow-xl",
          collapsed ? "w-[68px]" : "w-64"
        )}
        style={{ background: "linear-gradient(165deg, #002452 0%, #0a1a3f 40%, #1a0a30 70%, #660099 100%)" }}
      >
        {/* logo */}
        <div className={cn("px-4 py-4 border-b border-white/10", collapsed && "px-3")}>
          <div className="flex items-center gap-2.5">
            <img
              src={ENGSOC_LOGO}
              alt="EngSoc"
              className="h-9 w-9 rounded-lg object-contain shrink-0 bg-white/10 p-0.5"
            />
            <div className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>
              <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">
                iCons Inventory
              </h1>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">
                Equipment Management
              </p>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className={cn("flex-1 py-3 space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-2" : "px-3",
                  isActive
                    ? "bg-gradient-to-r from-white/15 to-white/5 text-white shadow-sm border-l-2 border-queens-gold"
                    : "text-white/55 hover:bg-white/10 hover:text-white/90 border-l-2 border-transparent"
                )
              }
              title={collapsed ? item.label : undefined}
              onClick={() => {
                if (item.to === "/logs") clearUnreadFailures();
              }}
            >
              <div className="relative shrink-0">
                <item.icon className="h-[18px] w-[18px]" />
                {item.to === "/logs" && failureCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {failureCount > 9 ? "9+" : failureCount}
                  </span>
                )}
              </div>
              <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* bottom controls */}
        <div className={cn("border-t border-white/10 py-2", collapsed ? "px-2" : "px-3")}>
          {/* theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white/90 transition-all w-full",
              collapsed ? "justify-center px-2" : "px-3"
            )}
            title={currentTheme === "light" ? "Dark mode" : "Light mode"}
          >
            {currentTheme === "light" ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
            <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>
              {currentTheme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
          </button>

          {/* dev mode */}
          {collapsed ? (
            <button
              onClick={() => toggleDevMode(!devEnabled)}
              className="flex items-center justify-center rounded-lg py-2 px-2 w-full"
              title="Toggle Dev Mode"
            >
              <Code2 className={cn("h-4 w-4", devEnabled ? "text-amber-400" : "text-white/40")} />
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-lg py-2 px-3 text-sm">
              <div className="flex items-center gap-3">
                <Code2 className={cn("h-4 w-4 shrink-0", devEnabled ? "text-amber-400" : "text-white/40")} />
                <span className="text-white/55 font-medium">Dev Mode</span>
              </div>
              <Switch checked={devEnabled} onCheckedChange={toggleDevMode} />
            </div>
          )}

          {/* collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-white/35 hover:bg-white/10 hover:text-white/60 transition-all w-full",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className={cn("sidebar-label", collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]")}>
              Collapse
            </span>
          </button>
        </div>

        {/* footer */}
        <div className={cn("border-t border-white/10", collapsed && "hidden")}>
          <div className="h-0.5 bg-gradient-to-r from-queens-gold via-queens-red to-engsoc-purple" />
          <div className="px-4 py-2">
            <p className="text-[10px] text-white/25">
              Team 887B &middot; APSC 103 &middot; Queen's University
            </p>
          </div>
        </div>
      </aside>

      {/* main content area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {/* mobile header */}
        <div className="md:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ENGSOC_LOGO} alt="EngSoc" className="h-8 w-8 rounded-lg object-contain bg-white/10 p-0.5" />
            <span className="font-semibold text-sm">iCons</span>
          </div>
          <div className="flex items-center gap-2">
            {failureCount > 0 && (
              <NavLink to="/logs" onClick={() => clearUnreadFailures()} className="relative p-2 rounded-lg hover:bg-accent transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
              </NavLink>
            )}
            {devEnabled && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                DEV
              </span>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors">
              {currentTheme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 page-enter" key={devKey}>
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav */}
      <div className={cn(
        "md:hidden fixed bottom-4 left-3 right-3 z-50 bottom-nav-pill",
        !showBottomNav && "bottom-nav-hidden"
      )}>
        <nav className="glass rounded-2xl shadow-xl px-1 py-1.5 flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-0",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )
              }
              onClick={() => {
                if (item.to === "/logs") clearUnreadFailures();
              }}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.to === "/logs" && failureCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
