import { useState, useEffect } from "react";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { useSalesStore } from "@/stores/salesStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { formatDate, formatPKR } from "@/lib/formatters";
import { CheckCircle, XCircle, Truck, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OnlineOrderStatus } from "@/types";

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (s) {
    case "Pending":   return "secondary";
    case "Confirmed": return "default";
    case "Delivered": return "default";
    case "Cancelled": return "destructive";
    default:          return "secondary";
  }
};

const cancelLabel = (cancelReason?: string) => {
  if (!cancelReason) return null;
  if (cancelReason.toLowerCase().includes("customer")) {
    return <span className="text-xs text-muted-foreground ml-1">(by customer)</span>;
  }
  return <span className="text-xs text-muted-foreground ml-1">(by admin)</span>;
};

const OnlineOrders = () => {
  const { orders, fetchOrders, updateStatus, deleteOrder, loading } = useOnlineOrderStore();
  const { addSale } = useSalesStore();
  const { batches, fetchBatches } = useInventoryStore();

  const [search, setSearch]                   = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes]           = useState("");
  const [updating, setUpdating]               = useState(false);
  const [page, setPage]                       = useState(1);
  const pageSize = 10;

  const [deliveryOpen, setDeliveryOpen]       = useState(false);
  const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);
  const [itemPrices, setItemPrices]           = useState<Record<number, string>>({});
  const [itemBatches, setItemBatches]         = useState<Record<number, string>>({});
  const [amountPaid, setAmountPaid]           = useState("0");
  const [deliveryNotes, setDeliveryNotes]     = useState("");
  const [submitting, setSubmitting]           = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchBatches();
    const interval = setInterval(() => fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      o.customerName.toLowerCase().includes(q) ||
      o.orderRef.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all"
      ? o.status !== "Cancelled"
      : o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages    = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged         = filtered.slice((page - 1) * pageSize, page * pageSize);
  const order         = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : null;
  const deliveryOrder = deliveryOrderId ? orders.find((o) => o.id === deliveryOrderId) : null;

  const getMatchingBatches = (itemName: string, grade: string, requiredQty: number) => {
    return batches
      .filter(b => 
        b.itemName?.trim().toLowerCase() === itemName?.trim().toLowerCase() && 
        (!grade || b.grade?.trim().toLowerCase() === grade.trim().toLowerCase()) && 
        Number(b.remainingQuantity) >= requiredQty
      )
      .sort((a, b) => Number(b.remainingQuantity) - Number(a.remainingQuantity));
  };

  const getPurchasePrice = (itemName: string, grade: string) => {
    const matches = getMatchingBatches(itemName, grade, 0);
    return matches.length > 0 ? matches[0].purchasePrice : null;
  };

  const openDeliveryDialog = (orderId: string) => {
    const o = orders.find(ord => ord.id === orderId);
    if (!o) return;
    const prices: Record<number, string> = {};
    const batchesState: Record<number, string> = {};
    
    o.items.forEach((item, idx) => {
      const matches = getMatchingBatches(item.itemName, item.grade, Number(item.quantity));
      if (matches.length > 0) {
        batchesState[idx] = matches[0].id;
        prices[idx] = String(matches[0].purchasePrice);
      }
    });

    setDeliveryOrderId(orderId);
    setItemPrices(prices);
    setItemBatches(batchesState);
    setAmountPaid("0");
    setDeliveryNotes("");
    setSelectedOrderId(null);
    setDeliveryOpen(true);
  };

  const computeTotals = () => {
    if (!deliveryOrder) return { totalAmount: 0, paid: 0, outstanding: 0 };
    const totalAmount = deliveryOrder.items.reduce((sum, item, idx) => {
      return sum + item.quantity * (Number(itemPrices[idx]) || 0);
    }, 0);
    const paid = Math.min(Number(amountPaid) || 0, totalAmount);
    return { totalAmount, paid, outstanding: totalAmount - paid };
  };

  const { totalAmount, paid, outstanding } = computeTotals();

  const handleStatusUpdate = async (status: OnlineOrderStatus) => {
    if (!selectedOrderId || !order) return;
    setUpdating(true);
    const ok = await updateStatus(selectedOrderId, status, adminNotes);
    setUpdating(false);
    if (ok) {
      toast.success(`Order marked as ${status}`);
      let phone = order.customerPhone?.replace(/[^\d]/g, '') || "";
      if (phone.startsWith("0")) phone = "92" + phone.slice(1);
      if (phone && (status === "Confirmed" || status === "Cancelled")) {
        const ref = order.orderRef || order.id.slice(0, 8);
        let msg = "";
        if (status === "Confirmed") {
          msg = `Hello ${order.customerName},\nYour order *${ref}* has been confirmed by Lentil Factory. We will process and deliver it shortly!`;
          if (adminNotes) msg += `\n\nNotes from factory: ${adminNotes}`;
        } else {
          msg = `Hello ${order.customerName},\nYour order *${ref}* has been cancelled by Lentil Factory.`;
          if (adminNotes) msg += `\n\nReason: ${adminNotes}`;
        }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setSelectedOrderId(null);
      setAdminNotes("");
    } else {
      toast.error("Failed to update order status");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrderId) return;
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    setUpdating(true);
    const ok = await deleteOrder(selectedOrderId);
    setUpdating(false);
    if (ok) {
      toast.success("Order deleted successfully");
      setSelectedOrderId(null);
    } else {
      toast.error("Failed to delete order");
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryOrder) return;

    const missingPrice = deliveryOrder.items.findIndex(
      (_, idx) => !Number(itemPrices[idx]) || Number(itemPrices[idx]) <= 0
    );
    if (missingPrice !== -1) {
      toast.error(`Enter sale price for ${deliveryOrder.items[missingPrice].itemName}`);
      return;
    }

    setSubmitting(true);

    // ── KEY FIX: always fetch fresh inventory from Supabase before matching
    await fetchBatches();

    // Read fresh batches directly from store state after fetch
    const freshBatches = useInventoryStore.getState().batches;

    const saleItems = deliveryOrder.items.map((item, idx) => {
      const price = Number(itemPrices[idx]);
      const batchId = itemBatches[idx];
      const batch = freshBatches.find(b => b.id === batchId);

      return {
        batchId: batch?.id ?? "",
        itemName: item.itemName,
        grade: batch?.grade ?? item.grade ?? '',
        quantity: item.quantity,
        salePrice: price,
        subtotal: item.quantity * price,
      };
    });

    const missing = saleItems.find(i => !i.batchId);
    if (missing) {
      const gradeInfo = missing.grade ? ` Grade ${missing.grade}` : '';
      toast.error(
        `Not enough stock for ${missing.itemName}${gradeInfo} (Req: ${missing.quantity}kg). Please add inventory first.`
      );
      setSubmitting(false);
      return;
    }

    const saleId = await addSale({
      date: new Date().toISOString().split("T")[0],
      customerId: deliveryOrder.customerId,
      items: saleItems,
      totalAmount,
      amountPaid: paid,
      notes: deliveryNotes || `Online order ${deliveryOrder.orderRef}`,
      onlineOrderId: deliveryOrderId,
      saleRef: "",
    });

    if (!saleId) {
      toast.error("Failed to create sale. Check inventory stock levels.");
      setSubmitting(false);
      return;
    }

    await updateStatus(deliveryOrderId!, "Delivered");
    setSubmitting(false);
    setDeliveryOpen(false);
    setDeliveryOrderId(null);
    setItemPrices({});

    toast.success(
      outstanding > 0
        ? `Sale created. ${formatPKR(outstanding)} outstanding added to customer ledger.`
        : "Sale created and fully paid."
    );
  };

  const pendingCount = orders.filter(o => o.status === "Pending").length;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Online Customer Orders
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Orders placed by customers through the portal</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or order ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /><span>Loading orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No online orders yet"
          description="When customers place orders from the portal, they will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((o) => (
                  <TableRow key={o.id}
                    className={o.status === "Pending" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                    <TableCell className="font-mono text-sm">{o.orderRef || o.id.slice(0, 8)}</TableCell>
                    <TableCell>{formatDate(o.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerCity}</div>
                    </TableCell>
                    <TableCell className="text-sm">{o.customerPhone}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-sm">
                        {o.items.map(i =>
                          `${i.itemName} ${i.grade}${(i as any).packing && (i as any).packing !== 'Loose' ? ` [${(i as any).packing}]` : ''} (${i.quantity}kg)`
                        ).join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.requestedDeliveryDate ? formatDate(o.requestedDeliveryDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                        {o.status === "Cancelled" && cancelLabel((o as any).cancelReason)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm"
                          onClick={() => { setSelectedOrderId(o.id); setAdminNotes(o.adminNotes ?? ""); }}>
                          View
                        </Button>
                        {o.status === "Confirmed" && (
                          <Button size="sm"
                            onClick={() => openDeliveryDialog(o.id)}>
                            <Truck className="h-3 w-3 mr-1" />Deliver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2 items-center">
          <Button variant="outline" size="sm" disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrderId}
        onOpenChange={v => { if (!v) { setSelectedOrderId(null); setAdminNotes(""); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Review and manage this customer order.</DialogDescription>
          </DialogHeader>
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm rounded-lg bg-muted/40 p-3">
                <div><span className="text-muted-foreground">Ref: </span>
                  <span className="font-mono text-xs">{order.orderRef}</span></div>
                <div><span className="text-muted-foreground">Date: </span>{formatDate(order.date)}</div>
                <div><span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium">{order.customerName}</span></div>
                <div><span className="text-muted-foreground">Phone: </span>{order.customerPhone}</div>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">Items</h4>
                {order.items.map((item, idx) => {
                  const cost = getPurchasePrice(item.itemName, item.grade);
                  return (
                    <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                      <div>
                        <span>{item.itemName} </span>
                        <span className="text-muted-foreground text-xs">Grade {item.grade}</span>
                        {(item as any).packing && (item as any).packing !== "Loose" && (
                          <Badge variant="outline" className="ml-2 py-0 h-5 text-[10px]">
                            {(item as any).packing}
                          </Badge>
                        )}
                        {cost && (
                          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                            Purchase cost: {formatPKR(cost)}/kg
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{item.quantity} kg</span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t">
                  <span>Total</span>
                  <span>{order.items.reduce((s, i) => s + i.quantity, 0)} kg</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                {order.status === "Cancelled" && (order as any).cancelReason && (
                  <span className="text-xs text-muted-foreground">— {(order as any).cancelReason}</span>
                )}
              </div>

              <div className="space-y-1">
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                  disabled={order.status === "Delivered" || order.status === "Cancelled"} />
              </div>

              {order.status === "Pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleStatusUpdate("Confirmed")} disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><CheckCircle className="h-4 w-4 mr-1" />Confirm</>}
                  </Button>
                  <Button variant="destructive" className="flex-1"
                    onClick={() => handleStatusUpdate("Cancelled")} disabled={updating}>
                    <XCircle className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}

              {order.status === "Confirmed" && (
                <p className="text-sm text-center text-amber-600 rounded-md bg-amber-50 dark:bg-amber-950/30 p-2">
                  Use the <strong>Deliver</strong> button on the table row to process delivery.
                </p>
              )}

              {(order.status === "Delivered" || order.status === "Cancelled") && (
                <p className="text-sm text-center text-muted-foreground pb-2">
                  This order is {order.status.toLowerCase()}.
                </p>
              )}

              {order.status !== "Delivered" && (
                <div className="pt-4 border-t mt-4 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground text-center">Destructive Action</p>
                  <Button variant="destructive" onClick={handleDeleteOrder} disabled={updating}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery & Sale Dialog */}
      <Dialog open={deliveryOpen}
        onOpenChange={v => { if (!v && !submitting) setDeliveryOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
            <DialogDescription>Set sale price per item. Purchase cost shown as reference.</DialogDescription>
          </DialogHeader>
          {deliveryOrder && (
            <div className="space-y-4">

              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{deliveryOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Quantity</span>
                  <span className="font-medium">
                    {deliveryOrder.items.reduce((s, i) => s + i.quantity, 0)} kg
                  </span>
                </div>
              </div>

              <div className="border rounded-lg divide-y bg-background">
                {deliveryOrder.items.map((item, idx) => {
                  const matches = getMatchingBatches(item.itemName, item.grade, Number(item.quantity));
                  const selectedBatchId = itemBatches[idx];
                  const selectedBatch = matches.find(b => b.id === selectedBatchId);
                  const cost = selectedBatch ? selectedBatch.purchasePrice : null;

                  return (
                    <div key={idx} className="p-3 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            Grade {item.grade} — {item.quantity} kg
                            {(item as any).packing && (item as any).packing !== "Loose"
                              && ` (${(item as any).packing})`}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sale price/kg</Label>
                          <Input
                            type="number" min={1} placeholder="PKR"
                            className="h-8 text-sm mt-1"
                            value={itemPrices[idx] ?? ""}
                            onChange={e => setItemPrices(prev => ({ ...prev, [idx]: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Explicit Batch Selection */}
                      <div className="bg-muted/40 p-2 rounded-md space-y-2">
                        <Label className="text-xs font-semibold">Select Inventory Batch</Label>
                        <Select 
                          value={selectedBatchId || "none"} 
                          onValueChange={(val) => {
                            setItemBatches(prev => ({ ...prev, [idx]: val }));
                            // Automatically update the baseline cost to the new batch's purchase price
                            const newlySelected = matches.find(m => m.id === val);
                            if (newlySelected) {
                              setItemPrices(prev => ({ ...prev, [idx]: String(newlySelected.purchasePrice) }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {matches.length === 0 ? (
                              <SelectItem value="none" disabled>No suitable batches found</SelectItem>
                            ) : (
                              matches.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  Batch {m.batchRef} — {m.remainingQuantity}kg Avail (Cost: {formatPKR(m.purchasePrice)})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

                        {/* Profit preview tied to selection */}
                        <div className="flex justify-between items-center text-xs">
                          {cost ? (
                            <span className="text-muted-foreground">Unit Cost: <span className="font-medium text-foreground">{formatPKR(cost)}</span></span>
                          ) : (
                            <span className="text-orange-500 font-medium">⚠ No batch selected</span>
                          )}

                          {Number(itemPrices[idx]) > 0 && cost && (
                            <span className={`font-medium ${
                              Number(itemPrices[idx]) > cost ? "text-green-600" : "text-red-500"
                            }`}>
                              {Number(itemPrices[idx]) > cost
                                ? `+${formatPKR((Number(itemPrices[idx]) - cost) * item.quantity)} profit`
                                : `-${formatPKR((cost - Number(itemPrices[idx])) * item.quantity)} loss`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalAmount > 0 && (
                <div className="rounded-lg border p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sale Amount</span>
                    <span className="font-semibold">{formatPKR(totalAmount)}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount Paid Now (PKR)</Label>
                    <Input type="number" min={0} max={totalAmount}
                      value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Outstanding</span>
                    <span className={outstanding > 0 ? "text-red-500" : "text-green-600"}>
                      {formatPKR(outstanding)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input placeholder="Any notes..." value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1"
                  onClick={() => setDeliveryOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmDelivery}
                  disabled={submitting || totalAmount <= 0}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                    : <><CheckCircle className="h-4 w-4 mr-2" />Confirm Delivery</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnlineOrders;