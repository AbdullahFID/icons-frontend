import { useEffect, useState } from "react";
import { AlertCircle, Search, Filter } from "lucide-react";
import { getAllLoans } from "../lib/api";
import type { Loan } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function History() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getAllLoans();
      setLoans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  const filtered = loans.filter((loan) => {
    if (filterActive && loan.returned_at) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return loan.net_id.toLowerCase().includes(term) || loan.asset_tag.toLowerCase().includes(term) || loan.loan_id.toLowerCase().includes(term);
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.rented_at).getTime() - new Date(a.rented_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Loan History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete record of all checkouts and returns.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loans..."
            className="h-9 pl-9 rounded-xl glass-card border-0"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setFilterActive(!filterActive)}
          className={cn("rounded-xl hover:scale-[1.02] transition-all", filterActive && "bg-primary/10 text-primary border-primary/30")}
        >
          <Filter size={15} />
          Active Only
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {sorted.length} of {loans.length} loans
      </p>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : sorted.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">No loans found.</p>
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
                <TableHead className="px-5">Returned</TableHead>
                <TableHead className="px-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((loan) => (
                <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                  <TableCell className="px-5 font-mono text-xs">{loan.loan_id}</TableCell>
                  <TableCell className="px-5">{loan.net_id}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{loan.asset_tag}</TableCell>
                  <TableCell className="px-5 text-muted-foreground">{new Date(loan.rented_at).toLocaleString()}</TableCell>
                  <TableCell className="px-5 text-muted-foreground">{loan.returned_at ? new Date(loan.returned_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="px-5"><StatusBadge variant={loan.returned_at ? "returned" : "checked-out"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
