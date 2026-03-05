import { useState } from "react";
import { useChequeStore } from "@/stores/chequeStore";
import { useVendorStore } from "@/stores/vendorStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatDate, getTodayISO } from "@/lib/formatters";

const BankCheques = () => {
  const { cheques, addCheque, updateStatus } = useChequeStore();
  const { vendors, addLedgerEntry } = useVendorStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vendorId = fd.get("vendorId") as string;
    const amount = Number(fd.get("amount"));
    const chequeId = addCheque({
      chequeNumber: fd.get("chequeNumber") as string,
      vendorId,
      amount,
      issueDate: fd.get("issueDate") as string || getTodayISO(),
      expectedClearanceDate: fd.get("expectedClearanceDate") as string,
      bankName: fd.get("bankName") as string,
      status: 'Pending',
      notes: fd.get("notes") as string || "",
    });
    // Add to vendor ledger as cheque issued
    addLedgerEntry(vendorId, { date: getTodayISO(), type: "Cheque Issued", description: `Cheque ${fd.get("chequeNumber")}`, debit: 0, credit: amount });
    setOpen(false);
    toast.success("Cheque issued");
  };

  const handleStatusChange = (id: string, status: 'Cleared' | 'Bounced') => {
    const cheque = updateStatus(id, status);
    if (cheque && status === 'Bounced') {
      // Reverse the cheque in vendor ledger
      addLedgerEntry(cheque.vendorId, {
        date: getTodayISO(), type: "Adjustment",
        description: `Cheque bounced: ${cheque.chequeNumber}`,
        debit: cheque.amount, credit: 0,
      });
      toast.error("Cheque bounced — vendor balance restored");
    } else {
      toast.success(`Cheque marked as ${status}`);
    }
  };

  const statusColor = (s: string): "default" | "destructive" | "secondary" =>
    s === "Cleared" ? "default" : s === "Bounced" ? "destructive" : "secondary";

  const filtered = cheques.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.chequeNumber.toLowerCase().includes(q) || getVendorName(c.vendorId).toLowerCase().includes(q);
  });
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Bank & Cheques</h1>
          <p className="text-sm text-muted-foreground">Manage cheque issuance and status tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Issue Cheque</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue New Cheque</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select name="vendorId" required>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount (PKR)</Label><Input name="amount" type="number" required /></div>
                <div className="space-y-2"><Label>Cheque Number</Label><Input name="chequeNumber" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Issue Date</Label><Input name="issueDate" type="date" defaultValue={getTodayISO()} required /></div>
                <div className="space-y-2"><Label>Expected Clearance</Label><Input name="expectedClearanceDate" type="date" required /></div>
              </div>
              <div className="space-y-2"><Label>Bank Name / Account</Label><Input name="bankName" required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Issue Cheque</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search by vendor or cheque number..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {cheques.length === 0 ? (
        <EmptyState title="No cheques yet" description="Issue your first cheque to get started." actionLabel="Issue First Cheque" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Clearance Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.chequeNumber}</TableCell>
                    <TableCell className="font-medium">{getVendorName(c.vendorId)}</TableCell>
                    <TableCell>{c.bankName}</TableCell>
                    <TableCell>{formatDate(c.issueDate)}</TableCell>
                    <TableCell>{formatDate(c.expectedClearanceDate)}</TableCell>
                    <TableCell className="text-right">{formatPKR(c.amount)}</TableCell>
                    <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell>
                      {c.status === "Pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, "Cleared")}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, "Bounced")}><X className="h-3 w-3" /></Button>
                        </div>
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
    </div>
  );
};

export default BankCheques;
