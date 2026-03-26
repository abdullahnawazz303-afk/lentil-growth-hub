import { useState, useEffect } from "react";
import { useSalesStore } from "@/stores/salesStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { EmptyState } from "@/components/EmptyState";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { SaleItem } from "@/types";

const Sales = () => {
  const { sales, addSale, addPayment, deleteSale, fetchSales, loading } = useSalesStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { batches, fetchBatches } = useInventoryStore();

  // ── New sale dialog state
  const [open, setOpen]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentBatch, setCurrentBatch] = useState("");
  const [currentQty, setCurrentQty]     = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [saleDate, setSaleDate]   = useState(getTodayISO());
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes]         = useState("");

  // ── Payment dialog state
  const [payOpen, setPayOpen]         = useState(false);
  const [payingSale, setPayingSale]   = useState<{ id: string; outstanding: number; customerName: string } | null>(null);
  const [payAmount, setPayAmount]     = useState("");
  const [paying, setPaying]           = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  // ── Table filters
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const pageSize = 10;

  // ── Load data on mount
  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchBatches();
  }, []);

  // ── Batches available for selection (subtract qty already added to current sale)
  const availableBatches = batches
    .map((b) => {
      const usedInSale = saleItems
        .filter((i) => i.batchId === b.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      return { ...b, remainingQuantity: b.remainingQuantity - usedInSale };
    })
    .filter((b) => b.remainingQuantity > 0);

  const getBatchDisplay = (id: string) => {
    const b = batches.find((bt) => bt.id === id);
    return b ? `${b.itemName} (${b.grade})` : "Unknown";
  };

  // ── Add item to current sale
  const addSaleItem = () => {
    const batch = availableBatches.find((b) => b.id === currentBatch);
    if (!batch) { toast.error("Select a batch first"); return; }

    const qty   = Number(currentQty);
    const price = Number(currentPrice);

    if (qty <= 0)  { toast.error("Quantity must be greater than 0"); return; }
    if (price <= 0) { toast.error("Price must be greater than 0"); return; }
    if (qty > batch.remainingQuantity) {
      toast.error(`Only ${formatKG(batch.remainingQuantity)} available in this batch`);
      return;
    }

    setSaleItems((prev) => [
      ...prev,
      {
        batchId: currentBatch,
        itemName: batch.itemName,
        grade: batch.grade,
        quantity: qty,
        salePrice: price,
        subtotal: qty * price,
      },
    ]);

    setCurrentBatch("");
    setCurrentQty("");
    setCurrentPrice("");
  };

  const removeSaleItem = (idx: number) =>
    setSaleItems((prev) => prev.filter((_, i) => i !== idx));

  const totalSaleAmount = saleItems.reduce((s, i) => s + i.subtotal, 0);

  const resetSaleForm = () => {
    setSaleItems([]);
    setSelectedCustomer("");
    setSaleDate(getTodayISO());
    setAmountPaid("0");
    setNotes("");
    setCurrentBatch("");
    setCurrentQty("");
    setCurrentPrice("");
  };

  // ── Submit new sale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer)    { toast.error("Please select a customer"); return; }
    if (saleItems.length === 0) { toast.error("Add at least one item"); return; }

    const paid = Number(amountPaid);
    if (paid < 0) { toast.error("Amount paid cannot be negative"); return; }
    if (paid > totalSaleAmount) { toast.error("Amount paid cannot exceed total"); return; }

    setSubmitting(true);

    const id = await addSale({
      date: saleDate,
      customerId: selectedCustomer,
      items: saleItems,
      totalAmount: totalSaleAmount,
      amountPaid: paid,
      notes,
    });

    setSubmitting(false);

    if (id) {
      toast.success("Sale recorded successfully");
      resetSaleForm();
      setOpen(false);
    } else {
      const errorMsg = useSalesStore.getState().error || "Failed to save sale. Please try again.";
      toast.error(errorMsg);
    }
  };

  // ── Open payment dialog
  const openPayDialog = (sale: typeof sales[0]) => {
    setPayingSale({
      id: sale.id,
      outstanding: sale.outstanding,
      customerName: sale.customerName ?? "",
    });
    setPayAmount(String(sale.outstanding));
    setPayOpen(true);
  };

  // ── Submit payment
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSale) return;

    const amount = Number(payAmount);
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > payingSale.outstanding) {
      toast.error(`Cannot exceed outstanding: ${formatPKR(payingSale.outstanding)}`);
      return;
    }

    setPaying(true);
    const result = await addPayment(payingSale.id, amount);
    setPaying(false);

    if (result) {
      toast.success(`${formatPKR(amount)} payment recorded`);
      setPayOpen(false);
      setPayingSale(null);
      setPayAmount("");
    } else {
      toast.error("Payment failed. Please try again.");
    }
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm("Are you sure you want to delete this sale? This will automatically reverse inventory and adjust the customer's ledger.")) return;
    setDeletingSaleId(saleId);
    const { success, error } = await deleteSale(saleId);
    setDeletingSaleId(null);
    if (success) {
      toast.success("Sale deleted and ledgers reversed successfully");
    } else {
      toast.error(error || "Failed to delete sale");
    }
  };

  // ── Filter + paginate
  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.customerName ?? "").toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  const paged      = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-muted-foreground">
            Record sales and track customer payments
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetSaleForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Customer + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter((c) => c.isActive).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Items section */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Items *</h4>

                {/* Added items list */}
                {saleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm bg-muted p-2 rounded"
                  >
                    <span className="flex-1">
                      {item.itemName} ({item.grade}) — {formatKG(item.quantity)} ×{" "}
                      {formatPKR(item.salePrice)}
                    </span>
                    <span className="font-semibold">{formatPKR(item.subtotal)}</span>
                    <Button
                      type="button" size="sm" variant="ghost"
                      onClick={() => removeSaleItem(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Add item row */}
                <div className="grid grid-cols-4 gap-2">
                  <Select value={currentBatch} onValueChange={setCurrentBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.length === 0 ? (
                        <SelectItem value="none" disabled>No stock available</SelectItem>
                      ) : (
                        availableBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.itemName} {b.grade} — {formatKG(b.remainingQuantity)} avail (PKR {b.purchasePrice}/kg)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Qty (kg)"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                  />
                  <Input
                    placeholder="Price/kg"
                    type="number"
                    min={1}
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addSaleItem}>
                    Add
                  </Button>
                </div>

                {saleItems.length > 0 && (
                  <div className="text-right font-semibold text-base">
                    Total:{" "}
                    <span className="text-primary">{formatPKR(totalSaleAmount)}</span>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label>Amount Paid Now (PKR)</Label>
                <Input
                  type="number"
                  min={0}
                  max={totalSaleAmount}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
                {totalSaleAmount > 0 && Number(amountPaid) < totalSaleAmount && (
                  <p className="text-xs text-amber-600">
                    Outstanding after this sale:{" "}
                    {formatPKR(totalSaleAmount - Number(amountPaid))}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Sale"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Search ── */}
      <Input
        placeholder="Search by customer name or sale ID..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading sales...</span>
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="Record your first sale to get started."
          actionLabel="Record First Sale"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {(s as any).saleRef || s.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{s.customerName}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.amountPaid)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        s.outstanding > 0 ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {formatPKR(s.outstanding)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.paymentStatus === "Paid"
                            ? "default"
                            : s.paymentStatus === "Unpaid"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        {s.outstanding > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPayDialog(s)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingSaleId === s.id}
                        >
                          {deletingSaleId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Payment Dialog (inline — no external dependency) ── */}
      <Dialog
        open={payOpen}
        onOpenChange={(v) => {
          setPayOpen(v);
          if (!v) { setPayingSale(null); setPayAmount(""); }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {payingSale && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium">{payingSale.customerName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Outstanding: </span>
                  <span className="font-semibold text-red-500">
                    {formatPKR(payingSale.outstanding)}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (PKR) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={payingSale.outstanding}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Max: {formatPKR(payingSale.outstanding)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPayOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={paying}>
                  {paying ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    "Confirm Payment"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;