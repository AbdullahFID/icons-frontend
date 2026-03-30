import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Search, Filter, RefreshCw, X, ChevronDown, Download, History as HistoryIcon } from "lucide-react";
import { getAllLoans, getAllHardware } from "../lib/api";
import type { Loan, Hardware } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import Pagination, { paginate } from "../components/Pagination";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import EmptyState from "../components/EmptyState";
import { exportToCSV } from "../lib/csvExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "returned";

export default function History() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardwareMap, setHardwareMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const activeFilterCount = [
    statusFilter !== "all",
    studentFilter.trim() !== "",
    itemFilter.trim() !== "",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  const loadHistory = useCallback(async () => {
    try {
      const [loanData, hardwareData] = await Promise.all([
        getAllLoans(),
        getAllHardware(),
      ]);
      setLoans(loanData);
      const map: Record<string, string> = {};
      hardwareData.forEach((hw: Hardware) => {
        map[hw.asset_tag] = hw.name;
      });
      setHardwareMap(map);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const refresh = useAutoRefresh(loadHistory);

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }

  function clearFilters() {
    setStatusFilter("all");
    setStudentFilter("");
    setItemFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const filtered = loans.filter((loan) => {
    // status filter
    if (statusFilter === "active" && loan.returned_at) return false;
    if (statusFilter === "returned" && !loan.returned_at) return false;

    // student filter
    if (studentFilter.trim()) {
      if (!loan.net_id.toLowerCase().includes(studentFilter.trim().toLowerCase())) return false;
    }

    // item filter
    if (itemFilter.trim()) {
      const itemName = hardwareMap[loan.asset_tag] || "";
      const term = itemFilter.trim().toLowerCase();
      if (!itemName.toLowerCase().includes(term) && !loan.asset_tag.toLowerCase().includes(term)) return false;
    }

    // date range filter
    if (dateFrom) {
      const loanDate = new Date(loan.rented_at);
      const from = new Date(dateFrom);
      if (loanDate < from) return false;
    }
    if (dateTo) {
      const loanDate = new Date(loan.rented_at);
      const to = new Date(dateTo + "T23:59:59");
      if (loanDate > to) return false;
    }

    // search (global)
    if (search) {
      const term = search.toLowerCase();
      const itemName = hardwareMap[loan.asset_tag] || "";
      if (
        !loan.net_id.toLowerCase().includes(term) &&
        !loan.asset_tag.toLowerCase().includes(term) &&
        !loan.loan_id.toLowerCase().includes(term) &&
        !itemName.toLowerCase().includes(term)
      ) return false;
    }

    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.rented_at).getTime() - new Date(a.rented_at).getTime()
  );

  const paged = paginate(sorted, page, pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Loan History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete record of all checkouts and returns.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground search-icon" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search loans..."
            className="h-9 pl-9 rounded-xl glass-card border-0"
          />
        </div>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" title="Export CSV"
          onClick={() => exportToCSV("loan-history",
            ["Loan ID", "Student", "Item", "Asset Tag", "Checked Out", "Returned", "Status"],
            sorted.map((l) => [l.loan_id, l.net_id, hardwareMap[l.asset_tag] || "", l.asset_tag, new Date(l.rented_at).toLocaleString(), l.returned_at ? new Date(l.returned_at).toLocaleString() : "", l.returned_at ? "Returned" : "Active"])
          )}>
          <Download size={15} />
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("rounded-xl hover:scale-[1.02] transition-all", showFilters && "bg-primary/10 text-primary border-primary/30")}
        >
          <Filter size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            {/* Student */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Student</label>
              <Input
                value={studentFilter}
                onChange={(e) => { setStudentFilter(e.target.value); setPage(1); }}
                placeholder="Filter by Net ID..."
                className="h-9 rounded-xl"
              />
            </div>
            {/* Item */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Item / Asset Tag</label>
              <Input
                value={itemFilter}
                onChange={(e) => { setItemFilter(e.target.value); setPage(1); }}
                placeholder="Filter by item name or tag..."
                className="h-9 rounded-xl"
              />
            </div>
            {/* Date from */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="h-9 rounded-xl"
              />
            </div>
            {/* Date to */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="h-9 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        Showing {sorted.length} of {loans.length} loans
        <button
          onClick={handleManualRefresh}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </button>
      </p>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No loans found"
          description={search || activeFilterCount > 0 ? "Try adjusting your filters or search." : "Loan history will appear here after checkouts."}
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="px-5">Loan ID</TableHead>
                <TableHead className="px-5">Student</TableHead>
                <TableHead className="px-5">Item</TableHead>
                <TableHead className="px-5">Asset Tag</TableHead>
                <TableHead className="px-5">Checked Out</TableHead>
                <TableHead className="px-5">Returned</TableHead>
                <TableHead className="px-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((loan) => (
                <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                  <TableCell className="px-5 font-mono text-xs">{loan.loan_id}</TableCell>
                  <TableCell className="px-5">{loan.net_id}</TableCell>
                  <TableCell className="px-5">{hardwareMap[loan.asset_tag] || "—"}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{loan.asset_tag}</TableCell>
                  <TableCell className="px-5 text-muted-foreground">{new Date(loan.rented_at).toLocaleString()}</TableCell>
                  <TableCell className="px-5 text-muted-foreground">{loan.returned_at ? new Date(loan.returned_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="px-5"><StatusBadge variant={loan.returned_at ? "returned" : "checked-out"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination totalItems={sorted.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </div>
  );
}
