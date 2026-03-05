import { useState } from "react";
import { useSalesStore } from "@/stores/salesStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { SaleItem } from "@/types";

const Sales = () => {
  const { sales, addSale } = useSalesStore();
  const { customers } = useCustomerStore();
  const { batches, deductFromBatch } = useInventoryStore();
  const { addEntry: addCashEntry } = useCashFlowStore();
  const { addLedgerEntry } = useCustomerStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentBatch, setCurrentBatch] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const availableBatches = batches.filter(b => b.remainingQuantity > 0);
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const addSaleItem = () => {
    const batch = batches.find(b => b.id === currentBatch);
    if (!batch) return;
    const qty = Number(currentQty);
    const price = Number(currentPrice);
    if (qty <= 0 || price <= 0 || qty > batch.remainingQuantity) {
      toast.error("Invalid quantity or price");
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

    // Deduct from batches
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

    // Add to customer ledger
    const outstanding = totalAmount - amountPaid;
    addLedgerEntry(customerId, { date: getTodayISO(), type: "Sale", description: `Sale ${saleId}`, debit: totalAmount, credit: amountPaid });

    // Record cash if paid
    if (amountPaid > 0) {
      addCashEntry(getTodayISO(), { type: 'in', category: 'Sale Revenue', amount: amountPaid, description: `Payment for sale ${saleId}` });
    }

    setSaleItems([]);
    setOpen(false);
    toast.success("Sale recorded successfully");
  };

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
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                    <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                    <SelectContent>
                      {availableBatches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.itemName} {b.grade} — {formatKG(b.remainingQuantity)}</SelectItem>
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

              <div className="space-y-2"><Label>Amount Paid (PKR)</Label><Input name="amountPaid" type="number" defaultValue="0" required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Save Sale</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search by customer or sale ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {sales.length === 0 ? (
        <EmptyState title="No sales yet" description="Record your first sale to get started." actionLabel="Record First Sale" onAction={() => setOpen(true)} />
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
                    <TableCell className={`text-right font-medium ${s.outstanding > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(s.outstanding)}</TableCell>
                    <TableCell>
                      <Badge variant={s.paymentStatus === 'Paid' ? 'default' : s.paymentStatus === 'Unpaid' ? 'destructive' : 'secondary'}>{s.paymentStatus}</Badge>
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
    </div>
  );
};

export default Sales;
