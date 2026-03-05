import { useState } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useVendorStore } from "@/stores/vendorStore";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package, AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatKG, formatDate } from "@/lib/formatters";
import type { Grade } from "@/types";

const ITEM_OPTIONS = ["Dal Mash", "Dal Chana", "Dal Moong", "Rice", "Chickpeas", "Red Lentils", "Black Gram"];
const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'B', 'C'];

const Inventory = () => {
  const { batches, addBatch, getTotalStockValue, getLowStockBatches, getUniqueItemCount } = useInventoryStore();
  const { vendors } = useVendorStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (vendors.length === 0) {
      toast.error("Please add a vendor first");
      return;
    }
    addBatch({
      itemName: fd.get("itemName") as string,
      grade: fd.get("grade") as Grade,
      vendorId: fd.get("vendorId") as string,
      purchasePrice: Number(fd.get("purchasePrice")),
      quantity: Number(fd.get("quantity")),
      purchaseDate: fd.get("purchaseDate") as string,
      notes: fd.get("notes") as string || "",
    });
    setOpen(false);
    toast.success("Batch added to inventory");
  };

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown';

  const filtered = batches.filter(b => {
    if (filterItem && b.itemName !== filterItem) return false;
    if (filterGrade && b.grade !== filterGrade) return false;
    if (filterVendor && b.vendorId !== filterVendor) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.itemName.toLowerCase().includes(q) || b.batchRef.toLowerCase().includes(q) || getVendorName(b.vendorId).toLowerCase().includes(q);
    }
    return true;
  });

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Batch-based inventory management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Inventory Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Select name="itemName" required>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {ITEM_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select name="grade" required>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select name="vendorId" required>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Purchase Price (PKR/kg)</Label><Input name="purchasePrice" type="number" required /></div>
                <div className="space-y-2"><Label>Quantity (kg)</Label><Input name="quantity" type="number" required /></div>
              </div>
              <div className="space-y-2"><Label>Purchase Date</Label><Input name="purchaseDate" type="date" required /></div>
              <div className="space-y-2"><Label>Notes (optional)</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Add Batch</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Unique Items" value={String(getUniqueItemCount())} subtitle="In stock" icon={Layers} />
        <KpiCard title="Total Stock Value" value={formatPKR(getTotalStockValue())} subtitle="All batches" icon={Package} />
        <KpiCard title="Low Stock Alerts" value={String(getLowStockBatches().length)} subtitle="Below 100 kg" icon={AlertTriangle} variant={getLowStockBatches().length > 0 ? "danger" : undefined} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search batches..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />
        <Select value={filterItem} onValueChange={(v) => { setFilterItem(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Items" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {ITEM_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVendor} onValueChange={(v) => { setFilterVendor(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {batches.length === 0 ? (
        <EmptyState title="No inventory yet" description="Add your first batch to start tracking inventory." actionLabel="Add First Batch" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Ref</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Price/kg</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.batchRef}</TableCell>
                    <TableCell className="font-medium">{b.itemName}</TableCell>
                    <TableCell>{b.grade}</TableCell>
                    <TableCell>{getVendorName(b.vendorId)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{formatKG(b.quantity)}</TableCell>
                    <TableCell className={`text-right font-medium ${b.remainingQuantity < 100 ? 'status-overdue' : 'status-healthy'}`}>{formatKG(b.remainingQuantity)}</TableCell>
                    <TableCell>{formatDate(b.purchaseDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Inventory;
