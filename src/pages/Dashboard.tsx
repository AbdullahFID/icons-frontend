// ---------------------------------------------------------------------------
// Dashboard.tsx — the landing page at "/".
//
// Pulls three datasets in parallel (loans, hardware, users), derives a few
// at-a-glance metrics, and shows a searchable table of active loans. Auto-
// refreshes every 30 s via useAutoRefresh; also exposes a manual refresh.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Package, Users, ScanLine, AlertCircle, ArrowRight, Search, RefreshCw, Inbox } from "lucide-react";
import { getAllLoans, getAllHardware, getAllUsers } from "../lib/api";
import type { Loan, Hardware, User } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import StatSkeleton from "../components/StatSkeleton";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import Pagination, { paginate } from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  // Raw datasets from the backend.
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  // UI state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all three endpoints in parallel — Promise.all keeps total wait = slowest call.
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

  // 30 s silent background poll — keeps numbers fresh without spinners flashing.
  useAutoRefresh(loadData);

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Map asset_tag → display name so the table can show "Oscilloscope" instead of a UUID.
  const hardwareMap = new Map(hardware.map((h) => [h.asset_tag, h.name]));
  const activeLoans = loans.filter((l) => !l.returned_at);
  const availableItems = hardware.filter((h) => h.available).length;
  const totalItems = hardware.length;
  const totalStudents = users.length;
  // Utilization = how much of the inventory is currently out.
  const utilizationPct = totalItems > 0 ? Math.round(((totalItems - availableItems) / totalItems) * 100) : 0;

  // Live-filter active loans against the search box (case-insensitive, any field).
  const filteredLoans = activeLoans.filter((loan) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const itemName = hardwareMap.get(loan.asset_tag)?.toLowerCase() || "";
    return (
      loan.net_id.toLowerCase().includes(term) ||
      loan.asset_tag.toLowerCase().includes(term) ||
      loan.loan_id.toLowerCase().includes(term) ||
      itemName.includes(term)
    );
  });

  // Stat card config — keeps JSX tidy and makes adding a fourth card trivial.
  const stats = [
    {
      label: "Active Loans",
      value: activeLoans.length,
      hint: activeLoans.length === 1 ? "1 item checked out" : `${activeLoans.length} items checked out`,
      icon: ScanLine,
      gradient: "from-amber-500 to-orange-600",
      ring: "ring-amber-500/20",
    },
    {
      label: "Available Items",
      value: `${availableItems} / ${totalItems}`,
      hint: `${utilizationPct}% in use`,
      icon: Package,
      gradient: "from-emerald-500 to-teal-600",
      ring: "ring-emerald-500/20",
    },
    {
      label: "Registered Students",
      value: totalStudents,
      hint: totalStudents === 1 ? "1 account" : `${totalStudents} accounts`,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      ring: "ring-blue-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold gradient-text">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of the iCons equipment inventory system.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Stat cards — three colored tiles. `StatSkeleton` replaces them during the initial load. */}
      {loading ? <StatSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card glass-card-interactive rounded-2xl p-5 relative overflow-hidden"
            >
              {/* Decorative blurred colour blob behind the icon — pure flourish. */}
              <div className={cn("absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br", stat.gradient)} aria-hidden="true" />
              <div className="relative flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1 tabular-nums">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">{stat.hint}</p>
                </div>
                <div className={cn("rounded-xl p-2.5 bg-gradient-to-br text-white shadow-sm ring-1", stat.gradient, stat.ring)}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick action tiles — big, thumbable targets that lead to the two most common tasks. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          to="/checkout"
          className="glass-card glass-card-interactive rounded-2xl p-5 flex items-center justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-queens-blue/5 to-engsoc-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-queens-blue to-engsoc-purple text-white shadow-sm">
              <ScanLine size={20} />
            </div>
            <div>
              <p className="font-medium">New Checkout</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Scan a student ID and equipment barcode
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="relative text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          to="/return"
          className="glass-card glass-card-interactive rounded-2xl p-5 flex items-center justify-between group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-queens-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <p className="font-medium">Process Return</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Mark an active loan as returned
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="relative text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Active loans table */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Active Loans</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground search-icon" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search active loans..."
                className="h-9 pl-9 rounded-xl glass-card border-0"
              />
            </div>
            <Link to="/history" className="text-sm text-primary hover:underline font-medium whitespace-nowrap">
              View all
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>Showing {filteredLoans.length} of {activeLoans.length} active loans</span>
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh data"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          </button>
        </div>

        {loading ? <TableSkeleton rows={4} cols={5} /> : filteredLoans.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={search ? "No matches found" : "All clear"}
            description={search ? "No active loans match your search." : "No active loans right now. All equipment is available."}
          />
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-5">Loan ID</TableHead>
                  <TableHead className="px-5">Student</TableHead>
                  <TableHead className="px-5">Item (Asset Tag)</TableHead>
                  <TableHead className="px-5">Checked Out</TableHead>
                  <TableHead className="px-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginate(filteredLoans, page, pageSize).map((loan) => (
                  <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                    <TableCell className="px-5 font-mono text-xs">{loan.loan_id}</TableCell>
                    <TableCell className="px-5">{loan.net_id}</TableCell>
                    <TableCell className="px-5">
                      <span className="text-sm">{hardwareMap.get(loan.asset_tag) || "Unknown"}</span>
                      <span className="ml-1.5 font-mono text-xs text-muted-foreground">({loan.asset_tag})</span>
                    </TableCell>
                    <TableCell className="px-5 text-muted-foreground">
                      {new Date(loan.rented_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-5"><StatusBadge variant="checked-out" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination totalItems={filteredLoans.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        )}
      </div>
    </div>
  );
}
