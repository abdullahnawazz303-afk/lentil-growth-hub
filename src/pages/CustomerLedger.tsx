import { useState } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatDate, getTodayISO, generateId } from "@/lib/formatters";

const CustomerLedger = () => {
  const { customers, ledgerEntries, addLedgerEntry, getOutstanding } = useCustomerStore();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [open, setOpen] = useState(false);

  const customer = customers.find(c => c.id === selectedCustomer);
  const entries = ledgerEntries[selectedCustomer] || [];

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get("type") as string;
    const amount = Number(fd.get("amount"));
    addLedgerEntry(selectedCustomer, {
      date: fd.get("date") as string || getTodayISO(),
      type,
      description: fd.get("description") as string,
      debit: type === "Sale" || type === "Adjustment" ? amount : 0,
      credit: type === "Payment Received" ? amount : 0,
    });
    setOpen(false);
    toast.success("Ledger entry added");
  };

  return (
    <div className="space-y-6">
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
                  <div className="space-y-2"><Label>Amount (PKR)</Label><Input name="amount" type="number" required /></div>
                  <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={getTodayISO()} required /></div>
                  <div className="space-y-2"><Label>Description</Label><Input name="description" required /></div>
                  <Button type="submit" className="w-full">Add Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={() => toast.info("Print feature coming soon")}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </div>
      </div>

      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select customer" /></SelectTrigger>
        <SelectContent>
          {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {!selectedCustomer ? (
        <EmptyState title="Select a customer" description="Choose a customer from the dropdown to view their ledger." />
      ) : entries.length === 0 ? (
        <EmptyState title="No transactions yet" description={`No ledger entries for ${customer?.name}`} actionLabel="Add Entry" onAction={() => setOpen(true)} />
      ) : (
        <>
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
                <p className={`font-semibold ${getOutstanding(selectedCustomer) > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(getOutstanding(selectedCustomer))}</p>
              </div>
            </div>
          )}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>{e.type}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right">{e.debit > 0 ? formatPKR(e.debit) : '-'}</TableCell>
                    <TableCell className="text-right">{e.credit > 0 ? formatPKR(e.credit) : '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatPKR(e.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-8 text-sm border-t pt-4">
            <span>Total Sales: <strong>{formatPKR(totalDebit)}</strong></span>
            <span>Total Paid: <strong>{formatPKR(totalCredit)}</strong></span>
            <span>Outstanding: <strong className={getOutstanding(selectedCustomer) > 0 ? 'status-overdue' : 'status-healthy'}>{formatPKR(getOutstanding(selectedCustomer))}</strong></span>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerLedger;
