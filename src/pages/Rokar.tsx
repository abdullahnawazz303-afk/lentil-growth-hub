import { useState } from "react";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Lock, Wallet, ArrowUpCircle, ArrowDownCircle, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, getTodayISO } from "@/lib/formatters";
import type { CashEntryType, CashInCategory, CashOutCategory } from "@/types";
import { KpiCard } from "@/components/KpiCard";

const CASH_IN_CATS: CashInCategory[] = ['Customer Payment', 'Sale Revenue', 'Other Income'];
const CASH_OUT_CATS: CashOutCategory[] = ['Salary', 'Transport', 'Utilities', 'Vendor Payment', 'Miscellaneous'];

const Rokar = () => {
  const { getOrCreateDay, addEntry, closeDay } = useCashFlowStore();
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashEntryType>('in');

  const day = getOrCreateDay(selectedDate);
  const totalIn = day.entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = day.entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
  const currentBalance = day.openingBalance + totalIn - totalOut;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = addEntry(selectedDate, {
      type: entryType,
      category: fd.get("category") as CashInCategory | CashOutCategory,
      amount: Number(fd.get("amount")),
      description: fd.get("description") as string,
    });
    if (!ok) { toast.error("Cannot add entries to a closed day"); return; }
    setOpen(false);
    toast.success("Entry added");
  };

  const handleClose = () => {
    closeDay(selectedDate);
    toast.success("Day closed and locked");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold">Daily Cash Flow</h1>
          <p className="text-sm text-muted-foreground">Daily cash register (Rokar)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
          {day.isClosed ? (
            <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> CLOSED</Badge>
          ) : (
            <>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Cash Entry</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={entryType} onValueChange={(v) => setEntryType(v as CashEntryType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">Cash In</SelectItem>
                          <SelectItem value="out">Cash Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select name="category" required>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {(entryType === 'in' ? CASH_IN_CATS : CASH_OUT_CATS).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Amount (PKR)</Label><Input name="amount" type="number" required /></div>
                    <div className="space-y-2"><Label>Description</Label><Input name="description" required /></div>
                    <Button type="submit" className="w-full">Add Entry</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline"><Lock className="h-4 w-4 mr-2" /> Close Day</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this day?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Closing balance will be {formatPKR(currentBalance)}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose}>Close Day</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Opening Balance" value={formatPKR(day.openingBalance)} icon={Wallet} />
        <KpiCard title="Total Cash In" value={formatPKR(totalIn)} icon={ArrowUpCircle} />
        <KpiCard title="Total Cash Out" value={formatPKR(totalOut)} icon={ArrowDownCircle} />
        <KpiCard title="Current Balance" value={formatPKR(currentBalance)} icon={Calculator} />
      </div>

      {day.entries.length === 0 ? (
        <EmptyState title="No entries for this day" description="Add your first cash entry." actionLabel={day.isClosed ? undefined : "Add Entry"} onAction={day.isClosed ? undefined : () => setOpen(true)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {day.entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.time}</TableCell>
                  <TableCell>
                    <Badge variant={e.type === 'in' ? 'default' : 'destructive'}>{e.type === 'in' ? 'Cash In' : 'Cash Out'}</Badge>
                  </TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className={`text-right font-medium ${e.type === 'in' ? 'status-healthy' : 'status-overdue'}`}>{formatPKR(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Rokar;
