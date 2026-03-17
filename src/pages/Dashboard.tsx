import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Users, ScanLine, AlertCircle, ArrowRight, Search } from "lucide-react";
import { getAllLoans, getAllHardware, getAllUsers } from "../lib/api";
import type { Loan, Hardware, User } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import StatSkeleton from "../components/StatSkeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [loanData, hwData, userData] = await Promise.all([
        getAllLoans(),
        getAllHardware(),
        getAllUsers(),
      ]);
      setLoans(loanData);
      setHardware(hwData);
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const activeLoans = loans.filter((l) => !l.returned_at);
  const availableItems = hardware.filter((h) => h.available).length;
  const totalItems = hardware.length;
  const totalStudents = users.length;

  // filter active loans by search
  const filteredLoans = activeLoans.filter((loan) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      loan.net_id.toLowerCase().includes(term) ||
      loan.asset_tag.toLowerCase().includes(term) ||
      loan.loan_id.toLowerCase().includes(term)
    );
  });

  const stats = [
    {
      label: "Active Loans",
      value: activeLoans.length,
      icon: ScanLine,
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Available Items",
      value: `${availableItems} / ${totalItems}`,
      icon: Package,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Registered Students",
      value: totalStudents,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
  ];

  return (
    <div className="space-y-8">
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

      {/* stat cards */}
      {loading ? <StatSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <div className={cn("rounded-xl p-2.5 bg-gradient-to-br text-white", stat.gradient)}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          to="/checkout"
          className="glass-card rounded-2xl p-5 flex items-center justify-between group hover:shadow-lg hover:scale-[1.01] transition-all duration-200 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-queens-blue/5 to-engsoc-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <p className="font-medium">New Checkout</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Scan a student ID and equipment barcode
            </p>
          </div>
          <ArrowRight size={18} className="relative text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link
          to="/return"
          className="glass-card rounded-2xl p-5 flex items-center justify-between group hover:shadow-lg hover:scale-[1.01] transition-all duration-200 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-queens-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <p className="font-medium">Process Return</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Mark an active loan as returned
            </p>
          </div>
          <ArrowRight size={18} className="relative text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* active loans */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Active Loans</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search active loans..."
                className="h-9 pl-9 rounded-xl glass-card border-0"
              />
            </div>
            <Link to="/history" className="text-sm text-primary hover:underline font-medium whitespace-nowrap">
              View all
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Showing {filteredLoans.length} of {activeLoans.length} active loans
        </p>

        {loading ? <TableSkeleton rows={4} cols={5} /> : filteredLoans.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No active loans match your search." : "No active loans right now."}
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-5">Loan ID</TableHead>
                  <TableHead className="px-5">Student</TableHead>
                  <TableHead className="px-5">Asset Tag</TableHead>
                  <TableHead className="px-5">Checked Out</TableHead>
                  <TableHead className="px-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.slice(0, 10).map((loan) => (
                  <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                    <TableCell className="px-5 font-mono text-xs">{loan.loan_id}</TableCell>
                    <TableCell className="px-5">{loan.net_id}</TableCell>
                    <TableCell className="px-5 font-mono text-xs">{loan.asset_tag}</TableCell>
                    <TableCell className="px-5 text-muted-foreground">
                      {new Date(loan.rented_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-5"><StatusBadge variant="checked-out" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
