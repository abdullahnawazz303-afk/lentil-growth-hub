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
import { Plus, Package, AlertTriangle, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatKG, formatDate } from "@/lib/formatters";
import type { Grade } from "@/types";

const ITEM_OPTIONS = ["دال ماش", "دال چنا", "دال مونگ", "چاول", "چنے", "دال مسور", "ماش کی دال"];
const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'B', 'C'];

interface BatchLineItem {
  itemName: string;
  grade: Grade;
  purchasePrice: number;
  quantity: number;
}

const emptyLine = (): BatchLineItem => ({ itemName: "", grade: "A" as Grade, purchasePrice: 0, quantity: 0 });

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

  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BatchLineItem[]>([emptyLine()]);

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof BatchLineItem, value: string | number) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const resetForm = () => {
    setVendorId("");
    setPurchaseDate("");
    setNotes("");
    setLines([emptyLine()]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (vendors.length === 0) { toast.error("Please add a vendor first"); return; }
    if (!vendorId || !purchaseDate) { toast.error("Select vendor and date"); return; }
    const validLines = lines.filter(l => l.itemName && l.quantity > 0 && l.purchasePrice > 0);
    if (validLines.length === 0) { toast.error("Add at least one valid item"); return; }

    validLines.forEach(l => {
      addBatch({
        itemName: l.itemName,
        grade: l.grade,
        vendorId,
        purchasePrice: l.purchasePrice,
        quantity: l.quantity,
        purchaseDate,
        notes,
      });
    });
    resetForm();
    setOpen(false);
    toast.success(`${validLines.length} item(s) added to inventory`);
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Inventory Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select value={vendorId} onValueChange={setVendorId} required>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_1fr_1fr_32px] gap-2 items-end rounded-md border p-3 bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-xs">Item</Label>
                      <Select value={line.itemName} onValueChange={v => updateLine(i, "itemName", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Item" /></SelectTrigger>
                        <SelectContent>
                          {ITEM_OPTIONS.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Grade</Label>
                      <Select value={line.grade} onValueChange={v => updateLine(i, "grade", v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price/kg</Label>
                      <Input type="number" className="h-9" value={line.purchasePrice || ""} onChange={e => updateLine(i, "purchasePrice", Number(e.target.value))} placeholder="PKR" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty (kg)</Label>
                      <Input type="number" className="h-9" value={line.quantity || ""} onChange={e => updateLine(i, "quantity", Number(e.target.value))} placeholder="kg" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2"><Label>Notes (optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button type="submit" className="w-full">Add {lines.length > 1 ? `${lines.length} Items` : "Batch"}</Button>
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
