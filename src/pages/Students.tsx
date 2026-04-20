// Students.tsx — CRUD page for student accounts.
//   • Register: validates the net ID, student number, and name client-side
//     (src/lib/sanitize.ts has the regex rules). Duplicates are checked
//     against the currently-loaded list too — the backend is still the
//     real source of truth.
//   • Remove: optimistic (same pattern as Inventory).

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, AlertCircle, Users, Search, RefreshCw, Download } from "lucide-react";
import { getAllUsers, addUser, removeUser } from "../lib/api";
import { sanitizeInput, isValidName, isValidNetId, isValidStudentNumber } from "../lib/sanitize";
import type { User } from "../types";
import TableSkeleton from "../components/TableSkeleton";
import { useToast } from "@/components/ui/toast";
import { addOperation, resolveOperation } from "@/lib/operationQueue";
import { getCurrentUser } from "@/lib/auth";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import Pagination, { paginate } from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { exportToCSV } from "../lib/csvExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Students() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formNetId, setFormNetId] = useState("");
  const [formStudentNum, setFormStudentNum] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteStudentNum, setDeleteStudentNum] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { addToast, updateToast } = useToast();

  const loadStudents = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setStudents(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const refresh = useAutoRefresh(loadStudents);

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  }

  async function handleAdd() {
    if (!formName.trim() || !formNetId.trim() || !formStudentNum.trim()) return;
    if (!isValidName(formName.trim())) { setError("Invalid name."); return; }
    if (!isValidNetId(formNetId.trim())) { setError("Invalid Net ID."); return; }
    if (!isValidStudentNumber(formStudentNum.trim())) { setError("Invalid student number (6-12 digits)."); return; }

    // Check for duplicate net_id or student_number in local state
    const duplicateNetId = students.find((s) => s.net_id.toLowerCase() === formNetId.trim().toLowerCase());
    if (duplicateNetId) { setError("A student with this Net ID already exists."); return; }
    const duplicateStudentNum = students.find((s) => s.student_number === formStudentNum.trim());
    if (duplicateStudentNum) { setError("A student with this student number already exists."); return; }

    setAdding(true);
    setError("");
    try {
      const performer = getCurrentUser()?.name ?? "Staff";
      const opId = addOperation("Add Student", `${formName.trim()} (${formNetId.trim()})`, performer);
      const created = await addUser(
        sanitizeInput(formName.trim()),
        sanitizeInput(formNetId.trim()),
        sanitizeInput(formStudentNum.trim())
      );
      resolveOperation(opId, "success");
      setStudents((prev) => [...prev, created]);
      setFormName(""); setFormNetId(""); setFormStudentNum("");
      setShowForm(false);
      addToast(`Registered ${created.name}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(studentNumber: string) {
    setDeleteStudentNum(null);
    setError("");

    const student = students.find((s) => s.student_number === studentNumber);
    const detail = student ? `${student.name} (${student.net_id})` : studentNumber;

    // optimistic: remove from UI immediately
    setStudents((prev) => prev.filter((s) => s.student_number !== studentNumber));

    const performer = getCurrentUser()?.name ?? "Staff";
    const opId = addOperation("Remove Student", detail, performer);
    const toastId = addToast(`Queued removal: ${detail}`, "loading");

    try {
      await removeUser(studentNumber);
      resolveOperation(opId, "success");
      updateToast(toastId, `Removed ${detail}`, "success");
    } catch (err) {
      // rollback
      if (student) setStudents((prev) => [...prev, student]);
      const msg = err instanceof Error ? err.message : "Failed to remove student";
      resolveOperation(opId, "failed", msg);
      updateToast(toastId, `Failed to remove ${detail}`, "error");
      setError(msg);
    }
  }

  const filtered = students.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.net_id.toLowerCase().includes(term) ||
      s.student_number.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage registered students in the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground search-icon" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search students..."
              className="h-9 pl-9 rounded-xl glass-card border-0"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0" title="Export CSV"
            onClick={() => exportToCSV("students", ["Name", "Net ID", "Student Number"], filtered.map((s) => [s.name, s.net_id, s.student_number]))}>
            <Download size={15} />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-xl shrink-0 hover:scale-[1.02] transition-transform">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Student</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Register New Student</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" className="h-10 rounded-xl" />
            <Input value={formNetId} onChange={(e) => setFormNetId(e.target.value)} placeholder="Net ID" className="h-10 rounded-xl" />
            <Input value={formStudentNum} onChange={(e) => setFormStudentNum(e.target.value)} placeholder="Student number" className="h-10 rounded-xl" />
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleAdd} disabled={adding || !formName.trim() || !formNetId.trim() || !formStudentNum.trim()} className="rounded-xl">
              {adding ? "Adding..." : "Register"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormName(""); setFormNetId(""); setFormStudentNum(""); }} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        Showing {filtered.length} of {students.length} students
        <button
          onClick={handleManualRefresh}
          className="inline-flex items-center p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Refresh data"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </button>
      </p>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No matches found" : "No students yet"}
          description={search ? "No students match your search." : "Register your first student to get started."}
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="px-5">Name</TableHead>
                <TableHead className="px-5">Net ID</TableHead>
                <TableHead className="px-5">Student Number</TableHead>
                <TableHead className="px-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginate(filtered, page, pageSize).map((student) => (
                <TableRow key={student.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                  <TableCell className="px-5 font-medium">{student.name}</TableCell>
                  <TableCell className="px-5">{student.net_id}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{student.student_number}</TableCell>
                  <TableCell className="px-5 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteStudentNum(student.student_number)}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination totalItems={filtered.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      <Dialog open={!!deleteStudentNum} onOpenChange={() => setDeleteStudentNum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStudentNum(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteStudentNum && handleRemove(deleteStudentNum)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
