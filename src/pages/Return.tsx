// Return.tsx — two ways to process a return:
//   (A) Scan the student's ID  → see all their open loans → return one-by-one
//   (B) Scan the item's asset tag → quick-return just that item
//
// Both paths end at /loans/complete_loan/{loanId}. We do an **optimistic**
// update: the loan is removed from the UI before the network call finishes,
// then re-added if the call fails (see handleReturn). `inFlightReturns`
// prevents double-clicks from firing the POST twice.

import { useEffect, useState, useCallback, useRef } from "react";
import { AlertCircle, RefreshCw, ScanLine, CheckCircle, Package, ScanBarcode } from "lucide-react";
import { getAllLoans, completeLoan, getAllHardware } from "../lib/api";
import ScanInput from "../components/ScanInput";
import type { Loan, Hardware } from "../types";
import StatusBadge from "../components/StatusBadge";
import TableSkeleton from "../components/TableSkeleton";
import { useToast } from "@/components/ui/toast";
import { addOperation, resolveOperation } from "@/lib/operationQueue";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ReturnStep = "scan" | "select" | "done";

export default function Return() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { addToast, updateToast } = useToast();

  // barcode scanner flow
  const [step, setStep] = useState<ReturnStep>("scan");
  const [scanInput, setScanInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentLoans, setStudentLoans] = useState<Loan[]>([]);

  // asset tag quick-return scan
  const [assetScanInput, setAssetScanInput] = useState("");
  const [assetReturnLoan, setAssetReturnLoan] = useState<Loan | null>(null);

  // confirmation
  const [confirmLoan, setConfirmLoan] = useState<Loan | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const inFlightReturns = useRef(new Set<string>());

  // hardware lookup map
  const hwMap = useRef(new Map<string, Hardware>());
  useEffect(() => {
    const map = new Map<string, Hardware>();
    hardware.forEach((h) => map.set(h.asset_tag, h));
    hwMap.current = map;
  }, [hardware]);

  function getItemName(assetTag: string): string {
    return hwMap.current.get(assetTag)?.name || assetTag;
  }

  const loadData = useCallback(async () => {
    try {
      const [loanData, hwData] = await Promise.all([
        getAllLoans(true),
        getAllHardware(),
      ]);
      setLoans(loanData);
      setHardware(hwData);
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

  function handleScan() {
    if (!scanInput.trim()) return;
    const id = scanInput.trim().toLowerCase();
    setStudentId(scanInput.trim());

    const found = loans.filter((l) => l.net_id.toLowerCase() === id);
    if (found.length === 0) {
      setError(`No active loans found for student "${scanInput.trim()}"`);
      return;
    }

    setStudentLoans(found);
    setError("");
    setStep("select");
  }

  function handleAssetScan() {
    if (!assetScanInput.trim()) return;
    const tag = assetScanInput.trim().toLowerCase();
    const found = loans.find((l) => l.asset_tag.toLowerCase() === tag);
    if (!found) {
      setError(`No active loan found for asset tag "${assetScanInput.trim()}"`);
      return;
    }
    setError("");
    setAssetReturnLoan(found);
  }

  function handleReset() {
    setStep("scan");
    setScanInput("");
    setStudentId("");
    setStudentLoans([]);
    setError("");
  }

  async function handleReturn(loan: Loan) {
    const loanId = loan.loan_id;
    if (inFlightReturns.current.has(loanId)) return;
    inFlightReturns.current.add(loanId);

    setReturning(loanId);
    setError("");
    setConfirmLoan(null);
    setAssetReturnLoan(null);

    const itemName = getItemName(loan.asset_tag);
    const detail = `${loan.net_id} — ${itemName} (${loan.asset_tag})`;

    // optimistic remove
    setLoans((prev) => prev.filter((l) => l.loan_id !== loanId));
    setStudentLoans((prev) => {
      const next = prev.filter((l) => l.loan_id !== loanId);
      if (next.length === 0) setTimeout(() => setStep("done"), 300);
      return next;
    });

    const opId = addOperation("Return Loan", detail, "Staff");
    const toastId = addToast(`Returning: ${itemName}`, "loading");

    try {
      await completeLoan(loanId);
      resolveOperation(opId, "success");
      updateToast(toastId, `Returned: ${itemName}`, "success");
      setAssetScanInput("");
    } catch (err) {
      setLoans((prev) => [...prev, loan]);
      setStudentLoans((prev) => [...prev, loan]);
      if (step === "done") setStep("select");
      const msg = err instanceof Error ? err.message : "Return failed";
      resolveOperation(opId, "failed", msg);
      updateToast(toastId, `Failed: ${itemName}`, "error");
      setError(msg);
    } finally {
      setReturning(null);
      inFlightReturns.current.delete(loanId);
    }
  }

  const stepIndex = step === "scan" ? 0 : step === "select" ? 1 : 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Return Equipment</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scan a student ID or an item's asset tag to process returns.
          </p>
        </div>
        <button onClick={handleManualRefresh} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Refresh">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* step indicator */}
      <div className="flex items-center gap-3">
        {["Scan Student", "Select Items", "Complete"].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            {i > 0 && <div className={cn("h-px w-8 transition-colors", i <= stepIndex ? "bg-primary" : "bg-border")} />}
            <div className="flex items-center gap-2">
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all", i <= stepIndex ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground")}>{i + 1}</div>
              <span className={cn("text-sm font-medium transition-colors hidden sm:inline", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading ? <TableSkeleton rows={4} cols={5} /> : (
        <>
          {step === "scan" && (
            <div className="space-y-4">
              {/* Scan student ID */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <ScanLine size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Scan Student ID</h3>
                    <p className="text-sm text-muted-foreground">Scan the barcode on the student's ID card or type their Net ID</p>
                  </div>
                </div>
                <ScanInput value={scanInput} onChange={setScanInput} onSubmit={handleScan} placeholder="Scan student ID barcode or type Net ID..." />
                <Button onClick={handleScan} disabled={!scanInput.trim()} className="rounded-xl">Look Up Student</Button>
              </div>

              {/* Quick return by asset tag */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <ScanBarcode size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Quick Return by Asset Tag</h3>
                    <p className="text-sm text-muted-foreground">Scan the item's barcode directly to return it</p>
                  </div>
                </div>
                <ScanInput value={assetScanInput} onChange={setAssetScanInput} onSubmit={handleAssetScan} placeholder="Scan asset tag barcode..." />
                <Button onClick={handleAssetScan} disabled={!assetScanInput.trim()} variant="outline" className="rounded-xl">Look Up Item</Button>
              </div>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white"><Package size={18} /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Returning for</p>
                    <p className="font-semibold">{studentId}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="rounded-lg text-xs">Change Student</Button>
              </div>

              <p className="text-xs text-muted-foreground">{studentLoans.length} item{studentLoans.length !== 1 ? "s" : ""} checked out</p>

              {studentLoans.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center space-y-3">
                  <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">All items have been returned!</p>
                  <Button onClick={handleReset} className="rounded-xl">Scan Another Student</Button>
                </div>
              ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="px-5">Item</TableHead>
                        <TableHead className="px-5">Asset Tag</TableHead>
                        <TableHead className="px-5">Checked Out</TableHead>
                        <TableHead className="px-5">Status</TableHead>
                        <TableHead className="px-5 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentLoans.map((loan) => (
                        <TableRow key={loan.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                          <TableCell className="px-5 font-medium">{getItemName(loan.asset_tag)}</TableCell>
                          <TableCell className="px-5 font-mono text-xs">{loan.asset_tag}</TableCell>
                          <TableCell className="px-5 text-muted-foreground text-sm">{new Date(loan.rented_at).toLocaleString()}</TableCell>
                          <TableCell className="px-5"><StatusBadge variant="checked-out" /></TableCell>
                          <TableCell className="px-5 text-right">
                            <Button size="sm" onClick={() => setConfirmLoan(loan)} disabled={returning === loan.loan_id} className="rounded-lg text-xs hover:scale-[1.03] transition-transform">
                              {returning === loan.loan_id ? "Returning..." : "Return"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">All Returns Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">All items for <span className="font-medium">{studentId}</span> have been returned.</p>
              </div>
              <Button onClick={handleReset} className="rounded-xl">Scan Another Student</Button>
            </div>
          )}
        </>
      )}

      {/* Confirm return modal (from student flow) */}
      <Dialog open={!!confirmLoan} onOpenChange={() => setConfirmLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
            <DialogDescription>Please verify the return details below.</DialogDescription>
          </DialogHeader>
          {confirmLoan && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium">{confirmLoan.net_id}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Item</span>
                <span className="font-medium">{getItemName(confirmLoan.asset_tag)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Asset Tag</span>
                <span className="font-mono font-medium">{confirmLoan.asset_tag}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Checked Out</span>
                <span>{new Date(confirmLoan.rented_at).toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLoan(null)}>Cancel</Button>
            <Button onClick={() => confirmLoan && handleReturn(confirmLoan)}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick return modal (from asset tag scan) */}
      <Dialog open={!!assetReturnLoan} onOpenChange={() => setAssetReturnLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Item</DialogTitle>
            <DialogDescription>Confirm that you want to return this item.</DialogDescription>
          </DialogHeader>
          {assetReturnLoan && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Item</span>
                <span className="font-medium">{getItemName(assetReturnLoan.asset_tag)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Asset Tag</span>
                <span className="font-mono font-medium">{assetReturnLoan.asset_tag}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Checked Out By</span>
                <span className="font-medium">{assetReturnLoan.net_id}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Checked Out</span>
                <span>{new Date(assetReturnLoan.rented_at).toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetReturnLoan(null)}>Cancel</Button>
            <Button onClick={() => assetReturnLoan && handleReturn(assetReturnLoan)}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
