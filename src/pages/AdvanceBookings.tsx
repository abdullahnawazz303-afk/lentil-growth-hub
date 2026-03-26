import { useState, useEffect } from "react";
import { useBookingStore } from "@/stores/bookingStore";
import { useVendorStore } from "@/stores/vendorStore";
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
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { BookingItem, Grade, BookingStatus } from "@/types";

const ITEM_OPTIONS = ["دال ماش", "دال چنا", "دال مونگ", "چاول", "چنے", "دال مسور", "ماش کی دال"];
const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'B', 'C'];

const statusColor = (s: BookingStatus) => {
  switch (s) {
    case 'Booked': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Partially Paid': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Fully Paid': return 'bg-green-100 text-green-800 border-green-200';
    case 'Delivered': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Completed': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return '';
  }
};

const AdvanceBookings = () => {
  const { bookings, addBooking, addPayment, updateStatus, markDelivered, fetchBookings } = useBookingStore();
  const { vendors, fetchVendors, addLedgerEntry } = useVendorStore();
  const { addEntry: addCashEntry } = useCashFlowStore();

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 10;

  const [items, setItems] = useState<BookingItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemGrade, setItemGrade] = useState<Grade>("A");
  const [itemQty, setItemQty] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  // Fetch on mount
  useEffect(() => {
    fetchBookings();
    fetchVendors();
  }, []);

  const getVendorName = (id: string) =>
    vendors.find(v => v.id === id)?.name || 'Unknown';

  const addItem = () => {
    const qty = Number(itemQty);
    const price = Number(itemPrice);
    if (!itemName || qty <= 0 || price <= 0) return;
    setItems(prev => [...prev, {
      itemName,
      grade: itemGrade,
      quantity: qty,
      agreedPrice: price,
      subtotal: qty * price,
    }]);
    setItemName("");
    setItemQty("");
    setItemPrice("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("Add at least one item"); return; }

    const fd = new FormData(e.currentTarget);
    const vendorId = fd.get("vendorId") as string;
    const advancePaid = Number(fd.get("advancePaid"));
    const totalValue = items.reduce((s, i) => s + i.subtotal, 0);

    setSubmitting(true);

    const bookingId = await addBooking({
      bookingDate: fd.get("bookingDate") as string || getTodayISO(),
      vendorId,
      expectedDeliveryDate: fd.get("expectedDeliveryDate") as string,
      items,
      advancePaid,
      status: advancePaid >= totalValue ? 'Fully Paid' : advancePaid > 0 ? 'Partially Paid' : 'Booked',
      notes: fd.get("notes") as string || "",
    });

    if (bookingId) {
      // Post purchase liability to vendor ledger
      await addLedgerEntry(vendorId, {
        date: getTodayISO(),
        type: "Purchase",
        description: `Advance booking — total value`,
        debit: 0,
        credit: totalValue,
      });

      // Post advance payment if any
      if (advancePaid > 0) {
        await addLedgerEntry(vendorId, {
          date: getTodayISO(),
          type: "Payment Made",
          description: `Advance payment for booking`,
          debit: advancePaid,
          credit: 0,
        });
        await addCashEntry(getTodayISO(), {
          type: 'out',
          category: 'Vendor Payment',
          amount: advancePaid,
          description: `Advance booking payment`,
        });
      }

      setItems([]);
      setOpen(false);
      toast.success("Advance booking created");
    } else {
      toast.error("Failed to create booking");
    }

    setSubmitting(false);
  };

  // Mark delivered + auto-push to inventory via markDelivered()
  const handleDeliver = async (bookingId: string) => {
    await markDelivered(bookingId);
    toast.success("Booking marked as delivered and stock added to inventory");
  };

  // Legacy push to inventory (only if status is Delivered but not yet Completed)
  const handlePushToInventory = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    if (booking.remainingBalance > 0) {
      toast.error("Clear full payment before pushing to inventory");
      return;
    }
    await updateStatus(bookingId, 'Completed');
    toast.success("Booking marked as completed");
  };

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detailId) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const booking = bookings.find(b => b.id === detailId);
    if (!booking) return;
    if (amount <= 0) { toast.error("Payment must be greater than zero"); return; }
    if (amount > booking.remainingBalance) { toast.error("Payment cannot exceed remaining balance"); return; }

    setSubmitting(true);

    await addPayment(detailId, amount, fd.get("notes") as string || "");

    await addLedgerEntry(booking.vendorId, {
      date: getTodayISO(),
      type: "Payment Made",
      description: `Payment for booking`,
      debit: amount,
      credit: 0,
    });

    await addCashEntry(getTodayISO(), {
      type: 'out',
      category: 'Vendor Payment',
      amount,
      description: `Booking payment`,
    });

    setSubmitting(false);
    setPayOpen(false);
    toast.success("Payment recorded");
  };

  const handleDeleteBooking = async (booking: any) => {
    if (booking.status === 'Delivered' || booking.status === 'Completed') {
      toast.error("Cannot delete a delivered booking. Inventory has already been affected.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this booking? Associated ledgers and advances will be automatically reversed.")) return;
    
    setDeletingId(booking.id);
    const ok = await useBookingStore.getState().deleteBooking(booking.id);
    
    if (ok) {
        // Reverse Ledger purchase liability
        await addLedgerEntry(booking.vendorId, {
          date: getTodayISO(),
          type: "Adjustment",
          description: `Reversal of deleted booking`,
          debit: booking.totalValue, // reverse the liability
          credit: 0,
        });

        // Reverse Payments if any were made
        if (booking.advancePaid > 0) {
            await addLedgerEntry(booking.vendorId, {
              date: getTodayISO(),
              type: "Adjustment",
              description: `Refund for deleted booking advance`,
              debit: 0,
              credit: booking.advancePaid,
            });
            await addCashEntry(getTodayISO(), {
              type: 'in',
              category: 'Other Income',
              amount: booking.advancePaid,
              description: `Refund for deleted booking advance`,
            });
        }
        toast.success("Booking deleted and ledger reversed");
    } else {
        toast.error("Failed to delete booking");
    }
    setDeletingId(null);
  };

  const detailBooking = bookings.find(b => b.id === detailId);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.id.toLowerCase().includes(q) ||
      (b.vendorName || getVendorName(b.vendorId)).toLowerCase().includes(q)
    );
  });
 const sorted = [...filtered].sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advance Bookings</h1>
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
                    <SelectContent>
                      {vendors.filter(v => v.isActive).map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Booking Date</Label>
                  <Input name="bookingDate" type="date" defaultValue={getTodayISO()} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input name="expectedDeliveryDate" type="date" required />
              </div>

              {/* Items Builder */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Items</h4>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                    <span className="flex-1">
                      {item.itemName} ({item.grade}) — {formatKG(item.quantity)} × {formatPKR(item.agreedPrice)}
                    </span>
                    <span className="font-semibold">{formatPKR(item.subtotal)}</span>
                    <Button
                      type="button" size="sm" variant="ghost"
                      onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-5 gap-2">
                  <Select value={itemName} onValueChange={setItemName}>
                    <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>
                      {ITEM_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={itemGrade} onValueChange={(v) => setItemGrade(v as Grade)}>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Qty (kg)" type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} />
                  <Input placeholder="Price/kg" type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} />
                  <Button type="button" variant="outline" onClick={addItem}>Add</Button>
                </div>
                {items.length > 0 && (
                  <div className="text-right font-semibold">
                    Total: {formatPKR(items.reduce((s, i) => s + i.subtotal, 0))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Advance Paid (PKR)</Label>
                <Input name="advancePaid" type="number" defaultValue="0" required />
                <p className="text-xs text-muted-foreground">Enter 0 if no advance paid yet.</p>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Create Booking"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search bookings..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="No records found. Create your first advance booking to get started."
          actionLabel="Create Booking"
          onAction={() => setOpen(true)}
        />
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
                    <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">
                      {b.vendorName || getVendorName(b.vendorId)}
                    </TableCell>
                    <TableCell>{formatDate(b.expectedDeliveryDate)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.totalValue)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.advancePaid)}</TableCell>
                    <TableCell className="text-right">{formatPKR(b.remainingBalance)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDetailId(b.id)} title="View Details">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {b.remainingBalance > 0 && b.status !== 'Cancelled' && b.status !== 'Completed' && (
                          <Button size="sm" variant="outline" onClick={() => { setDetailId(b.id); setPayOpen(true); }} title="Record Payment">
                            <CreditCard className="h-3 w-3" />
                          </Button>
                        )}
                        {(b.status === 'Booked' || b.status === 'Partially Paid' || b.status === 'Fully Paid') && (
                          <Button size="sm" variant="outline" onClick={() => handleDeliver(b.id)} title="Mark Delivered">
                            <Truck className="h-3 w-3" />
                          </Button>
                        )}
                        {b.status === 'Delivered' && (
                          <Button
                            size="sm" variant="outline"
                            disabled={b.remainingBalance > 0}
                            onClick={() => handlePushToInventory(b.id)}
                            title={b.remainingBalance > 0 ? "Clear full payment first" : "Mark Completed"}
                          >
                            <PackagePlus className="h-3 w-3" />
                          </Button>
                        )}
                        {(b.status !== 'Delivered' && b.status !== 'Completed') && (
                          <Button
                            size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteBooking(b)}
                            title="Delete Booking"
                            disabled={deletingId === b.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
                <div><span className="text-muted-foreground">ID:</span> {detailBooking.id.slice(0, 8)}</div>
                <div><span className="text-muted-foreground">Vendor:</span> {detailBooking.vendorName || getVendorName(detailBooking.vendorId)}</div>
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
          {detailBooking && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{detailBooking.vendorName || getVendorName(detailBooking.vendorId)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Remaining Balance</span>
                  <span className="status-overdue">{formatPKR(detailBooking.remainingBalance)}</span>
                </div>
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Amount (PKR)</Label>
                  <Input
                    name="amount" type="number" min="1"
                    max={detailBooking.remainingBalance}
                    required autoFocus
                    placeholder={`Max: ${formatPKR(detailBooking.remainingBalance)}`}
                  />
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setPayOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "Saving..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvanceBookings;