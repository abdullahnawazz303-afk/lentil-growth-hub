import { useState, useEffect } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { useSalesStore } from "@/stores/salesStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatDate } from "@/lib/formatters";

const Customers = () => {
  const { customers, addCustomer, fetchCustomers, getOutstanding, loading } = useCustomerStore();
  const { sales, fetchSales, addPayment } = useSalesStore();

  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  // ── Customer detail dialog
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  // ── Inline payment dialog state
  const [payOpen, setPayOpen]       = useState(false);
  const [payingSale, setPayingSale] = useState<{
    id: string;
    outstanding: number;
    customerName: string;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying]       = useState(false);

  // ── When paying from customer row (no specific sale) —
  //    pick the oldest unpaid sale automatically
  const [pickSaleOpen, setPickSaleOpen]         = useState(false);
  const [pickSaleCustomerId, setPickSaleCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchSales();
  }, []);

  // ── Add customer
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    const id = await addCustomer({
      name:           fd.get("name") as string,
      contactPerson:  fd.get("contactPerson") as string || "",
      phone:          fd.get("phone") as string,
      city:           fd.get("city") as string || "",
      address:        fd.get("address") as string || "",
      openingBalance: Number(fd.get("openingBalance")) || 0,
      creditLimit:    Number(fd.get("creditLimit")) || 0,
      notes:          fd.get("notes") as string || "",
      isActive: true,
    });
    setSubmitting(false);
    if (id) { setOpen(false); toast.success("Customer added"); }
    else toast.error("Failed to add customer");
  };

  // ── Open pay dialog for a specific sale
  const openPayForSale = (saleId: string, outstanding: number, customerName: string) => {
    setPayingSale({ id: saleId, outstanding, customerName });
    setPayAmount(String(outstanding));
    setPayOpen(true);
  };

  // ── Open sale picker for a customer (row-level Pay button)
  const openSalePicker = (customerId: string) => {
    setPickSaleCustomerId(customerId);
    setPickSaleOpen(true);
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

  // ── Filter + paginate
  const filtered = customers.filter((c) => {
    if (!search) return true;
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    );
  });

  const paged      = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const detailCustomer = customers.find((c) => c.id === detailCustomerId);
  const detailSales    = detailCustomerId
    ? sales.filter((s) => s.customerId === detailCustomerId)
    : [];
  const pendingSales   = detailSales.filter((s) => s.outstanding > 0);

  // Sales for the pick-sale dialog
  const pickSalePending = pickSaleCustomerId
    ? sales.filter((s) => s.customerId === pickSaleCustomerId && s.outstanding > 0)
    : [];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage wholesale customer list</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input name="contactPerson" maxLength={100} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input name="phone" required maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" maxLength={50} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opening Balance (PKR)</Label>
                  <Input name="openingBalance" type="number" min="0" defaultValue="0" />
                  <p className="text-xs text-muted-foreground">Amount this customer already owes you.</p>
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit (PKR)</Label>
                  <Input name="creditLimit" type="number" min="0" defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" maxLength={500} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Add Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Search ── */}
      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading customers...</span>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="No records found. Add your first customer to get started."
          actionLabel="Add First Customer"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((c) => {
                  const outstanding = getOutstanding(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell className={`text-right font-medium ${outstanding > 0 ? "text-red-500" : "text-green-600"}`}>
                        {formatPKR(outstanding)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setDetailCustomerId(c.id)}
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {outstanding > 0 && (
                            <Button
                              size="sm" variant="outline"
                              onClick={() => openSalePicker(c.id)}
                              title="Record Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Pick Sale Dialog (when Pay clicked on customer row) ── */}
      <Dialog open={pickSaleOpen} onOpenChange={(v) => { setPickSaleOpen(v); if (!v) setPickSaleCustomerId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Sale to Pay</DialogTitle>
          </DialogHeader>
          {pickSalePending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No outstanding sales found.</p>
          ) : (
            <div className="space-y-2">
              {pickSalePending.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">
                    <p className="font-medium font-mono">{(s as any).saleRef || s.id.slice(0, 8)}</p>
                    <p className="text-muted-foreground">{formatDate(s.date)}</p>
                  </div>
                  <div className="text-right text-sm mr-4">
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-semibold text-red-500">{formatPKR(s.outstanding)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPickSaleOpen(false);
                      openPayForSale(s.id, s.outstanding, s.customerName ?? "");
                    }}
                  >
                    <CreditCard className="h-3 w-3 mr-1" /> Pay
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={payOpen} onOpenChange={(v) => { setPayOpen(v); if (!v) { setPayingSale(null); setPayAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payingSale && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium">{payingSale.customerName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Outstanding: </span>
                  <span className="font-semibold text-red-500">{formatPKR(payingSale.outstanding)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (PKR) *</Label>
                <Input
                  type="number" min={1} max={payingSale.outstanding}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus required
                />
                <p className="text-xs text-muted-foreground">Max: {formatPKR(payingSale.outstanding)}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={paying}>
                  {paying
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    : "Confirm Payment"
                  }
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Customer Detail Dialog ── */}
      <Dialog open={!!detailCustomerId} onOpenChange={(v) => { if (!v) setDetailCustomerId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Profile — {detailCustomer?.name}</DialogTitle>
          </DialogHeader>
          {detailCustomer && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium text-sm">{detailCustomer.phone}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium text-sm">{detailCustomer.city || "—"}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                  <p className={`font-semibold text-sm ${getOutstanding(detailCustomer.id) > 0 ? "text-red-500" : "text-green-600"}`}>
                    {formatPKR(getOutstanding(detailCustomer.id))}
                  </p>
                </div>
              </div>

              {/* Pending sales */}
              {pendingSales.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Pending Payments ({pendingSales.length})</h4>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale Ref</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingSales.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">
                              {(s as any).saleRef || s.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>{formatDate(s.date)}</TableCell>
                            <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatPKR(s.amountPaid)}</TableCell>
                            <TableCell className="text-right text-red-500 font-medium">{formatPKR(s.outstanding)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm" variant="outline"
                                onClick={() => {
                                  setDetailCustomerId(null);
                                  openPayForSale(s.id, s.outstanding, detailCustomer.name);
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" /> Pay
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* All sales */}
              <div>
                <h4 className="font-semibold text-sm mb-2">All Sales ({detailSales.length})</h4>
                {detailSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales yet.</p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale Ref</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailSales.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">
                              {(s as any).saleRef || s.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>{formatDate(s.date)}</TableCell>
                            <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                s.paymentStatus === "Paid" ? "default" :
                                s.paymentStatus === "Unpaid" ? "destructive" : "secondary"
                              }>
                                {s.paymentStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;