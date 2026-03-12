import { useState } from "react";
import { useSalesStore } from "@/stores/salesStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useCompanyBalanceStore } from "@/stores/companyBalanceStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { SaleItem } from "@/types";

const Sales = () => {
  const { sales, addSale, addPayment } = useSalesStore();
  const { customers, addLedgerEntry } = useCustomerStore();
  const { batches, deductFromBatch } = useInventoryStore();
  const { addEntry: addCashEntry } = useCashFlowStore();
  const companyBalance = useCompanyBalanceStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentBatch, setCurrentBatch] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const availableBatches = batches
    .map(b => {
      const usedInSale = saleItems.filter(i => i.batchId === b.id).reduce((sum, i) => sum + i.quantity, 0);
      return { ...b, remainingQuantity: b.remainingQuantity - usedInSale };
    })
    .filter(b => b.remainingQuantity > 0);
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getVendorName = (id: string) => {
    const batch = batches.find(b => b.vendorId === id);
    return batch ? id : 'Unknown';
  };

  const addSaleItem = () => {
    const batch = batches.find(b => b.id === currentBatch);
    if (!batch) return;
    const qty = Number(currentQty);
    const price = Number(currentPrice);
    if (qty <= 0 || price <= 0 || qty > batch.remainingQuantity) {
      toast.error("Invalid quantity or price. Quantity cannot exceed available stock.");
      return;
    }
    setSaleItems(prev => [...prev, { batchId: currentBatch, quantity: qty, salePrice: price, subtotal: qty * price }]);
    setCurrentBatch("");
    setCurrentQty("");
    setCurrentPrice("");
  };

  const removeSaleItem = (idx: number) => setSaleItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saleItems.length === 0) { toast.error("Add at least one item"); return; }
    const fd = new FormData(e.currentTarget);
    const customerId = fd.get("customerId") as string;
    const amountPaid = Number(fd.get("amountPaid"));
    const totalAmount = saleItems.reduce((s, i) => s + i.subtotal, 0);

    for (const item of saleItems) {
      const ok = deductFromBatch(item.batchId, item.quantity);
      if (!ok) { toast.error("Insufficient stock for one of the items"); return; }
    }

    const saleId = addSale({
      date: fd.get("date") as string || getTodayISO(),
      customerId,
      items: saleItems,
      totalAmount,
      amountPaid,
      notes: fd.get("notes") as string || "",
    });

    // Customer ledger: debit for sale
    addLedgerEntry(customerId, {
      date: getTodayISO(),
      type: "Sale",
      description: `Sale ${saleId}`,
      debit: totalAmount,
      credit: 0,
    });

    // Customer ledger: credit for payment
    if (amountPaid > 0) {
      addLedgerEntry(customerId, {
        date: getTodayISO(),
        type: "Payment Received",
        description: `Payment for sale ${saleId}`,
        debit: 0,
        credit: amountPaid,
      });
      addCashEntry(getTodayISO(), {
        type: 'in',
        category: 'Sale Revenue',
        amount: amountPaid,
        description: `Payment for sale ${saleId}`,
      });
      companyBalance.addSalesIncome(amountPaid);
    }

    setSaleItems([]);
    setOpen(false);
    toast.success("Sale recorded successfully");
  };

  const openPayDialog = (saleId: string) => {
    setPayingSaleId(saleId);
    setPayAmount("");
    setPayOpen(true);
  };

  const handlePayment = () => {
    if (!payingSaleId) return;
    const amount = Number(payAmount);
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }

    const sale = sales.find(s => s.id === payingSaleId);
    if (!sale) return;
    if (amount > sale.outstanding) {
      toast.error(`Cannot exceed outstanding amount of ${formatPKR(sale.outstanding)}`);
      return;
    }

    addPayment(payingSaleId, amount);

    addLedgerEntry(sale.customerId, {
      date: getTodayISO(),
      type: "Payment Received",
      description: `Payment for sale ${payingSaleId}`,
      debit: 0,
      credit: amount,
    });

    addCashEntry(getTodayISO(), {
      type: 'in',
      category: 'Customer Payment',
      amount,
      description: `Payment for sale ${payingSaleId}`,
    });

    companyBalance.addSalesIncome(amount);

    setPayOpen(false);
    setPayingSaleId(null);
    setPayAmount("");
    toast.success(`PKR ${amount.toLocaleString()} payment recorded`);
  };

  const payingSale = sales.find(s => s.id === payingSaleId);

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.id.toLowerCase().includes(q) || getCustomerName(s.customerId).toLowerCase().includes(q);
  });

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Sales</h1>
          <p className="text-sm text-muted-foreground">Record and manage sales transactions</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSaleItems([]); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select name="customerId" required>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.isActive).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={getTodayISO()} required /></div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Items</h4>
                {saleItems.map((item, idx) => {
                  const b = batches.find(bt => bt.id === item.batchId);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <span className="flex-1">{b?.itemName} ({b?.grade}) — {formatKG(item.quantity)} × {formatPKR(item.salePrice)}</span>
                      <span className="font-semibold">{formatPKR(item.subtotal)}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeSaleItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  );
                })}
                <div className="grid grid-cols-4 gap-2">
                  <Select value={currentBatch} onValueChange={setCurrentBatch}>
                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                    <SelectContent>
                      {availableBatches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.itemName} {b.grade} ({formatPKR(b.purchasePrice)}/kg) — {formatKG(b.remainingQuantity)} avail</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Qty (kg)" type="number" value={currentQty} onChange={e => setCurrentQty(e.target.value)} />
                  <Input placeholder="Price/kg" type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} />
                  <Button type="button" variant="outline" onClick={addSaleItem}>Add</Button>
                </div>
                {saleItems.length > 0 && (
                  <div className="text-right font-semibold">Total: {formatPKR(saleItems.reduce((s, i) => s + i.subtotal, 0))}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Amount Paid Now (PKR)</Label>
                <Input name="amountPaid" type="number" defaultValue="0" required />
                <p className="text-xs text-muted-foreground">Enter 0 if customer has not paid anything yet.</p>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Save Sale</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search by customer or sale ID..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      {sales.length === 0 ? (
        <EmptyState title="No sales yet" description="No records found. Record your first sale to get started." actionLabel="Record First Sale" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.id}</TableCell>
                    <TableCell>{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(s.customerId)}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.amountPaid)}</TableCell>
                    <TableCell className={`text-right font-medium ${s.outstanding > 0 ? 'status-overdue' : 'status-healthy'}`}>
                      {formatPKR(s.outstanding)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.paymentStatus === 'Paid' ? 'default' : s.paymentStatus === 'Unpaid' ? 'destructive' : 'secondary'}>
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.outstanding > 0 && (
                        <Button size="sm" variant="outline" onClick={() => openPayDialog(s.id)} title="Record Payment">
                          <CreditCard className="h-3 w-3 mr-1" /> Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={(v) => { setPayOpen(v); if (!v) { setPayingSaleId(null); setPayAmount(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payingSale && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{getCustomerName(payingSale.customerId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale ID</span>
                  <span className="font-mono">{payingSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span>{formatPKR(payingSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="status-healthy">{formatPKR(payingSale.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Outstanding</span>
                  <span className="status-overdue">{formatPKR(payingSale.outstanding)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount Being Paid Now (PKR)</Label>
                <Input
                  type="number"
                  min="1"
                  max={payingSale.outstanding}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={`Max: ${formatPKR(payingSale.outstanding)}`}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Outstanding after this payment: {formatPKR(Math.max(0, payingSale.outstanding - Number(payAmount || 0)))}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setPayOpen(false); setPayingSaleId(null); setPayAmount(""); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handlePayment}>
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
