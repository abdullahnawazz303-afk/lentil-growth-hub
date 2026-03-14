import { useState, useEffect } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { useSalesStore } from "@/stores/salesStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatDate, getTodayISO } from "@/lib/formatters";

const CustomerLedger = () => {
  const {
    customers,
    ledgerEntries,
    addLedgerEntry,
    fetchCustomers,
    fetchLedger,
    getOutstanding,
  } = useCustomerStore();

  const { sales, fetchSales, addPayment } = useSalesStore();

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [open, setOpen]           = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Payment dialog state
  const [payOpen, setPayOpen]       = useState(false);
  const [payingSale, setPayingSale] = useState<{
    id: string;
    outstanding: number;
    customerName: string;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying]       = useState(false);

  // ── Load data on mount
  useEffect(() => {
    fetchCustomers();
    fetchSales();
  }, []);

  // ── Fetch ledger when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchLedger(selectedCustomer);
    }
  }, [selectedCustomer]);

  const customer   = customers.find((c) => c.id === selectedCustomer);
  const entries    = ledgerEntries[selectedCustomer] || [];
  const totalDebit  = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  // ── Find a sale by reference_id stored in ledger description
  // Sale entries have description like "Sale SL-20260313-0001"
  // We match by looking up sales for this customer
  const getSaleForEntry = (entry: typeof entries[0]) => {
    if (entry.type !== "Sale") return null;
    // Match by reference_id if available, else try description
    return sales.find(
      (s) =>
        s.customerId === selectedCustomer &&
        s.outstanding > 0 &&
        (
          entry.description?.includes(s.id) ||
          entry.description?.includes((s as any).saleRef ?? "")
        )
    ) ?? null;
  };

  // ── Add manual ledger entry
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd     = new FormData(e.currentTarget);
    const type   = fd.get("type") as string;
    const amount = Number(fd.get("amount"));

    setSubmitting(true);
    await addLedgerEntry(selectedCustomer, {
      date: fd.get("date") as string || getTodayISO(),
      type,
      description: fd.get("description") as string,
      debit:  type === "Sale" || type === "Adjustment" ? amount : 0,
      credit: type === "Payment Received" ? amount : 0,
    });
    setSubmitting(false);
    setOpen(false);
    toast.success("Ledger entry added");
  };

  // ── Open pay dialog
  const openPayDialog = (saleId: string, outstanding: number) => {
    const sale = sales.find((s) => s.id === saleId);
    setPayingSale({
      id: saleId,
      outstanding,
      customerName: sale?.customerName ?? customer?.name ?? "",
    });
    setPayAmount(String(outstanding));
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
      // Refresh ledger to show new credit entry
      fetchLedger(selectedCustomer);
    } else {
      toast.error("Payment failed. Please try again.");
    }
  };

  // ── Export CSV
  const exportCSV = () => {
    if (entries.length === 0) return;
    const headers = "Date,Type,Description,Debit,Credit,Balance\n";
    const rows = entries
      .map((e) => `${e.date},${e.type},${e.description},${e.debit},${e.credit},${e.balance}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `customer-ledger-${customer?.name || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Customer Ledger</h1>
          <p className="text-sm text-muted-foreground">View customer transaction history</p>
        </div>
        <div className="flex gap-2">
          {selectedCustomer && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select name="type" required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Payment Received">Payment Received</SelectItem>
                        <SelectItem value="Adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (PKR)</Label>
                    <Input name="amount" type="number" min="1" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input name="date" type="date" defaultValue={getTodayISO()} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input name="description" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Saving..." : "Add Entry"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {entries.length > 0 && (
            <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
          )}
        </div>
      </div>

      {/* ── Customer Selector ── */}
      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedCustomer ? (
        <EmptyState
          title="Select a customer"
          description="Choose a customer from the dropdown to view their ledger."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description={`No ledger entries for ${customer?.name}. Transactions will appear here automatically when sales are recorded.`}
          actionLabel="Add Entry"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          {/* ── Summary Cards ── */}
          {customer && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="font-semibold">{formatPKR(totalDebit)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className={`font-semibold ${getOutstanding(selectedCustomer) > 0 ? "text-red-500" : "text-green-600"}`}>
                  {formatPKR(getOutstanding(selectedCustomer))}
                </p>
              </div>
            </div>
          )}

          {/* ── Ledger Table ── */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const linkedSale = getSaleForEntry(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.date)}</TableCell>
                      <TableCell>{e.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {e.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.debit > 0 ? formatPKR(e.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.credit > 0 ? formatPKR(e.credit) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(e.balance)}
                      </TableCell>

                      {/* ── Status badge — only for Sale entries ── */}
                      <TableCell>
                        {e.type === "Sale" && (
                          <Badge
                            variant={
                              linkedSale
                                ? linkedSale.paymentStatus === "Paid"
                                  ? "default"
                                  : linkedSale.paymentStatus === "Unpaid"
                                  ? "destructive"
                                  : "secondary"
                                : "secondary"
                            }
                          >
                            {linkedSale?.paymentStatus ?? "Sale"}
                          </Badge>
                        )}
                        {e.type === "Payment Received" && (
                          <Badge variant="default">Received</Badge>
                        )}
                      </TableCell>

                      {/* ── Pay button — only for Sale entries with outstanding > 0 ── */}
                      <TableCell>
                        {e.type === "Sale" && linkedSale && linkedSale.outstanding > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPayDialog(linkedSale.id, linkedSale.outstanding)
                            }
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ── Summary Footer ── */}
          <div className="flex justify-end gap-8 text-sm border-t pt-4">
            <span>Total Sales: <strong>{formatPKR(totalDebit)}</strong></span>
            <span>Total Paid: <strong>{formatPKR(totalCredit)}</strong></span>
            <span>
              Outstanding:{" "}
              <strong className={getOutstanding(selectedCustomer) > 0 ? "text-red-500" : "text-green-600"}>
                {formatPKR(getOutstanding(selectedCustomer))}
              </strong>
            </span>
          </div>
        </>
      )}

      {/* ── Payment Dialog ── */}
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
                  type="button" variant="outline" className="flex-1"
                  onClick={() => setPayOpen(false)}
                >
                  Cancel
                </Button>
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
    </div>
  );
};

export default CustomerLedger;