import { useState, useEffect } from "react";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { EmptyState } from "@/components/EmptyState";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Lock, Wallet, ArrowUpCircle,
  ArrowDownCircle, Calculator, Loader2, Trash2, Edit
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, getTodayISO } from "@/lib/formatters";
import type { CashEntryType, CashInCategory, CashOutCategory, DayRecord } from "@/types";
import { KpiCard } from "@/components/KpiCard";

const CASH_IN_CATS: CashInCategory[] = [
  "Customer Payment",
  "Sale Revenue",
  "Other Income",
];
const CASH_OUT_CATS: CashOutCategory[] = [
  "Salary",
  "Transport",
  "Utilities",
  "Vendor Payment",
  "Cheque Payment",
  "Miscellaneous",
];

const Rokar = () => {
  const { fetchDays, getOrCreateDay, addEntry, closeDay, loading } =
    useCashFlowStore();

  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashEntryType>("in");

  // Edit controls
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");

  // day loaded from store after async fetch
  const [day, setDay] = useState<DayRecord | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // fetch all days on first mount
  useEffect(() => {
    fetchDays();
  }, []);

  // whenever selected date changes, get or create the day record
  useEffect(() => {
    let cancelled = false;
    setDayLoading(true);
    getOrCreateDay(selectedDate).then((d) => {
      if (!cancelled) {
        setDay(d);
        setDayLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // re-read day from store whenever loading finishes (after close day re-fetch)
  const days = useCashFlowStore((s) => s.days);
  useEffect(() => {
    if (days[selectedDate]) {
      setDay(days[selectedDate]);
    }
  }, [days, selectedDate]);

  // computed values
  const totalIn =
    day?.entries
      .filter((e) => e.type === "in")
      .reduce((s, e) => s + e.amount, 0) ?? 0;

  const totalOut =
    day?.entries
      .filter((e) => e.type === "out")
      .reduce((s, e) => s + e.amount, 0) ?? 0;

  const currentBalance = (day?.openingBalance ?? 0) + totalIn - totalOut;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const ok = await addEntry(selectedDate, {
      type: entryType,
      category: fd.get("category") as CashInCategory | CashOutCategory,
      amount: Number(fd.get("amount")),
      description: fd.get("description") as string,
    });

    setSubmitting(false);

    if (!ok) {
      toast.error("Cannot add entries to a closed day");
      return;
    }

    setOpen(false);
    toast.success("Entry added");
    // re-sync local day state
    const updated = await getOrCreateDay(selectedDate);
    setDay(updated);
  };

  const handleClose = async () => {
    await closeDay(selectedDate);
    toast.success("Day closed and locked");
    // closeDay calls fetchDays internally, useEffect above will update
  };
  
  const handleEditEntry = async () => {
    if (!editingEntry) return;
    setSubmitting(true);
    const ok = await useCashFlowStore.getState().updateEntry(selectedDate, editingEntry.id, {
      amount: editAmount,
      description: editDesc,
    });
    setSubmitting(false);
    if (ok) {
      toast.success("Entry updated");
      setEditOpen(false);
      const updated = await getOrCreateDay(selectedDate);
      setDay(updated);
    } else {
      toast.error("Failed to update entry");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (day?.isClosed) {
      toast.error("Cannot delete entries on a closed day");
      return;
    }
    if (!confirm("Are you sure you want to delete this cash entry?")) return;
    
    const ok = await useCashFlowStore.getState().deleteEntry(selectedDate, entryId);
    if (ok) {
      toast.success("Entry deleted");
      const updated = await getOrCreateDay(selectedDate);
      setDay(updated);
    } else {
      toast.error("Failed to delete entry");
    }
  };

  // ── Loading skeleton
  if (dayLoading || (loading && !day)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading cash register...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Daily Cash Flow</h1>
          <p className="text-sm text-muted-foreground">
            Daily cash register (Rokar)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />

          {day?.isClosed ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> CLOSED
            </Badge>
          ) : (
            <>
              {/* Add Entry Dialog */}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Cash Entry</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={entryType}
                        onValueChange={(v) => setEntryType(v as CashEntryType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">Cash In</SelectItem>
                          <SelectItem value="out">Cash Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(entryType === "in"
                            ? CASH_IN_CATS
                            : CASH_OUT_CATS
                          ).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label>Amount (PKR)</Label>
                      <Input
                        name="amount"
                        type="number"
                        min={1}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input name="description" required />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Add Entry"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Close Day Dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" /> Close Day
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this day?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Closing balance will be{" "}
                      <strong>{formatPKR(currentBalance)}</strong>. This will
                      lock all entries and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose}>
                      Close Day
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Opening Balance"
          value={formatPKR(day?.openingBalance ?? 0)}
          icon={Wallet}
        />
        <KpiCard
          title="Total Cash In"
          value={formatPKR(totalIn)}
          icon={ArrowUpCircle}
        />
        <KpiCard
          title="Total Cash Out"
          value={formatPKR(totalOut)}
          icon={ArrowDownCircle}
        />
        <KpiCard
          title="Current Balance"
          value={formatPKR(currentBalance)}
          icon={Calculator}
        />
      </div>

      {/* Entries Table */}
      {!day || day.entries.length === 0 ? (
        <EmptyState
          title="No entries for this day"
          description="No records found. Add your first cash entry to get started."
          actionLabel={day?.isClosed ? undefined : "Add Entry"}
          onAction={day?.isClosed ? undefined : () => setOpen(true)}
        />
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
                {!day.isClosed && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {day.entries.map((e) => {
                const isAuto = ["Sale Revenue", "Customer Payment", "Vendor Payment", "Cheque Payment", "Other Income"].includes(e.category) && !e.description?.toLowerCase().includes("manual");

                return (
                 <TableRow key={e.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.time}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={e.type === "in" ? "default" : "destructive"}
                    >
                      {e.type === "in" ? "Cash In" : "Cash Out"}
                    </Badge>
                  </TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      e.type === "in" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {formatPKR(e.amount)}
                  </TableCell>
                  {!day.isClosed && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                           size="sm" variant="ghost"
                           onClick={() => {
                             setEditingEntry(e);
                             setEditAmount(e.amount);
                             setEditDesc(e.description);
                             setEditOpen(true);
                           }}
                           title={isAuto ? "Auto-generated entries shouldn't be edited directly" : "Edit Entry"}
                           className={isAuto ? "text-muted-foreground" : ""}
                        >
                           <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                           size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                           onClick={() => {
                             if (isAuto) {
                               if (!confirm("Warning: This entry was auto-generated by the system (e.g. Sale, Payment). Deleting it from Rokar does NOT reverse the ledger! Are you really sure you want to delete it here?")) return;
                             }
                             handleDeleteEntry(e.id);
                           }}
                        >
                           <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                 </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Summary row at bottom */}
          {day.isClosed && day.closingBalance !== undefined && (
            <div className="flex justify-end items-center gap-4 px-4 py-3 border-t text-sm font-medium bg-muted/30">
              <span className="text-muted-foreground">Closing Balance</span>
              <span>{formatPKR(day.closingBalance)}</span>
            </div>
          )}
        </div>
      )}

      {/* Edit Entry Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Cash Entry</DialogTitle></DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="1" value={editAmount} onChange={(e) => setEditAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditEntry} disabled={submitting} className="flex-1">
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rokar;