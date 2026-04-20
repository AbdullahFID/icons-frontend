import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import ScanInput from "../components/ScanInput";
import { createLoan, getAllLoans, getAllHardware, getAllUsers } from "../lib/api";
import { sanitizeInput } from "../lib/sanitize";
import { addOperation, resolveOperation } from "@/lib/operationQueue";
import { getCurrentUser } from "@/lib/auth";
import type { Loan, Hardware, User } from "../types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "student" | "equipment" | "confirm" | "done";

export default function Checkout() {
  const [step, setStep] = useState<Step>("student");
  const [netId, setNetId] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [result, setResult] = useState<Loan | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    Promise.all([getAllHardware(), getAllUsers()])
      .then(([hwData, userData]) => {
        setHardware(hwData);
        setUsers(userData);
      })
      .catch(() => {});
  }, []);

  const matchedStudent = users.find(
    (u) => u.net_id.toLowerCase() === netId.trim().toLowerCase()
  );

  const matchedItem = hardware.find(
    (h) => h.asset_tag.toLowerCase() === assetTag.trim().toLowerCase()
  );

  function handleStudentScan() {
    if (!netId.trim()) return;
    setError("");

    const student = users.find(
      (u) => u.net_id.toLowerCase() === netId.trim().toLowerCase()
    );
    if (!student) {
      setError(`Student "${netId.trim()}" not found. Please check the Net ID and try again.`);
      return;
    }

    setStep("equipment");
  }

  function handleEquipmentScan() {
    if (!assetTag.trim()) return;
    setError("");

    const item = hardware.find(
      (h) => h.asset_tag.toLowerCase() === assetTag.trim().toLowerCase()
    );
    if (!item) {
      setError(`Equipment "${assetTag.trim()}" not found. Please check the asset tag.`);
      return;
    }
    if (!item.available) {
      setError(`"${item.name}" (${item.asset_tag}) is currently checked out.`);
      return;
    }

    setStep("confirm");
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError("");
    try {
      const activeLoans: Loan[] = await getAllLoans(true);
      const alreadyCheckedOut = activeLoans.some(
        (l) => l.asset_tag.toLowerCase() === assetTag.trim().toLowerCase()
      );
      if (alreadyCheckedOut) {
        setError("This item is already checked out");
        setSubmitting(false);
        return;
      }
      const performer = getCurrentUser()?.name ?? "Staff";
      const detail = `${matchedStudent?.name ?? netId} → ${matchedItem?.name ?? assetTag}`;
      const opId = addOperation("Checkout", detail, performer);
      const loan = await createLoan(sanitizeInput(netId.trim()), sanitizeInput(assetTag.trim()));
      resolveOperation(opId, "success");
      setResult(loan);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStep("student");
    setNetId("");
    setAssetTag("");
    setResult(null);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Checkout</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan a student ID and equipment barcode to create a new loan.
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {["Student ID", "Equipment", "Confirm"].map((label, i) => {
          const stepIndex = ["student", "equipment", "confirm", "done"].indexOf(step);
          const isActive = i <= stepIndex;
          return (
            <div key={label} className="flex items-center gap-2 sm:gap-3 min-w-0">
              {i > 0 && <div className={cn("h-px w-5 sm:w-8 shrink-0 transition-colors", isActive ? "bg-primary" : "bg-border")} />}
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn(
                  "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <span className={cn("text-sm font-medium transition-colors whitespace-nowrap hidden sm:inline", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />{error}
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        {step === "student" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Student Net ID</label>
              <ScanInput value={netId} onChange={setNetId} onSubmit={handleStudentScan} placeholder="Scan student ID or type net ID..." />
            </div>
            <Button onClick={handleStudentScan} disabled={!netId.trim()} className="rounded-xl">Next</Button>
          </div>
        )}

        {step === "equipment" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Student: </span>
              <span className="font-medium">{matchedStudent?.name ?? netId}</span>
              {matchedStudent && <span className="text-muted-foreground ml-1.5">({netId})</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Equipment Asset Tag</label>
              <ScanInput value={assetTag} onChange={setAssetTag} onSubmit={handleEquipmentScan} placeholder="Scan equipment barcode..." />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("student")} className="rounded-xl">Back</Button>
              <Button onClick={handleEquipmentScan} disabled={!assetTag.trim()} className="rounded-xl">Next</Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold">Confirm Checkout</h3>
            <div className="space-y-2">
              {matchedStudent && (
                <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Student Name</span>
                  <span className="font-medium">{matchedStudent.name}</span>
                </div>
              )}
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Student Net ID</span>
                <span className="font-medium">{netId}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Asset Tag</span>
                <span className="font-mono font-medium">{assetTag}</span>
              </div>
              {matchedItem && (
                <div className="flex justify-between rounded-lg bg-muted px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Item Name</span>
                  <span className="font-medium">{matchedItem.name}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("equipment")} className="rounded-xl">Back</Button>
              <Button onClick={handleCheckout} disabled={submitting} className="rounded-xl">
                {submitting ? "Processing..." : "Confirm Checkout"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Checkout Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Loan ID: <span className="font-mono">{result.loan_id}</span>
              </p>
            </div>
            <Button onClick={handleReset} className="rounded-xl">
              <RotateCcw size={15} />
              New Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
