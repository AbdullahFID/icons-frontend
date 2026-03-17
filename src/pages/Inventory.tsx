import { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle, Package, Search } from "lucide-react";
import { getAllHardware, addHardware, removeHardware } from "../lib/api";
import { sanitizeInput } from "../lib/sanitize";
import type { Hardware } from "../types";
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

export default function Inventory() {
  const [items, setItems] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteSerial, setDeleteSerial] = useState<string | null>(null);
  const { addToast, updateToast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await getAllHardware();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const created = await addHardware(sanitizeInput(newName.trim()));
      setItems((prev) => [...prev, created]);
      setNewName("");
      setShowForm(false);
      addToast(`Added "${created.name}" to inventory`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(serialNumber: string) {
    setDeleteSerial(null);
    setError("");

    // find the item for logging
    const item = items.find((i) => i.serial_number === serialNumber);
    const detail = item ? `${item.name} (${item.asset_tag})` : serialNumber;

    // optimistic: remove from UI immediately
    setItems((prev) => prev.filter((i) => i.serial_number !== serialNumber));

    // log the operation and show toast
    const opId = addOperation("Remove Equipment", detail, "Staff");
    const toastId = addToast(`Queued removal: ${detail}`, "loading");

    try {
      await removeHardware(serialNumber);
      resolveOperation(opId, "success");
      updateToast(toastId, `Removed ${detail}`, "success");
    } catch (err) {
      // rollback: add item back
      if (item) setItems((prev) => [...prev, item]);
      const msg = err instanceof Error ? err.message : "Failed to remove item";
      resolveOperation(opId, "failed", msg);
      updateToast(toastId, `Failed to remove ${detail}`, "error");
      setError(msg);
    }
  }

  const filtered = items.filter((item) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.serial_number.toLowerCase().includes(term) ||
      item.asset_tag.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage equipment in the iCons inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment..."
              className="h-9 pl-9 rounded-xl glass-card border-0"
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-xl shrink-0 hover:scale-[1.02] transition-transform">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Item</span>
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
          <h3 className="text-sm font-semibold mb-3">Add New Equipment</h3>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Equipment name (e.g. Oscilloscope)"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 h-10 rounded-xl"
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="rounded-xl">
              {adding ? "Adding..." : "Add"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setNewName(""); }} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {items.length} items
      </p>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No equipment matches your search." : "No equipment in inventory yet."}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="px-5">Name</TableHead>
                <TableHead className="px-5">Serial Number</TableHead>
                <TableHead className="px-5">Asset Tag</TableHead>
                <TableHead className="px-5">Status</TableHead>
                <TableHead className="px-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                  <TableCell className="px-5 font-medium">{item.name}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{item.serial_number}</TableCell>
                  <TableCell className="px-5 font-mono text-xs">{item.asset_tag}</TableCell>
                  <TableCell className="px-5">
                    <StatusBadge variant={item.available ? "available" : "checked-out"} />
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteSerial(item.serial_number)}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteSerial} onOpenChange={() => setDeleteSerial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this item? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSerial(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSerial && handleRemove(deleteSerial)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
