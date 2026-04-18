// Analytics.tsx — computed insights from the raw loan/hardware/user data.
// Nothing here hits a dedicated "analytics" backend endpoint; every number
// is derived client-side. If the dataset ever grows past a few thousand
// loans we'd want to move these reductions server-side, but for EngSoc's
// volume (tens/hundreds of loans) it's trivially fast in the browser.
//
// Widgets:
//   • 4 summary tiles (totals, utilization, avg duration, active borrowers)
//   • 7-day activity chart (stacked: checkouts vs returns, per day)
//   • Utilization SVG gauge
//   • Most-borrowed items leaderboard
//   • Top borrowers leaderboard

import { useEffect, useState, useCallback } from "react";
import { AlertCircle, RefreshCw, TrendingUp, Package, Users, Calendar, Download } from "lucide-react";
import { getAllLoans, getAllHardware, getAllUsers } from "../lib/api";
import type { Loan, Hardware, User } from "../types";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { exportToCSV } from "../lib/csvExport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loanData, hwData, userData] = await Promise.all([
        getAllLoans(),
        getAllHardware(),
        getAllUsers(),
      ]);
      setLoans(loanData);
      setHardware(hwData);
      setUsers(userData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // computed analytics
  const activeLoans = loans.filter((l) => !l.returned_at);
  const returnedLoans = loans.filter((l) => l.returned_at);
  const hwMap = new Map(hardware.map((h) => [h.asset_tag, h]));

  // most borrowed items
  const itemCounts = new Map<string, number>();
  loans.forEach((l) => {
    itemCounts.set(l.asset_tag, (itemCounts.get(l.asset_tag) || 0) + 1);
  });
  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({
      tag,
      name: hwMap.get(tag)?.name || tag,
      count,
    }));
  const maxItemCount = topItems.length > 0 ? topItems[0].count : 1;

  // top borrowers
  const studentCounts = new Map<string, number>();
  loans.forEach((l) => {
    studentCounts.set(l.net_id, (studentCounts.get(l.net_id) || 0) + 1);
  });
  const topStudents = [...studentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([netId, count]) => ({ netId, count }));
  const maxStudentCount = topStudents.length > 0 ? topStudents[0].count : 1;

  // checkouts over the last 7 days
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dailyCheckouts = last7Days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    const count = loans.filter((l) => l.rented_at.slice(0, 10) === dayStr).length;
    return { day, dayStr, count, label: day.toLocaleDateString("en-US", { weekday: "short" }) };
  });
  const maxDaily = Math.max(...dailyCheckouts.map((d) => d.count), 1);

  // daily returns
  const dailyReturns = last7Days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    const count = returnedLoans.filter((l) => l.returned_at && l.returned_at.slice(0, 10) === dayStr).length;
    return { count };
  });
  const maxDailyReturns = Math.max(...dailyReturns.map((d) => d.count), 1);

  // utilization rate
  const utilizationRate = hardware.length > 0
    ? Math.round((hardware.filter((h) => !h.available).length / hardware.length) * 100)
    : 0;

  // avg loan duration (for returned loans)
  const durations = returnedLoans
    .filter((l) => l.returned_at)
    .map((l) => (new Date(l.returned_at!).getTime() - new Date(l.rented_at).getTime()) / (1000 * 60 * 60));
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  function handleExportAnalytics() {
    exportToCSV("analytics-summary", ["Metric", "Value"], [
      ["Total Loans", String(loans.length)],
      ["Active Loans", String(activeLoans.length)],
      ["Returned Loans", String(returnedLoans.length)],
      ["Total Items", String(hardware.length)],
      ["Items In Use", String(hardware.filter((h) => !h.available).length)],
      ["Utilization Rate", `${utilizationRate}%`],
      ["Average Loan Duration", `${avgDuration.toFixed(1)} hours`],
      ["Registered Students", String(users.length)],
      ["Active Borrowers", String(studentCounts.size)],
    ]);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Insights and trends across all equipment activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={handleExportAnalytics}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <button onClick={handleManualRefresh} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Total Loans</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-2xl font-bold">{loans.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeLoans.length} active</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Utilization</p>
            <Package className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-2xl font-bold">{utilizationRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">{hardware.filter((h) => !h.available).length} of {hardware.length} in use</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Avg Duration</p>
            <Calendar className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-2xl font-bold">
            {avgDuration < 24
              ? `${avgDuration.toFixed(1)}h`
              : `${(avgDuration / 24).toFixed(1)}d`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">per loan</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">Active Borrowers</p>
            <Users className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-2xl font-bold">{new Set(activeLoans.map((l) => l.net_id)).size}</p>
          <p className="text-xs text-muted-foreground mt-1">of {users.length} students</p>
        </div>
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day activity */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-1">7-Day Activity</h3>
          <p className="text-xs text-muted-foreground mb-5">Checkouts and returns over the past week</p>
          <div className="flex items-end justify-between gap-2 h-40">
            {dailyCheckouts.map((day, i) => (
              <div key={day.dayStr} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "120px" }}>
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    {/* checkout bar */}
                    <div
                      className="w-[45%] rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500 ease-out"
                      style={{
                        height: `${Math.max((day.count / maxDaily) * 100, day.count > 0 ? 8 : 0)}%`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                    {/* return bar */}
                    <div
                      className="w-[45%] rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                      style={{
                        height: `${Math.max((dailyReturns[i].count / Math.max(maxDaily, maxDailyReturns)) * 100, dailyReturns[i].count > 0 ? 8 : 0)}%`,
                        animationDelay: `${i * 60 + 30}ms`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Checkouts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Returns</span>
            </div>
          </div>
        </div>

        {/* utilization gauge */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-1">Equipment Utilization</h3>
          <p className="text-xs text-muted-foreground mb-5">Current inventory usage</p>
          <div className="flex items-center justify-center py-4">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-muted/30" />
                <circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                  strokeLinecap="round"
                  className="stroke-primary transition-all duration-1000 ease-out"
                  strokeDasharray={`${(utilizationRate / 100) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{utilizationRate}%</span>
                <span className="text-[10px] text-muted-foreground">in use</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="text-center">
              <p className="text-lg font-semibold">{hardware.filter((h) => !h.available).length}</p>
              <p className="text-[10px] text-muted-foreground">Checked Out</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{hardware.filter((h) => h.available).length}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{hardware.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* most borrowed */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-1">Most Borrowed Items</h3>
          <p className="text-xs text-muted-foreground mb-4">All-time checkout frequency</p>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No loan data yet.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.tag} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                        style={{ width: `${(item.count / maxItemCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* top borrowers */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-1">Top Borrowers</h3>
          <p className="text-xs text-muted-foreground mb-4">Students with the most checkouts</p>
          {topStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No loan data yet.</p>
          ) : (
            <div className="space-y-3">
              {topStudents.map((student, i) => (
                <div key={student.netId} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono w-5 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{student.netId}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">{student.count} loans</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 ease-out"
                        style={{ width: `${(student.count / maxStudentCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
