import { useEffect, useState } from "react";
import { Search, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { getOperations, onOperationsChange, type Operation } from "../lib/operationQueue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Logs() {
  const [ops, setOps] = useState<Operation[]>(getOperations());
  const [search, setSearch] = useState("");

  useEffect(() => {
    return onOperationsChange(() => setOps(getOperations()));
  }, []);

  const filtered = ops.filter((op) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      op.action.toLowerCase().includes(term) ||
      op.detail.toLowerCase().includes(term) ||
      op.performedBy.toLowerCase().includes(term) ||
      op.status.toLowerCase().includes(term)
    );
  });

  const statusIcon = (status: string) => {
    if (status === "queued") return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
    if (status === "success") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const statusLabel = (status: string) => {
    const styles = {
      queued: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
      failed: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    }[status] || "";
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", styles)}>
        {statusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Operation Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track queued, completed, and failed backend operations.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="h-9 pl-9 rounded-xl glass-card border-0"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {ops.length} operations
      </p>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Trash2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No operations match your search." : "No operations logged yet. Actions like removals and returns will appear here."}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="px-5">Status</TableHead>
                <TableHead className="px-5">Action</TableHead>
                <TableHead className="px-5">Detail</TableHead>
                <TableHead className="px-5">Performed By</TableHead>
                <TableHead className="px-5">Timestamp</TableHead>
                <TableHead className="px-5">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((op) => (
                <TableRow key={op.id} className={cn(
                  "border-b border-border/30 transition-colors",
                  op.status === "failed" && "bg-red-50/50 dark:bg-red-950/20"
                )}>
                  <TableCell className="px-5">{statusLabel(op.status)}</TableCell>
                  <TableCell className="px-5 font-medium">{op.action}</TableCell>
                  <TableCell className="px-5 text-sm">{op.detail}</TableCell>
                  <TableCell className="px-5 text-sm text-muted-foreground">{op.performedBy}</TableCell>
                  <TableCell className="px-5 text-xs text-muted-foreground font-mono">
                    {new Date(op.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-5 text-xs text-red-600 dark:text-red-400">
                    {op.errorMessage || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
