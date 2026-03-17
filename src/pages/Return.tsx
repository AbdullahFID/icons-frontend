import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Search } from "lucide-react";
import { getAllLoans, completeLoan } from "../lib/api";
import type { Loan } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import { useToast } from "@/components/ui/toast";
import { addOperation, resolveOperation } from "@/lib/operationQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export default function Return() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [returning, setReturning] = useState<string | null>(null);
  const [confirmLoan, setConfirmLoan] = useState<string | null>(null);
  const { addToast, updateToast } = useToast();

  useEffect(() => {
    loadLoans();
  }, []);

  async function loadLoans() {
    try {
      const data = await getAllLoans(true);
      setLoans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loans");
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn(loanId: string) {
    setReturning(loanId);
    setError("");
    setConfirmLoan(null);

    const loan = loans.find((l) => l.loan_id === loanId);
    const detail = loan ? `${loan.net_id} — ${loan.asset_tag}` : loanId;

    // optimistic: remove from active list immediately
    setLoans((prev) => prev.filter((l) => l.loan_id !== loanId));

    const opId = addOperation("Return Loan", detail, "Staff");
    const toastId = addToast(`Queued return: ${detail}`, "loading");

    try {
      await completeLoan(loanId);
      resolveOperation(opId, "success");
      updateToast(toastId, `Returned: ${detail}`, "success");
    } catch (err) {
      // rollback
      if (loan) setLoans((prev) => [...prev, loan]);
      const msg = err instanceof Error ? err.message : "Return failed";
      resolveOperation(opId, "failed", msg);
      updateToast(toastId, `Failed to return: ${detail}`, "error");
      setError(msg);
    } finally {
      setReturning(null);
    }
  }

  const filtered = loans.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return l.net_id.toLowerCase().includes(term) || l.asset_tag.toLowerCase().includes(term) || l.loan_id.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Return</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Find an active loan and mark it as returned.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, asset tag, or loan ID..."
            className="h-9 pl-9 rounded-xl glass-card border-0"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} active loan{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">{search ? "No loans match your search." : "No active loans."}</p>
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
                <TableHead className="px-5 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loan) => (
                <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                  <TableCell className="px-5 font-mono text-xs">{loan.loan_id}</TableCell>
                  <TableCell className="px-5">{loan.net_id}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{loan.asset_tag}</TableCell>
                  <TableCell className="px-5 text-muted-foreground">{new Date(loan.rented_at).toLocaleString()}</TableCell>
                  <TableCell className="px-5"><StatusBadge variant="checked-out" /></TableCell>
                  <TableCell className="px-5 text-right">
                    <Button size="sm" onClick={() => setConfirmLoan(loan.loan_id)} disabled={returning === loan.loan_id} className="rounded-lg text-xs hover:scale-[1.03] transition-transform">
                      {returning === loan.loan_id ? "Returning..." : "Return"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!confirmLoan} onOpenChange={() => setConfirmLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>Mark loan <span className="font-mono">{confirmLoan}</span> as returned?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLoan(null)}>Cancel</Button>
            <Button onClick={() => confirmLoan && handleReturn(confirmLoan)}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
