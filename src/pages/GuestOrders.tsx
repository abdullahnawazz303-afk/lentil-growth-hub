import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalesStore } from "@/stores/salesStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCustomerStore } from "@/stores/customerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2, Eye, CheckCircle, XCircle, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatPKR } from "@/lib/formatters";

interface GuestOrder {
  id: string;
  order_ref: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  guest_address: string | null;
  guest_location_url: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  guest_order_items?: GuestOrderItem[];
}

interface GuestOrderItem {
  id: string;
  item_name: string;
  grade: string | null;
  packing: string | null;
  quantity_kg: number;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pending: "secondary",
  Approved: "default",
  Rejected: "destructive",
  Delivered: "default",
  Converted: "outline",
};

export default function GuestOrders() {
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GuestOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { addSale } = useSalesStore();
  const { batches, fetchBatches } = useInventoryStore();
  const { customers, fetchCustomers, addCustomer } = useCustomerStore();

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<GuestOrder | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemBatches, setItemBatches] = useState<Record<string, string>>({});
  const [amountPaid, setAmountPaid] = useState("0");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("guest_orders")
      .select(`*, guest_order_items(*)`)
      .order("created_at", { ascending: false });
    setOrders((data || []) as GuestOrder[]);
    setLoading(false);
  };

  useEffect(() => { 
    fetchOrders();
    fetchBatches();
    fetchCustomers();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    const { error } = await supabase.from("guest_orders").update({ status }).eq("id", id);
    setActionLoading(false);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Order marked as ${status}`);
    fetchOrders();
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
  };

  const getMatchingBatches = (itemName: string, grade: string, requiredQty: number) => {
    return batches
      .filter(b => 
        b.itemName?.trim().toLowerCase() === itemName?.trim().toLowerCase() && 
        (!grade || b.grade?.trim().toLowerCase() === grade.trim().toLowerCase()) && 
        Number(b.remainingQuantity) >= requiredQty
      )
      .sort((a, b) => Number(b.remainingQuantity) - Number(a.remainingQuantity));
  };

  const openDeliveryDialog = (order: GuestOrder) => {
    const prices: Record<string, string> = {};
    const batchesState: Record<string, string> = {};

    order.guest_order_items?.forEach((item) => {
      const matches = getMatchingBatches(item.item_name, item.grade || "", Number(item.quantity_kg));
      if (matches.length > 0) {
        batchesState[item.id] = matches[0].id;
        prices[item.id] = String(matches[0].purchasePrice);
      }
    });

    setDeliveryOrder(order);
    setItemPrices(prices);
    setItemBatches(batchesState);
    setAmountPaid("0");
    setDeliveryNotes("");
    setSelected(null);
    setDeliveryOpen(true);
  };

  const computeTotals = () => {
    if (!deliveryOrder || !deliveryOrder.guest_order_items) return { totalAmount: 0, paid: 0, outstanding: 0 };
    const totalAmount = deliveryOrder.guest_order_items.reduce((sum, item) => {
      return sum + item.quantity_kg * (Number(itemPrices[item.id]) || 0);
    }, 0);
    const paid = Math.min(Number(amountPaid) || 0, totalAmount);
    return { totalAmount, paid, outstanding: totalAmount - paid };
  };

  const { totalAmount, paid, outstanding } = computeTotals();

  const handleConfirmDelivery = async () => {
    if (!deliveryOrder || !deliveryOrder.guest_order_items) return;

    const missingPrice = deliveryOrder.guest_order_items.find(
      (item) => !Number(itemPrices[item.id]) || Number(itemPrices[item.id]) <= 0
    );
    if (missingPrice) {
      toast.error(`Enter sale price for ${missingPrice.item_name}`);
      return;
    }

    setSubmitting(true);
    await fetchBatches();
    const freshBatches = useInventoryStore.getState().batches;

    const saleItems = deliveryOrder.guest_order_items.map((item) => {
      const price = Number(itemPrices[item.id]);
      const batchId = itemBatches[item.id];
      const batch = freshBatches.find(b => b.id === batchId);

      return {
        batchId: batch?.id ?? "",
        itemName: item.item_name,
        grade: batch?.grade ?? item.grade ?? '',
        quantity: item.quantity_kg,
        salePrice: price,
        subtotal: item.quantity_kg * price,
      };
    });

    const missing = saleItems.find(i => !i.batchId);
    if (missing) {
      const gradeInfo = missing.grade ? ` Grade ${missing.grade}` : '';
      toast.error(`Not enough stock for ${missing.itemName}${gradeInfo} (Req: ${missing.quantity}kg). Please add inventory first.`);
      setSubmitting(false);
      return;
    }

    // Ensure customer exists
    await fetchCustomers();
    const currentCustomers = useCustomerStore.getState().customers;
    let customer = currentCustomers.find(c => 
      c.phone.replace(/[^\d]/g, '') === deliveryOrder.guest_phone.replace(/[^\d]/g, '')
    );
    let customerId = customer?.id;

    if (!customerId) {
      customerId = await addCustomer({
        name: deliveryOrder.guest_name,
        phone: deliveryOrder.guest_phone,
        email: deliveryOrder.guest_email || undefined,
        address: deliveryOrder.guest_address || undefined,
        city: "Guest City", // Fallback city
        contactPerson: deliveryOrder.guest_name,
        openingBalance: 0,
        creditLimit: 0,
        notes: `Auto-created from Guest Order. Map URL: ${deliveryOrder.guest_location_url || "N/A"}`,
        isActive: true,
      });
    }

    if (!customerId) {
        toast.error("Failed to find or create customer record.");
        setSubmitting(false);
        return;
    }

    const saleId = await addSale({
      date: new Date().toISOString().split("T")[0],
      customerId: customerId,
      items: saleItems,
      totalAmount,
      amountPaid: paid,
      notes: deliveryNotes || `Guest Order #${deliveryOrder.order_ref}`,
      saleRef: "",
    });

    if (!saleId) {
      toast.error("Failed to create sale. Check inventory stock levels.");
      setSubmitting(false);
      return;
    }

    // Mark Guest Order as Converted (mapped to Delivered in UI)
    const { error: updErr } = await supabase.from("guest_orders").update({ status: "Converted" }).eq("id", deliveryOrder.id);
    if (updErr) {
        toast.error(`Sale created but failed to update order status: ${updErr.message}`);
    } else {
        toast.success(
          outstanding > 0
            ? `Sale created. ${formatPKR(outstanding)} outstanding added to customer ledger.`
            : "Sale created and fully paid."
        );
    }
    
    fetchOrders();
    setSubmitting(false);
    setDeliveryOpen(false);
    setDeliveryOrder(null);
    setItemPrices({});
  };

  const pendingCount   = orders.filter((o) => o.status === "Pending").length;
  const approvedCount  = orders.filter((o) => o.status === "Approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Online Guest Orders
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Orders placed by non-registered customers from the public shop.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="border rounded-xl p-10 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-primary/20" />
          <p className="font-medium">No guest orders yet</p>
          <p className="text-sm mt-1">Guest orders from the public shop will appear here.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total (kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className={order.status === "Pending" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.order_ref}
                  </TableCell>
                  <TableCell className="font-medium">{order.guest_name}</TableCell>
                  <TableCell>{order.guest_phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.created_at.split("T")[0])}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(order.total_amount).toLocaleString()} kg
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[order.status] ?? "secondary"}>
                      {order.status === 'Converted' ? 'Delivered' : order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.guest_location_url ? (
                      <a
                        href={order.guest_location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" /> View Map
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(order)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      
                      {order.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8"
                            disabled={actionLoading}
                            onClick={() => updateStatus(order.id, "Approved")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 h-8"
                            disabled={actionLoading}
                            onClick={() => updateStatus(order.id, "Rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {order.status === "Approved" && (
                        <Button 
                          size="sm"
                          onClick={() => openDeliveryDialog(order)}
                          className="h-8"
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" /> Deliver
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Order — {selected?.order_ref}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name</span><p className="font-medium">{selected.guest_name}</p></div>
                <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selected.guest_phone}</p></div>
                {selected.guest_email && (
                  <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selected.guest_email}</p></div>
                )}
                {selected.guest_address && (
                  <div className="col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium">{selected.guest_address}</p></div>
                )}
                {selected.guest_location_url && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Location</span>
                    <a
                      href={selected.guest_location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-1 text-primary font-medium text-sm hover:underline"
                    >
                      <MapPin className="h-4 w-4" /> Open in Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Order items */}
              <div>
                <p className="font-semibold text-sm mb-2">Order Items</p>
                <div className="rounded-lg border divide-y text-sm">
                  {selected.guest_order_items?.map((item) => (
                    <div key={item.id} className="px-3 py-2 flex justify-between items-center">
                      <div>
                        <span className="font-medium" dir="rtl">{item.item_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          Grade: {item.grade || "—"} | Packing: {item.packing || "—"}
                        </span>
                      </div>
                      <span className="font-semibold">{Number(item.quantity_kg).toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selected.status === "Pending" && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={actionLoading}
                    onClick={() => updateStatus(selected.id, "Approved")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve Order
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionLoading}
                    onClick={() => updateStatus(selected.id, "Rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              )}

              {selected.status === "Approved" && (
                <p className="text-sm text-center text-amber-600 rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 border border-amber-200 dark:border-amber-900 mt-4">
                  Use the <strong>Deliver</strong> button on the table row to process delivery.
                </p>
              )}

              {(selected.status === 'Converted' || selected.status === "Rejected") && (
                <p className="text-sm text-center text-muted-foreground pb-2">
                  This order is {selected.status === 'Converted' ? 'delivered' : selected.status.toLowerCase()}.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery & Sale Dialog */}
      <Dialog open={deliveryOpen} onOpenChange={v => { if (!v && !submitting) setDeliveryOpen(false); }}>
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
                  <span className="font-medium">{deliveryOrder.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Quantity</span>
                  <span className="font-medium">
                    {deliveryOrder.guest_order_items?.reduce((s, i) => s + i.quantity_kg, 0)} kg
                  </span>
                </div>
              </div>

              <div className="border rounded-lg divide-y bg-background">
                {deliveryOrder.guest_order_items?.map((item) => {
                  const matches = getMatchingBatches(item.item_name, item.grade || "", Number(item.quantity_kg));
                  const selectedBatchId = itemBatches[item.id];
                  const selectedBatch = matches.find(b => b.id === selectedBatchId);
                  const cost = selectedBatch ? selectedBatch.purchasePrice : null;

                  return (
                    <div key={item.id} className="p-3 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Grade {item.grade || "—"} — {item.quantity_kg} kg
                            {item.packing && item.packing !== "Loose" && ` (${item.packing})`}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sale price/kg</Label>
                          <Input
                            type="number" min={1} placeholder="PKR"
                            className="h-8 text-sm mt-1"
                            value={itemPrices[item.id] ?? ""}
                            onChange={e => setItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Explicit Batch Selection */}
                      <div className="bg-muted/40 p-2 rounded-md space-y-2">
                        <Label className="text-xs font-semibold">Select Inventory Batch</Label>
                        <Select 
                          value={selectedBatchId || "none"} 
                          onValueChange={(val) => {
                            setItemBatches(prev => ({ ...prev, [item.id]: val }));
                            // Automatically update the baseline cost to the new batch's purchase price
                            const newlySelected = matches.find(m => m.id === val);
                            if (newlySelected) {
                              setItemPrices(prev => ({ ...prev, [item.id]: String(newlySelected.purchasePrice) }));
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

                          {Number(itemPrices[item.id]) > 0 && cost && (
                            <span className={`font-medium ${
                              Number(itemPrices[item.id]) > cost ? "text-green-600" : "text-red-500"
                            }`}>
                              {Number(itemPrices[item.id]) > cost
                                ? `+${formatPKR((Number(itemPrices[item.id]) - cost) * item.quantity_kg)} profit`
                                : `-${formatPKR((cost - Number(itemPrices[item.id])) * item.quantity_kg)} loss`}
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
}
