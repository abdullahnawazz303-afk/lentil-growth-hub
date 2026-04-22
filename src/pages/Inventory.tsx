import { useState, useEffect } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Package, AlertTriangle, Layers,
  Trash2, Loader2, CreditCard, Settings2,
  CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatKG, formatDate, getTodayISO } from "@/lib/formatters";
import type { Grade, VendorPurchase } from "@/types";

// ── Item name type
interface ItemName {
  id: string;
  name: string;
  is_active: boolean;
}

const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'B', 'C'];
const PAYMENT_TERM_OPTIONS = [
  { value: "7",  label: "7 Days"  },
  { value: "15", label: "15 Days" },
  { value: "30", label: "30 Days" },
  { value: "45", label: "45 Days" },
  { value: "60", label: "60 Days" },
];

interface BatchLineItem {
  itemName: string;
  grade: Grade;
  purchasePrice: number;
  quantity: number;
}

const emptyLine = (): BatchLineItem => ({
  itemName: "", grade: "A", purchasePrice: 0, quantity: 0,
});

const Inventory = () => {
  const {
    batches, addPurchase, fetchBatches, updateBatch, deleteBatch, loading,
    getTotalStockValue, getLowStockBatches, getUniqueItemCount,
  } = useInventoryStore();

  const { vendors, purchases, fetchVendors, fetchPurchases, recordPayment } = useVendorStore();
  const { addEntry: addCashEntry } = useCashFlowStore();

  // ── Item names state
  const [itemNames, setItemNames]       = useState<ItemName[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // ── Manage Items dialog
  const [manageOpen, setManageOpen]     = useState(false);
  const [newItemName, setNewItemName]   = useState("");
  const [addingItem, setAddingItem]     = useState(false);

  // ── Purchase form state
  const [open, setOpen]                 = useState(false);
  const [search, setSearch]             = useState("");
  const [filterItem, setFilterItem]     = useState("");
  const [filterGrade, setFilterGrade]   = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [page, setPage]                 = useState(0);
  const pageSize = 10;

  const [vendorId, setVendorId]                 = useState("");
  const [purchaseDate, setPurchaseDate]         = useState(getTodayISO());
  const [notes, setNotes]                       = useState("");
  const [lines, setLines]                       = useState<BatchLineItem[]>([emptyLine()]);
  const [isCredit, setIsCredit]                 = useState(false);
  const [paymentTermsDays, setPaymentTermsDays] = useState("30");
  const [amountPaidUpfront, setAmountPaidUpfront] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("Cash");
  const [purchaseReferenceNumber, setPurchaseReferenceNumber] = useState("");
  const [submitting, setSubmitting]             = useState(false);

  // ── Pay dialog state
  const [payOpen, setPayOpen]             = useState(false);
  const [payingPurchase, setPayingPurchase] = useState<VendorPurchase | null>(null);
  const [payMethod, setPayMethod]         = useState("Cash");
  const [payReference, setPayReference]   = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // ── Edit Batch state
  const [editOpen, setEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Fetch item names from Supabase
  const fetchItemNames = async () => {
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("item_names")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load item names");
    } else {
      setItemNames((data || []) as ItemName[]);
    }
    setItemsLoading(false);
  };

  useEffect(() => {
    fetchBatches();
    fetchVendors();
    fetchPurchases();
    fetchItemNames();
  }, []);

  // ── Add new item name
  const handleAddItem = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) { toast.error("Enter an item name"); return; }

    // Check duplicate
    const exists = itemNames.some(
      (i) => i.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) { toast.error("This item already exists"); return; }

    setAddingItem(true);
    const { error } = await supabase
      .from("item_names")
      .insert({ name: trimmed, is_active: true });

    setAddingItem(false);

    if (error) {
      toast.error("Failed to add item: " + error.message);
      return;
    }

    toast.success(`"${trimmed}" added to item list`);
    setNewItemName("");
    fetchItemNames();
  };

  // ── Deactivate item (soft delete)
  const handleDeactivateItem = async (id: string, name: string) => {
    const { error } = await supabase
      .from("item_names")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove item");
      return;
    }

    toast.success(`"${name}" removed from list`);
    fetchItemNames();
  };

  // ── Line item helpers
  const updateLine = (i: number, field: keyof BatchLineItem, value: string | number) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const resetForm = () => {
    setVendorId(""); setPurchaseDate(getTodayISO());
    setNotes(""); setLines([emptyLine()]);
    setIsCredit(false); setPaymentTermsDays("30"); setAmountPaidUpfront("");
    setPurchasePaymentMethod("Cash");
    setPurchaseReferenceNumber("");
  };

  const formatDueDate = (date: string, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return formatDate(d.toISOString().split("T")[0]);
  };

  const getPurchaseForBatch = (batchId: string): VendorPurchase | undefined => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch?.purchaseId) return undefined;
    return purchases.find((p) => p.id === batch.purchaseId);
  };

  const paymentBadge = (purchase: VendorPurchase | undefined) => {
    if (!purchase) return <span className="text-muted-foreground text-xs">—</span>;
    if (purchase.paymentStatus === "Paid")
      return <Badge variant="default" className="text-xs">Paid</Badge>;
    if (purchase.paymentStatus === "Partially Paid")
      return <Badge variant="secondary" className="text-xs">Partial</Badge>;
    const isOverdue = purchase.dueDate && purchase.dueDate < getTodayISO();
    return (
      <Badge variant="destructive" className="text-xs">
        {isOverdue ? "Overdue" : "Unpaid"}
      </Badge>
    );
  };

  // ── Submit new purchase
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vendorId) { toast.error("Please select a vendor"); return; }

    if (validLines.length === 0) {
      toast.error("Add at least one valid item with quantity and price");
      return;
    }

    setSubmitting(true);
    const ok = await addPurchase({
      vendorId, purchaseDate, isCredit,
      paymentTermsDays: isCredit ? parseInt(paymentTermsDays) : 0,
      amountPaid: isCredit ? Number(amountPaidUpfront) : validLines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0),
      paymentMethod: purchasePaymentMethod,
      referenceNumber: (purchasePaymentMethod === 'Bank Transfer' || purchasePaymentMethod === 'Cheque') ? purchaseReferenceNumber : undefined,
      notes, lines: validLines,
    });
    setSubmitting(false);

    if (ok) {
      const totalValue = validLines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0);
      const vendor = vendors.find((v) => v.id === vendorId);
      toast.success(
        `${validLines.length} batch(es) added — ${formatPKR(totalValue)} for ${vendor?.name}`
      );
      resetForm();
      setOpen(false);
      fetchPurchases();
    } else {
      toast.error("Failed to save purchase.");
    }
  };

  // ── Pay purchase
  const handlePayOpen = (purchase: VendorPurchase) => {
    setPayingPurchase(purchase);
    setPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingPurchase) return;
    const fd     = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const method = fd.get("method") as string;
    const payNotes = fd.get("notes") as string || "";

    if (amount <= 0 || amount > payingPurchase.outstanding) {
      toast.error("Invalid amount"); return;
    }

    setPaySubmitting(true);
    await recordPayment(
      payingPurchase.id, payingPurchase.vendorId, amount, payMethod, payNotes, payReference
    );
    setPaySubmitting(false);
    setPayOpen(false);
    setPayingPurchase(null);
    toast.success("Payment recorded");
  };

  const handleEditBatch = async () => {
    if (!editingBatch) return;
    setEditSubmitting(true);
    const ok = await updateBatch(editingBatch.id, editNotes);
    setEditSubmitting(false);
    if (ok) {
      toast.success("Batch updated successfully");
      setEditOpen(false);
    } else {
      toast.error("Failed to update batch");
    }
  };

  const handleDeleteBatch = async (batch: any) => {
    if (batch.remainingQuantity !== batch.quantity) {
      toast.error("Cannot delete batch that has been consumed or sold. Real-world standards prohibit deleting active stock.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this inventory batch?")) return;
    const { success, error } = await deleteBatch(batch.id);
    if (success) {
      toast.success("Batch deleted successfully");
    } else {
      toast.error(error || "Failed to delete batch");
    }
  };

  const getVendorName = (id: string) =>
    vendors.find((v) => v.id === id)?.name ?? "Unknown";

  const validLines = lines.filter(
    (l) => l.itemName && l.quantity > 0 && l.purchasePrice > 0
  );

  // ── Filter + paginate
  const filtered = batches.filter((b) => {
    if (filterItem   && b.itemName !== filterItem)   return false;
    if (filterGrade  && b.grade    !== filterGrade)  return false;
    if (filterVendor && b.vendorId !== filterVendor) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.itemName.toLowerCase().includes(q) ||
        b.batchRef.toLowerCase().includes(q) ||
        getVendorName(b.vendorId).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted     = [...filtered].sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );
  const paged      = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Batch-based inventory — each purchase creates a vendor payable automatically
          </p>
        </div>
        <div className="flex gap-2">


          {/* ── Add Purchase Button ── */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Purchase</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Purchase (Vendor → Inventory)</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Vendor + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select value={vendorId} onValueChange={setVendorId} required>
                      <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                      <SelectContent>
                        {vendors.length === 0
                          ? <SelectItem value="none" disabled>No vendors yet</SelectItem>
                          : vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Date *</Label>
                    <Input type="date" value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)} required />
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Credit Purchase</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable if payment will be made later
                      </p>
                    </div>
                    <Switch
                      checked={isCredit}
                      onCheckedChange={(v) => { setIsCredit(v); if (!v) setPaymentTermsDays("30"); }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isCredit ? "Amount Paid Upfront" : "Amount Paid Now"} (PKR)</Label>
                      <Input
                        type="number" min={0}
                        value={isCredit ? amountPaidUpfront : validLines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0)}
                        onChange={(e) => isCredit && setAmountPaidUpfront(e.target.value)}
                        placeholder="0"
                        disabled={!isCredit}
                        className={!isCredit ? "bg-muted font-semibold" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={purchasePaymentMethod} onValueChange={setPurchasePaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(purchasePaymentMethod === 'Bank Transfer' || purchasePaymentMethod === 'Cheque') && (
                    <div className="space-y-2">
                      <Label>{purchasePaymentMethod === 'Cheque' ? 'Cheque Number' : 'Transfer ID'} *</Label>
                      <Input
                        value={purchaseReferenceNumber}
                        onChange={(e) => setPurchaseReferenceNumber(e.target.value)}
                        placeholder={`Enter ${purchasePaymentMethod.toLowerCase()} reference`}
                        required
                      />
                    </div>
                  )}

                  {isCredit && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select value={paymentTermsDays} onValueChange={setPaymentTermsDays}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TERM_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {purchaseDate && (
                          <p className="text-sm text-muted-foreground">
                            Due Date:{" "}
                            <span className="font-medium text-foreground">
                              {formatDueDate(purchaseDate, parseInt(paymentTermsDays))}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Item Details *</Label>
                  </div>

                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_80px_1fr_1fr] gap-2 items-end rounded-md border p-3 bg-muted/30"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Item</Label>
                        <Select
                          value={line.itemName}
                          onValueChange={(v) => updateLine(i, "itemName", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemsLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : itemNames.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No items — click Manage Items to add
                              </SelectItem>
                            ) : (
                              itemNames.map((it) => (
                                <SelectItem key={it.id} value={it.name}>
                                  {it.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Grade</Label>
                        <Select
                          value={line.grade}
                          onValueChange={(v) => updateLine(i, "grade", v)}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GRADE_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price/kg (PKR)</Label>
                        <Input
                          type="number" className="h-9" min={1}
                          value={line.purchasePrice || ""}
                          onChange={(e) => updateLine(i, "purchasePrice", Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty (kg)</Label>
                        <Input
                          type="number" className="h-9" min={1}
                          value={line.quantity || ""}
                          onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}

                  {lines.some((l) => l.quantity > 0 && l.purchasePrice > 0) && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Purchase Value</span>
                      <span className="text-lg font-semibold text-primary">
                        {formatPKR(lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    : "Save Purchase"
                  }
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Unique Items" value={String(getUniqueItemCount())}
          subtitle="In stock" icon={Layers} />
        <KpiCard title="Total Stock Value" value={formatPKR(getTotalStockValue())}
          subtitle="All batches" icon={Package} />
        <KpiCard title="Low Stock Alerts" value={String(getLowStockBatches().length)}
          subtitle="Below 100 kg" icon={AlertTriangle}
          variant={getLowStockBatches().length > 0 ? "danger" : undefined} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search batches..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="max-w-xs"
        />
        <Select
          value={filterItem || "all"}
          onValueChange={(v) => { setFilterItem(v === "all" ? "" : v); setPage(0); }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Items" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {itemNames.map((i) => (
              <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterGrade || "all"}
          onValueChange={(v) => { setFilterGrade(v === "all" ? "" : v); setPage(0); }}
        >
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADE_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterVendor || "all"}
          onValueChange={(v) => { setFilterVendor(v === "all" ? "" : v); setPage(0); }}
        >
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Add your first purchase to start tracking inventory."
          actionLabel="Add First Purchase"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Ref</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Price/kg</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Stock Left</TableHead>
                  <TableHead className="text-right">Purchase Total</TableHead>
                  <TableHead className="text-right">Remaining Due</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((b) => {
                  const purchase          = getPurchaseForBatch(b.id);
                  const totalPurchaseValue = b.quantity * b.purchasePrice;
                  const remainingDue      = purchase?.outstanding ?? 0;

                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {b.batchRef}
                      </TableCell>
                      <TableCell className="font-medium" dir="rtl">{b.itemName}</TableCell>
                      <TableCell>{b.grade}</TableCell>
                      <TableCell>{getVendorName(b.vendorId)}</TableCell>
                      <TableCell className="text-right">{formatPKR(b.purchasePrice)}</TableCell>
                      <TableCell className="text-right">{formatKG(b.quantity)}</TableCell>
                      <TableCell className={`text-right font-medium ${b.remainingQuantity < 100 ? "text-red-500" : "text-green-600"}`}>
                        {formatKG(b.remainingQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPKR(totalPurchaseValue)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${remainingDue > 0 ? "text-destructive" : "text-green-600"}`}>
                        {remainingDue > 0 ? formatPKR(remainingDue) : "—"}
                      </TableCell>
                      <TableCell>{paymentBadge(purchase)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(b.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          {purchase && purchase.outstanding > 0 && (
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handlePayOpen(purchase)}
                            >
                              <CreditCard className="h-3 w-3 mr-1" /> Pay
                            </Button>
                          )}
                          <Button 
                            variant="ghost" size="sm" 
                            onClick={() => { setEditingBatch(b); setEditNotes(b.notes || ""); setEditOpen(true); }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteBatch(b)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </p>
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

      {/* ── Manage Items Dialog ── */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Item Names</DialogTitle>
            <DialogDescription>Add or remove standard items from your factory inventory list.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            {/* Add new item */}
            <div className="space-y-2">
              <Label>Add New Item</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter item name (e.g. دال ماش)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem(); } }}
                  dir="rtl"
                  className="flex-1"
                />
                <Button onClick={handleAddItem} disabled={addingItem}>
                  {addingItem
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Plus className="h-4 w-4 mr-1" /> Add</>
                  }
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click Add. Both Urdu and English names are supported.
              </p>
            </div>

            {/* Current items list */}
            <div className="space-y-2">
              <Label>Current Items ({itemNames.length})</Label>
              {itemsLoading ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : itemNames.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items yet. Add your first item above.
                </p>
              ) : (
                <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
                  {itemNames.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30"
                    >
                      <span className="text-sm font-medium" dir="rtl">{item.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeactivateItem(item.id, item.name)}
                        title="Remove this item"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Removing an item hides it from the dropdown. Existing batches with that item name are not affected.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pay Dialog ── */}
      <Dialog open={payOpen} onOpenChange={(v) => { setPayOpen(v); if (!v) setPayingPurchase(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Vendor for this Purchase</DialogTitle>
            <DialogDescription>Record a payment to settle the balance for this inventory batch.</DialogDescription>
          </DialogHeader>
          {payingPurchase && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">
                    {payingPurchase.vendorName || getVendorName(payingPurchase.vendorId)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Total</span>
                  <span>{formatPKR(payingPurchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-green-600">{formatPKR(payingPurchase.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Remaining Due</span>
                  <span className="text-destructive">{formatPKR(payingPurchase.outstanding)}</span>
                </div>
              </div>

              <form onSubmit={handlePaySubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label>Amount to Pay (PKR)</Label>
                  <Input
                    name="amount" type="number" min="1"
                    max={payingPurchase.outstanding} required autoFocus
                    placeholder={`Max: ${formatPKR(payingPurchase.outstanding)}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(payMethod === 'Bank Transfer' || payMethod === 'Cheque') && (
                  <div className="space-y-2">
                    <Label>{payMethod === 'Cheque' ? 'Cheque Number' : 'Transfer ID'} *</Label>
                    <Input
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      placeholder={`Enter ${payMethod.toLowerCase()} reference`}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input name="notes" placeholder="Optional" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => setPayOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={paySubmitting}>
                    {paySubmitting ? "Saving..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* ── Edit Batch Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Batch Notes</DialogTitle>
            <DialogDescription>Update the memo for this inventory record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleEditBatch} disabled={editSubmitting} className="flex-1">
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;