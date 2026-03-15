import { useState, useEffect } from "react";
import { useWasteStore } from "@/stores/wasteStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useVendorStore } from "@/stores/vendorStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Trash2, Filter, Search, Loader2, AlertCircle, Pencil, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatKG, formatPKR, formatDate, getTodayISO } from "@/lib/formatters";
import type { WasteEntry } from "@/types";

const PAGE_SIZE = 10;

export default function WasteManagement() {
  const wasteStore     = useWasteStore();
  const inventoryStore = useInventoryStore();
  const vendorStore    = useVendorStore();

  // ── Add dialog state
  const [dialogOpen, setDialogOpen]           = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [wasteQty, setWasteQty]               = useState("");
  const [date, setDate]                       = useState(getTodayISO());
  const [notes, setNotes]                     = useState("");
  const [submitting, setSubmitting]           = useState(false);

  // ── Edit dialog state
  const [editOpen, setEditOpen]               = useState(false);
  const [editingEntry, setEditingEntry]       = useState<WasteEntry | null>(null);
  const [editWasteQty, setEditWasteQty]       = useState("");
  const [editDate, setEditDate]               = useState("");
  const [editNotes, setEditNotes]             = useState("");
  const [editSubmitting, setEditSubmitting]   = useState(false);

  // ── Delete confirm state
  const [deleteId, setDeleteId]               = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  // ── Mark as sold dialog state
  const [sellOpen, setSellOpen]               = useState(false);
  const [sellingEntry, setSellingEntry]       = useState<WasteEntry | null>(null);
  const [sellPrice, setSellPrice]             = useState("");
  const [sellTo, setSellTo]                   = useState("");
  const [sellDate, setSellDate]               = useState(getTodayISO());
  const [sellSubmitting, setSellSubmitting]   = useState(false);

  // ── Filters
  const [search, setSearch]                   = useState("");
  const [filterVendor, setFilterVendor]       = useState("all");
  const [page, setPage]                       = useState(1);

  useEffect(() => {
    wasteStore.fetchEntries();
    inventoryStore.fetchBatches();
    vendorStore.fetchVendors();
  }, []);

  // ── Only show batches that have NO existing processing record
  const processedBatchIds = new Set(wasteStore.entries.map(e => e.batchId));
  const availableBatches  = inventoryStore.batches.filter(
    b => b.remainingQuantity > 0 && !processedBatchIds.has(b.id)
  );
  const selectedBatch = inventoryStore.batches.find(b => b.id === selectedBatchId);

  const getVendorName = (id: string) =>
    vendorStore.vendors.find(v => v.id === id)?.name || "Unknown";

  const getBatchRef = (id: string) =>
    inventoryStore.batches.find(b => b.id === id)?.batchRef || id.slice(0, 8).toUpperCase();

  // ── Add
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !wasteQty || Number(wasteQty) <= 0) {
      toast.error("Select a batch and enter waste quantity"); return;
    }
    const batch = inventoryStore.batches.find(b => b.id === selectedBatchId);
    if (!batch) { toast.error("Batch not found"); return; }

    const waste      = Number(wasteQty);
    const cleanedQty = batch.remainingQuantity - waste;

    if (waste > batch.remainingQuantity) {
      toast.error(`Waste cannot exceed remaining quantity (${formatKG(batch.remainingQuantity)})`); return;
    }

    setSubmitting(true);
    const result = await wasteStore.addEntry({
      date,
      batchId:          selectedBatchId,
      vendorId:         batch.vendorId,
      itemName:         batch.itemName,
      grade:            batch.grade,
      originalQuantity: batch.remainingQuantity,
      wasteQuantity:    waste,
      cleanedQuantity:  cleanedQty,
      notes,
    });
    setSubmitting(false);

    if (result) {
      toast.success(`Cleansing recorded — ${formatKG(waste)} waste removed, ${formatKG(cleanedQty)} remains`);
      setSelectedBatchId(""); setWasteQty(""); setNotes(""); setDate(getTodayISO());
      setDialogOpen(false);
    } else {
      toast.error(wasteStore.error ?? "Failed to record cleansing");
    }
  };

  // ── Open edit dialog
  const openEditDialog = (entry: WasteEntry) => {
    setEditingEntry(entry);
    setEditWasteQty(String(entry.wasteQuantity));
    setEditDate(entry.date);
    setEditNotes(entry.notes ?? "");
    setEditOpen(true);
  };

  // ── Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const newWaste   = Number(editWasteQty);
    const newCleaned = editingEntry.originalQuantity - newWaste;

    if (newWaste <= 0) { toast.error("Waste quantity must be greater than 0"); return; }
    if (newCleaned < 0) { toast.error("Waste cannot exceed original quantity"); return; }

    setEditSubmitting(true);
    const ok = await wasteStore.editEntry(editingEntry.processingId, {
      wasteQuantity:   newWaste,
      cleanedQuantity: newCleaned,
      notes:           editNotes,
      date:            editDate,
    });
    setEditSubmitting(false);

    if (ok) {
      toast.success("Waste record updated");
      setEditOpen(false); setEditingEntry(null);
    } else {
      toast.error(wasteStore.error ?? "Failed to update record");
    }
  };

  // ── Delete
  const handleDelete = async (entryId: string) => {
    setDeleting(true);
    const result = await wasteStore.deleteEntry(entryId);
    setDeleting(false);
    setDeleteId(null);
    if (result.success) {
      toast.success("Waste record deleted — stock restored to batch");
    } else {
      toast.error(result.reason || "Cannot delete this record");
    }
  };

  // ── Open sell dialog
  const openSellDialog = (entry: WasteEntry) => {
    setSellingEntry(entry);
    setSellPrice("");
    setSellTo("");
    setSellDate(getTodayISO());
    setSellOpen(true);
  };

  // ── Submit waste sale
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingEntry) return;

    const price = Number(sellPrice);
    if (price <= 0) { toast.error("Enter a valid price per kg"); return; }

    setSellSubmitting(true);
    const ok = await wasteStore.markAsSold(sellingEntry.id, price, sellTo, sellDate);
    setSellSubmitting(false);

    if (ok) {
      const amount = sellingEntry.wasteQuantity * price;
      toast.success(`Waste sold for ${formatPKR(amount)} — recorded as income`);
      setSellOpen(false); setSellingEntry(null);
    } else {
      toast.error("Failed to record waste sale");
    }
  };

  // ── Filter + sort
  const filtered = [...wasteStore.entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter(e => {
      const matchSearch =
        e.itemName.toLowerCase().includes(search.toLowerCase()) ||
        getBatchRef(e.batchId).toLowerCase().includes(search.toLowerCase()) ||
        getVendorName(e.vendorId).toLowerCase().includes(search.toLowerCase());
      const matchVendor = filterVendor === "all" || e.vendorId === filterVendor;
      return matchSearch && matchVendor;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalWaste        = wasteStore.getTotalWaste();
  const totalCleaned      = wasteStore.entries.reduce((s, e) => s + e.cleanedQuantity, 0);
  const totalSaleRevenue  = wasteStore.getTotalWasteSaleRevenue();
  const deleteTarget      = wasteStore.entries.find(e => e.id === deleteId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Waste Management</h1>
          <p className="text-sm text-muted-foreground">Track cleansing process waste from vendor batches</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={v => {
          setDialogOpen(v);
          if (!v) { setSelectedBatchId(""); setWasteQty(""); setNotes(""); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Record Cleansing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Cleansing Process</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <Label>Select Batch *</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger><SelectValue placeholder="Choose a batch" /></SelectTrigger>
                  <SelectContent>
                    {availableBatches.length === 0
                      ? <SelectItem value="none" disabled>No unprocessed batches available</SelectItem>
                      : availableBatches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batchRef} — {b.itemName} {b.grade} ({formatKG(b.remainingQuantity)})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only unprocessed batches are shown. Each batch can only be processed once.
                </p>
              </div>

              {selectedBatch && (
                <div className="rounded-lg border p-3 bg-muted/50 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item</span>
                    <span>{selectedBatch.itemName} ({selectedBatch.grade})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor</span>
                    <span>{getVendorName(selectedBatch.vendorId)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Available Stock</span>
                    <span>{formatKG(selectedBatch.remainingQuantity)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Waste Quantity (kg) *</Label>
                <Input type="number" value={wasteQty}
                  onChange={e => setWasteQty(e.target.value)}
                  placeholder="Enter waste amount in kg"
                  min={0.1} step={0.1} max={selectedBatch?.remainingQuantity} />
                {selectedBatch && wasteQty && Number(wasteQty) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cleaned stock remaining:{" "}
                    <span className="font-medium text-foreground">
                      {formatKG(selectedBatch.remainingQuantity - Number(wasteQty))}
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes..." rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording...</>
                  : "Record Waste & Update Stock"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Waste"      value={formatKG(totalWaste)}         icon={Trash2} />
        <KpiCard title="Total Cleaned"    value={formatKG(totalCleaned)}       icon={Filter} />
        <KpiCard title="Waste Revenue"    value={formatPKR(totalSaleRevenue)}  icon={ShoppingBag} />
        <KpiCard title="Vendors Affected" value={String(new Set(wasteStore.entries.map(e => e.vendorId)).size)} icon={Search} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search item, batch, vendor..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="sm:max-w-xs" />
        <Select value={filterVendor} onValueChange={v => { setFilterVendor(v); setPage(1); }}>
          <SelectTrigger className="sm:max-w-[200px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendorStore.vendors.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error Banner */}
      {wasteStore.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{wasteStore.error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-destructive"
            onClick={() => wasteStore.fetchEntries()}>Retry</Button>
        </div>
      )}

      {/* Table */}
      {wasteStore.loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /><span>Loading records...</span>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {paged.length === 0 ? (
              <EmptyState title="No waste records found"
                description={wasteStore.entries.length === 0
                  ? "Record your first cleansing process to start tracking waste."
                  : "No records match your current filters."}
                actionLabel={wasteStore.entries.length === 0 ? "Record Cleansing" : undefined}
                onAction={wasteStore.entries.length === 0 ? () => setDialogOpen(true) : undefined} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Waste (kg)</TableHead>
                    <TableHead className="text-right">Cleaned (kg)</TableHead>
                    <TableHead>Waste Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {getBatchRef(e.batchId)}
                      </TableCell>
                      <TableCell className="font-medium">{e.itemName}</TableCell>
                      <TableCell><Badge variant="outline">{e.grade}</Badge></TableCell>
                      <TableCell>{getVendorName(e.vendorId)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatKG(e.wasteQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatKG(e.cleanedQuantity)}
                      </TableCell>
                      <TableCell>
                        {e.isSold ? (
                          <div>
                            <Badge variant="default" className="text-xs">Sold</Badge>
                            {e.saleAmount && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatPKR(e.saleAmount)}
                                {e.soldTo && ` — ${e.soldTo}`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Unsold</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-muted-foreground text-sm">
                        {e.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Edit — only if not sold */}
                          {!e.isSold && (
                            <Button size="sm" variant="ghost"
                              onClick={() => openEditDialog(e)} title="Edit record">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Sell waste — only if not sold */}
                          {!e.isSold && (
                            <Button size="sm" variant="ghost"
                              onClick={() => openSellDialog(e)}
                              title="Mark waste as sold"
                              className="text-muted-foreground hover:text-green-600">
                              <ShoppingBag className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Delete — only if not sold */}
                          {!e.isSold && (
                            <Button size="sm" variant="ghost"
                              onClick={() => setDeleteId(e.id)}
                              title="Delete record"
                              className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setEditingEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Waste Record</DialogTitle></DialogHeader>
          {editingEntry && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="font-mono">{getBatchRef(editingEntry.batchId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item</span>
                  <span>{editingEntry.itemName} ({editingEntry.grade})</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Original Qty</span>
                  <span>{formatKG(editingEntry.originalQuantity)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Waste Quantity (kg) *</Label>
                <Input type="number" value={editWasteQty}
                  onChange={e => setEditWasteQty(e.target.value)}
                  min={0.1} step={0.1}
                  max={editingEntry.originalQuantity} required />
                {editWasteQty && Number(editWasteQty) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Cleaned: <span className="font-medium text-foreground">
                      {formatKG(editingEntry.originalQuantity - Number(editWasteQty))}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={editSubmitting}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Waste Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the waste record for{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget ? `${deleteTarget.itemName} (${getBatchRef(deleteTarget.batchId)})` : "this entry"}
              </span>?
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              The waste quantity will be restored back to the inventory batch.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1"
                onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" disabled={deleting}
                onClick={() => deleteId && handleDelete(deleteId)}>
                {deleting ? "Deleting..." : "Delete & Restore Stock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Sold Dialog */}
      <Dialog open={sellOpen} onOpenChange={v => { setSellOpen(v); if (!v) setSellingEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Waste Sale</DialogTitle></DialogHeader>
          {sellingEntry && (
            <form onSubmit={handleSellSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item</span>
                  <span>{sellingEntry.itemName} ({sellingEntry.grade})</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Waste Quantity</span>
                  <span>{formatKG(sellingEntry.wasteQuantity)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
                Waste sale is recorded as pure profit (Other Income) in cash flow.
              </p>
              <div className="space-y-1">
                <Label>Sale Price per kg (PKR) *</Label>
                <Input type="number" min={1} placeholder="e.g. 5"
                  value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                  autoFocus required />
                {sellPrice && Number(sellPrice) > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    Total: {formatPKR(sellingEntry.wasteQuantity * Number(sellPrice))}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Sold To (optional)</Label>
                <Input value={sellTo} onChange={e => setSellTo(e.target.value)}
                  placeholder="Buyer name or description" />
              </div>
              <div className="space-y-1">
                <Label>Sale Date</Label>
                <Input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setSellOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={sellSubmitting}>
                  {sellSubmitting ? "Saving..." : "Record Sale"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}