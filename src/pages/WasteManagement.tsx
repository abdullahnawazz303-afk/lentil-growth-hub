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
import { Plus, Trash2, Filter, Search, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatKG, formatDate, getTodayISO } from "@/lib/formatters";

const PAGE_SIZE = 10;

export default function WasteManagement() {
  const wasteStore     = useWasteStore();
  const inventoryStore = useInventoryStore();
  const vendorStore    = useVendorStore();

  const [dialogOpen, setDialogOpen]           = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [wasteQty, setWasteQty]               = useState("");
  const [date, setDate]                       = useState(getTodayISO());
  const [notes, setNotes]                     = useState("");
  const [search, setSearch]                   = useState("");
  const [filterVendor, setFilterVendor]       = useState("all");
  const [page, setPage]                       = useState(1);
  const [submitting, setSubmitting]           = useState(false);

  // ── Load all data on mount
  useEffect(() => {
    wasteStore.fetchEntries();
    inventoryStore.fetchBatches();
    vendorStore.fetchVendors();
  }, []);

  // ── Debug: log state every render (remove after fixing)
  useEffect(() => {
    console.log("[WasteManagement] entries:", wasteStore.entries);
    console.log("[WasteManagement] loading:", wasteStore.loading);
    console.log("[WasteManagement] error:", wasteStore.error);
  }, [wasteStore.entries, wasteStore.loading, wasteStore.error]);

  const batches       = inventoryStore.batches.filter((b) => b.remainingQuantity > 0);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const getVendorName = (id: string) =>
    vendorStore.vendors.find((v) => v.id === id)?.name || "Unknown";

  const getBatchRef = (id: string) =>
    inventoryStore.batches.find((b) => b.id === id)?.batchRef || id.slice(0, 8).toUpperCase();

  // ── Submit cleansing record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBatchId || !wasteQty || Number(wasteQty) <= 0) {
      toast.error("Select a batch and enter waste quantity");
      return;
    }

    const batch = inventoryStore.batches.find((b) => b.id === selectedBatchId);
    if (!batch) { toast.error("Batch not found"); return; }

    const waste      = Number(wasteQty);
    const cleanedQty = batch.remainingQuantity - waste;

    if (waste > batch.remainingQuantity) {
      toast.error(`Waste cannot exceed remaining quantity (${formatKG(batch.remainingQuantity)})`);
      return;
    }

    if (cleanedQty < 0) {
      toast.error("Cleaned quantity cannot be negative");
      return;
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
      toast.success(
        `Cleansing recorded — ${formatKG(waste)} waste removed, ${formatKG(cleanedQty)} remains in stock`
      );
      setSelectedBatchId("");
      setWasteQty("");
      setNotes("");
      setDate(getTodayISO());
      setDialogOpen(false);
    } else {
      toast.error(wasteStore.error ?? "Failed to record cleansing");
    }
  };

  // ── Sort latest first, then filter
  const filtered = [...wasteStore.entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((e) => {
      const matchSearch =
        e.itemName.toLowerCase().includes(search.toLowerCase()) ||
        getBatchRef(e.batchId).toLowerCase().includes(search.toLowerCase()) ||
        getVendorName(e.vendorId).toLowerCase().includes(search.toLowerCase());
      const matchVendor = filterVendor === "all" || e.vendorId === filterVendor;
      return matchSearch && matchVendor;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalWaste    = wasteStore.getTotalWaste();
  const totalCleaned  = wasteStore.entries.reduce((s, e) => s + e.cleanedQuantity, 0);
  const uniqueVendors = new Set(wasteStore.entries.map((e) => e.vendorId)).size;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Waste Management</h1>
          <p className="text-sm text-muted-foreground">
            Track cleansing process waste from vendor batches
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) { setSelectedBatchId(""); setWasteQty(""); setNotes(""); }
          }}
        >
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Record Cleansing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Cleansing Process</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Select Batch *</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.length === 0
                      ? <SelectItem value="none" disabled>No batches with stock</SelectItem>
                      : batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batchRef} — {b.itemName} {b.grade} ({formatKG(b.remainingQuantity)})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* Batch details preview */}
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
                <Input
                  type="number"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  placeholder="Enter waste amount in kg"
                  min={0.1}
                  step={0.1}
                  max={selectedBatch?.remainingQuantity}
                />
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
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording...</>
                  : "Record Waste & Update Stock"
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Waste"      value={formatKG(totalWaste)}   icon={Trash2} />
        <KpiCard title="Total Cleaned"    value={formatKG(totalCleaned)} icon={Filter} />
        <KpiCard title="Vendors Affected" value={String(uniqueVendors)}  icon={Search} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search item, batch, vendor..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="sm:max-w-xs"
        />
        <Select
          value={filterVendor}
          onValueChange={(v) => { setFilterVendor(v); setPage(1); }}
        >
          <SelectTrigger className="sm:max-w-[200px]">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendorStore.vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Error Banner ── */}
      {wasteStore.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error loading data: {wasteStore.error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-destructive"
            onClick={() => wasteStore.fetchEntries()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      {wasteStore.loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading records...</span>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {paged.length === 0 ? (
              <EmptyState
                title="No waste records found"
                description={
                  wasteStore.entries.length === 0
                    ? "Record your first cleansing process to start tracking waste."
                    : "No records match your current filters."
                }
                actionLabel={wasteStore.entries.length === 0 ? "Record Cleansing" : undefined}
                onAction={wasteStore.entries.length === 0 ? () => setDialogOpen(true) : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Original (kg)</TableHead>
                    <TableHead className="text-right">Waste (kg)</TableHead>
                    <TableHead className="text-right">Cleaned (kg)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {getBatchRef(e.batchId)}
                      </TableCell>
                      <TableCell className="font-medium">{e.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.grade}</Badge>
                      </TableCell>
                      <TableCell>{getVendorName(e.vendorId)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatKG(e.originalQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatKG(e.wasteQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatKG(e.cleanedQuantity)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                        {e.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}