import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Package, Users, ScanLine, AlertCircle, ArrowRight, Search, RefreshCw, Inbox, UserPlus, Shield, UserCog, Trash2, Pencil } from "lucide-react";
import { getAllLoans, getAllHardware, getAllUsers } from "../lib/api";
import { initDB, dbGetAllAccounts, dbAddAccount, dbRemoveAccount, dbUpdateAccount } from "../lib/indexedDB";
import { addOperation, resolveOperation } from "@/lib/operationQueue";
import { getCurrentUser } from "@/lib/auth";
import type { Loan, Hardware, User, Account } from "../types";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-queens-blue to-engsoc-purple",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
];

const MAIN_ADMIN_ID = 1;

export default function Dashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("password123");
  const [newRole, setNewRole] = useState<"admin" | "manager">("manager");
  const [addingAccount, setAddingAccount] = useState(false);

  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "manager">("manager");

  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [accountError, setAccountError] = useState("");

  const currentUser = getCurrentUser();
  const performer = currentUser?.name ?? "Staff";

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

  const loadAccounts = useCallback(async () => {
    await initDB();
    const accts = await dbGetAllAccounts();
    setAccounts(accts);
  }, []);

  useEffect(() => { loadData(); loadAccounts(); }, [loadData, loadAccounts]);

  useAutoRefresh(loadData);

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword) return;
    setAddingAccount(true);
    const created = await dbAddAccount(newName.trim(), newUsername.trim(), newPassword, newRole);
    const opId = addOperation("Add Account", `${created.name} (${created.role})`, performer);
    resolveOperation(opId, "success");
    await loadAccounts();
    setNewName("");
    setNewUsername("");
    setNewPassword("password123");
    setNewRole("manager");
    setAddingAccount(false);
    setAddOpen(false);
  }

  function requestRemoveAccount(account: Account) {
    setAccountError("");
    if (account.id === MAIN_ADMIN_ID) {
      setAccountError("The main admin account cannot be removed.");
      return;
    }
    if (account.role === "admin") {
      const adminCount = accounts.filter((a) => a.role === "admin").length;
      if (adminCount <= 1) {
        setAccountError("Cannot remove the last admin account.");
        return;
      }
    }
    setDeleteAccount(account);
  }

  async function confirmRemoveAccount() {
    if (!deleteAccount) return;
    const opId = addOperation("Remove Account", `${deleteAccount.name} (${deleteAccount.role})`, performer);
    await dbRemoveAccount(deleteAccount.id);
    resolveOperation(opId, "success");
    setDeleteAccount(null);
    await loadAccounts();
  }

  function openEditAccount(account: Account) {
    setAccountError("");
    if (account.id === MAIN_ADMIN_ID) {
      setAccountError("The main admin account cannot be edited.");
      return;
    }
    setEditAccount(account);
    setEditName(account.name);
    setEditUsername(account.username);
    setEditPassword(account.password);
    setEditRole(account.role);
  }

  async function handleEditAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!editAccount || !editName.trim() || !editUsername.trim() || !editPassword) return;
    if (editAccount.role === "admin" && editRole === "manager") {
      const adminCount = accounts.filter((a) => a.role === "admin").length;
      if (adminCount <= 1) {
        setAccountError("Cannot demote the last admin.");
        return;
      }
    }
    const opId = addOperation("Edit Account", `${editAccount.name} → ${editName.trim()} (${editRole})`, performer);
    await dbUpdateAccount(editAccount.id, editName.trim(), editUsername.trim(), editPassword, editRole);
    resolveOperation(opId, "success");
    setEditAccount(null);
    await loadAccounts();
  }

  const hardwareMap = new Map(hardware.map((h) => [h.asset_tag, h.name]));
  const activeLoans = loans.filter((l) => !l.returned_at);
  const availableItems = hardware.filter((h) => h.available).length;
  const totalItems = hardware.length;
  const totalStudents = users.length;
  const utilizationPct = totalItems > 0 ? Math.round(((totalItems - availableItems) / totalItems) * 100) : 0;

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

      {loading ? <StatSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card glass-card-interactive rounded-2xl p-5 relative overflow-hidden"
            >
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

      {/* Team Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Team Accounts</h3>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Account
          </button>
        </div>

        {accountError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-3">
            <AlertCircle size={16} />{accountError}
          </div>
        )}

        {accounts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No accounts"
            description="Add a team account to get started."
          />
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/30">
            {accounts.map((account, idx) => {
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const RoleIcon = account.role === "admin" ? Shield : UserCog;
              const isMainAdmin = account.id === MAIN_ADMIN_ID;
              return (
                <div key={account.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors">
                  <div className={cn(
                    "h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm",
                    colorClass,
                  )}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium px-2.5 py-1 rounded-full capitalize flex items-center gap-1",
                    account.role === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <RoleIcon className="h-3 w-3" />
                    {account.role}
                  </span>
                  {isMainAdmin ? (
                    <span className="text-[10px] text-muted-foreground/50 px-1.5">protected</span>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditAccount(account)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit account"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => requestRemoveAccount(account)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Remove account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Account</DialogTitle>
            <DialogDescription>
              Create a new account for a team member. They'll appear on the login screen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sarah"
                className="rounded-xl"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g., sarah"
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="password123"
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole("admin")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    newRole === "admin"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-foreground/20 text-muted-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole("manager")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    newRole === "manager"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border hover:border-foreground/20 text-muted-foreground"
                  )}
                >
                  <UserCog className="h-4 w-4" />
                  Manager
                </button>
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || !newUsername.trim() || !newPassword || addingAccount}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addingAccount ? "Adding..." : "Add Account"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccount} onOpenChange={() => { setEditAccount(null); setAccountError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the name or role for this account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAccount} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditRole("admin")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    editRole === "admin"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-foreground/20 text-muted-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setEditRole("manager")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    editRole === "manager"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border hover:border-foreground/20 text-muted-foreground"
                  )}
                >
                  <UserCog className="h-4 w-4" />
                  Manager
                </button>
              </div>
            </div>
            {accountError && (
              <p className="text-xs text-red-500">{accountError}</p>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={() => { setEditAccount(null); setAccountError(""); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editName.trim() || !editUsername.trim() || !editPassword}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Account Confirmation */}
      <Dialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Account</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium">{deleteAccount?.name}</span> from the team? They won't be able to sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteAccount(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmRemoveAccount}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
