import { useState } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useVendorStore } from "@/stores/vendorStore";
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
import { Plus, Trash2, Truck, CreditCard, Eye, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { BookingItem, Grade, BookingStatus } from "@/types";

const ITEM_OPTIONS = ["Dal Mash", "Dal Chana", "Dal Moong", "Rice", "Chickpeas", "Red Lentils", "Black Gram"];
const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'B', 'C'];

const statusVariant = (s: BookingStatus) => {
  switch (s) {
    case 'Booked': return 'secondary';
    case 'Partially Paid': return 'secondary';
    case 'Fully Paid': return 'default';
    case 'Delivered': return 'secondary';
    case 'Completed': return 'default';
    case 'Cancelled': return 'destructive';
    default: return 'secondary';
  }
};

const AdvanceBookings = () => {
  const { bookings, addBooking, addPayment, updateStatus } = useBookingStore();
  const { vendors } = useVendorStore();
  const { addBatch } = useInventoryStore();
  const { addEntry: addCashEntry } = useCashFlowStore();
  const { addLedgerEntry } = useVendorStore();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [items, setItems] = useState<BookingItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemGrade, setItemGrade] = useState<Grade>("A");
  const [itemQty, setItemQty] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown';

  const addItem = () => {
    const qty = Number(itemQty);
    const price = Number(itemPrice);
    if (!itemName || qty <= 0 || price <= 0) return;
    setItems(prev => [...prev, { itemName, grade: itemGrade, quantity: qty, agreedPrice: price, subtotal: qty * price }]);
    setItemName("");
    setItemQty("");
    setItemPrice("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    const fd = new FormData(e.currentTarget);
    const vendorId = fd.get("vendorId") as string;
    const advancePaid = Number(fd.get("advancePaid"));

    const bookingId = addBooking({
      bookingDate: fd.get("bookingDate") as string || getTodayISO(),
      vendorId,
      expectedDeliveryDate: fd.get("expectedDeliveryDate") as string,
      items,
      advancePaid,
      status: advancePaid > 0 ? 'Partially Paid' : 'Booked',
      notes: fd.get("notes") as string || "",
    });

    if (advancePaid > 0) {
      addLedgerEntry(vendorId, { date: getTodayISO(), type: "Purchase", description: `Advance for booking ${bookingId}`, debit: advancePaid, credit: 0 });
      addCashEntry(getTodayISO(), { type: 'out', category: 'Vendor Payment', amount: advancePaid, description: `Advance: ${bookingId}` });
    }

    setItems([]);
    setOpen(false);
    toast.success("Advance booking created");
  };

  const handleDeliver = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    updateStatus(bookingId, 'Delivered');
    addLedgerEntry(booking.vendorId, {
      date: getTodayISO(), type: "Purchase",
      description: `Delivery received: ${bookingId}`,
      debit: booking.totalValue - booking.advancePaid, credit: 0,
    });
    toast.success("Delivery marked — use 'Push to Inventory' to add stock");
  };

  const handlePushToInventory = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    if (booking.remainingBalance > 0) {
      toast.error("Clear remaining payment before pushing to inventory");
      return;
    }

    for (const item of booking.items) {
      addBatch({
        itemName: item.itemName,
        grade: item.grade,
        vendorId: booking.vendorId,
        purchasePrice: item.agreedPrice,
        quantity: item.quantity,
        purchaseDate: getTodayISO(),
        notes: `From booking ${bookingId}`,
      });
    }
    updateStatus(bookingId, 'Completed');
    toast.success("Stock pushed to main inventory");
  };

  const handlePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detailId) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const booking = bookings.find(b => b.id === detailId);
    if (!booking) return;
    if (amount <= 0) { toast.error("Payment must be greater than zero"); return; }
    if (amount > booking.remainingBalance) { toast.error("Payment cannot exceed remaining balance"); return; }

    addPayment(detailId, amount, fd.get("notes") as string || "");
    addLedgerEntry(booking.vendorId, { date: getTodayISO(), type: "Payment Made", description: `Payment: ${detailId}`, debit: 0, credit: amount });
    addCashEntry(getTodayISO(), { type: 'out', category: 'Vendor Payment', amount, description: `Booking payment: ${detailId}` });

    setPayOpen(false);
    toast.success("Payment recorded");
  };

  const detailBooking = bookings.find(b => b.id === detailId);
  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.id.toLowerCase().includes(q) || getVendorName(b.vendorId).toLowerCase().includes(q);
  });
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Advance Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage vendor contracts and advance payments</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setItems([]); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Advance Booking</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select name="vendorId" required>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Booking Date</Label><Input name="bookingDate" type="date" defaultValue={getTodayISO()} required /></div>
              </div>
              <div className="space-y-2"><Label>Expected Delivery Date</Label><Input name="expectedDeliveryDate" type="date" required /></div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Items</h4>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                    <span className="flex-1">{item.itemName} ({item.grade}) — {formatKG(item.quantity)} × {formatPKR(item.agreedPrice)}</span>
                    <span className="font-semibold">{formatPKR(item.subtotal)}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                <div className="grid grid-cols-5 gap-2">
                  <Select value={itemName} onValueChange={setItemName}>
                    <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>{ITEM_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={itemGrade} onValueChange={(v) => setItemGrade(v as Grade)}>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>{GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Qty (kg)" type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} />
                  <Input placeholder="Price/kg" type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} />
                  <Button type="button" variant="outline" onClick={addItem}>Add</Button>
                </div>
                {items.length > 0 && <div className="text-right font-semibold">Total: {formatPKR(items.reduce((s, i) => s + i.subtotal, 0))}</div>}
              </div>

              <div className="space-y-2"><Label>Advance Paid (PKR)</Label><Input name="advancePaid" type="number" defaultValue="0" required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Create Booking</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search bookings..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Create your first advance booking." actionLabel="Create Booking" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.id}</TableCell>
                    <TableCell className="font-medium">{getVendorName(b.vendorId)}</TableCell>
                    <TableCell>{formatDate(b.expectedDeliveryDate)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.totalValue)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.advancePaid)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.remainingBalance)}</TableCell>
                    <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDetailId(b.id)}><Eye className="h-3 w-3" /></Button>
                        {(b.status === 'Booked' || b.status === 'Partially Paid' || b.status === 'Fully Paid' || b.status === 'Delivered') && b.remainingBalance > 0 && (
                          <Button size="sm" variant="outline" onClick={() => { setDetailId(b.id); setPayOpen(true); }} title="Record Payment"><CreditCard className="h-3 w-3" /></Button>
                        )}
                        {(b.status === 'Booked' || b.status === 'Partially Paid' || b.status === 'Fully Paid') && (
                          <Button size="sm" variant="outline" onClick={() => handleDeliver(b.id)} title="Mark Delivered"><Truck className="h-3 w-3" /></Button>
                        )}
                        {b.status === 'Delivered' && (
                          <Button size="sm" variant="outline" disabled={b.remainingBalance > 0} onClick={() => handlePushToInventory(b.id)} title={b.remainingBalance > 0 ? "Pay full remaining first" : "Push to Inventory"}><PackagePlus className="h-3 w-3" /></Button>
                        )}
                      </div>
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

      {/* Detail Dialog */}
      <Dialog open={!!detailId && !payOpen} onOpenChange={(v) => { if (!v) setDetailId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
          {detailBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> {detailBooking.id}</div>
                <div><span className="text-muted-foreground">Vendor:</span> {getVendorName(detailBooking.vendorId)}</div>
                <div><span className="text-muted-foreground">Booking Date:</span> {formatDate(detailBooking.bookingDate)}</div>
                <div><span className="text-muted-foreground">Delivery:</span> {formatDate(detailBooking.expectedDeliveryDate)}</div>
                <div><span className="text-muted-foreground">Total:</span> {formatPKR(detailBooking.totalValue)}</div>
                <div><span className="text-muted-foreground">Remaining:</span> {formatPKR(detailBooking.remainingBalance)}</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Items</h4>
                {detailBooking.items.map((item, idx) => (
                  <div key={idx} className="text-sm py-1 border-b last:border-0">
                    {item.itemName} ({item.grade}) — {formatKG(item.quantity)} × {formatPKR(item.agreedPrice)} = {formatPKR(item.subtotal)}
                  </div>
                ))}
              </div>
              {detailBooking.payments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Payment History</h4>
                  {detailBooking.payments.map(p => (
                    <div key={p.id} className="text-sm py-1 border-b last:border-0">
                      {formatDate(p.date)} — {formatPKR(p.amount)} {p.notes && `(${p.notes})`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2"><Label>Amount (PKR)</Label><Input name="amount" type="number" min="0.01" max={detailBooking?.remainingBalance ?? undefined} step="0.01" required /></div>
            <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
            <Button type="submit" className="w-full">Record Payment</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvanceBookings;
