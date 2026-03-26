import { useState, useEffect } from "react";
import { useChequeStore } from "@/stores/chequeStore";
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
import { Plus, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatDate, getTodayISO } from "@/lib/formatters";

const BankCheques = () => {
  const { cheques, addCheque, updateStatus, fetchCheques } = useChequeStore();
  const { vendors, fetchVendors, addLedgerEntry } = useVendorStore();
  const { addEntry: addCashEntry } = useCashFlowStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchCheques();
    fetchVendors();
  }, []);

  const getVendorName = (id: string) =>
    vendors.find(v => v.id === id)?.name || 'Unknown';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vendorId = fd.get("vendorId") as string;
    const amount = Number(fd.get("amount"));
    const chequeNumber = fd.get("chequeNumber") as string;

    setSubmitting(true);

    const id = await addCheque({
      chequeNumber,
      vendorId,
      amount,
      issueDate: fd.get("issueDate") as string || getTodayISO(),
      expectedClearanceDate: fd.get("expectedClearanceDate") as string,
      bankName: fd.get("bankName") as string,
      status: 'Pending',
      notes: fd.get("notes") as string || "",
    });

    if (id) {
      // Post cheque issued to vendor ledger
      await addLedgerEntry(vendorId, {
        date: getTodayISO(),
        type: "Cheque Issued",
        description: `Cheque ${chequeNumber} issued`,
        debit: amount,
        credit: 0,
      });
      setOpen(false);
      toast.success("Cheque issued successfully");
    } else {
      toast.error("Failed to issue cheque");
    }

    setSubmitting(false);
  };

  const handleStatusChange = async (id: string, status: 'Cleared' | 'Bounced') => {
    const cheque = await updateStatus(id, status);

    if (!cheque) {
      toast.error("Failed to update cheque status");
      return;
    }

    if (status === 'Bounced') {
      toast.error("Cheque bounced — vendor balance restored");
    } else if (status === 'Cleared') {
      // Record cash outflow when cheque clears
      await addCashEntry(getTodayISO(), {
        type: 'out',
        category: 'Cheque Payment',
        amount: cheque.amount,
        description: `Cheque cleared: ${cheque.chequeNumber} — ${cheque.vendorName || getVendorName(cheque.vendorId)}`,
      });
      toast.success("Cheque marked as cleared");
    }
  };

  const handleDeleteCheque = async (cheque: any) => {
    if (cheque.status === 'Cleared') {
      toast.error("Cannot delete a cheque that has already been cleared.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this cheque?")) return;

    const ok = await useChequeStore.getState().deleteCheque(cheque.id);
    
    if (ok) {
      if (cheque.status === 'Pending') {
        // Reverse the original "Cheque Issued" debit since the cheque bounced doesn't need to be double reversed
        await addLedgerEntry(cheque.vendorId, {
          date: getTodayISO(),
          type: "Adjustment",
          description: `Reversal of deleted Cheque ${cheque.chequeNumber}`,
          debit: 0,
          credit: cheque.amount,
        });
      }
      toast.success("Cheque deleted successfully");
    } else {
      toast.error("Failed to delete cheque");
    }
  };

  const statusColor = (s: string): "default" | "destructive" | "secondary" =>
    s === "Cleared" ? "default" : s === "Bounced" ? "destructive" : "secondary";

  const filtered = cheques.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.chequeNumber.toLowerCase().includes(q) ||
      getVendorName(c.vendorId).toLowerCase().includes(q)
    );
  });

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank & Cheques</h1>
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
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (PKR)</Label>
                  <Input name="amount" type="number" min="1" required />
                </div>
                <div className="space-y-2">
                  <Label>Cheque Number</Label>
                  <Input name="chequeNumber" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input name="issueDate" type="date" defaultValue={getTodayISO()} required />
                </div>
                <div className="space-y-2">
                  <Label>Expected Clearance</Label>
                  <Input name="expectedClearanceDate" type="date" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bank Name / Account</Label>
                <Input name="bankName" required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Issue Cheque"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search by vendor or cheque number..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      {cheques.length === 0 ? (
        <EmptyState
          title="No cheques yet"
          description="No records found. Issue your first cheque to get started."
          actionLabel="Issue First Cheque"
          onAction={() => setOpen(true)}
        />
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
                    <TableCell className="font-medium">
                      {c.vendorName || getVendorName(c.vendorId)}
                    </TableCell>
                    <TableCell>{c.bankName}</TableCell>
                    <TableCell>{formatDate(c.issueDate)}</TableCell>
                    <TableCell>{formatDate(c.expectedClearanceDate)}</TableCell>
                    <TableCell className="text-right">{formatPKR(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "Pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(c.id, "Cleared")}
                            title="Mark Cleared"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(c.id, "Bounced")}
                            title="Mark Bounced"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {(c.status === "Pending" || c.status === "Bounced") && (
                        <div className="flex gap-1 mt-1">
                          <Button 
                            size="sm" variant="ghost" className="text-destructive w-full hover:bg-destructive/10 h-7"
                            onClick={() => handleDeleteCheque(c)}
                            title="Delete Cheque"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BankCheques;