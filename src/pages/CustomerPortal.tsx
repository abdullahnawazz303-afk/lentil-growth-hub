import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { useCustomerStore } from "@/stores/customerStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, LogOut, Loader2, Package, User, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatPKR, formatKG } from "@/lib/formatters";
import type { Grade, OnlineOrderItem } from "@/types";

const ITEM_OPTIONS = [
  "دال ماش", "دال چنا", "دال مونگ",
  "چاول", "چنے", "دال مسور", "ماش کی دال",
];
const GRADE_OPTIONS: Grade[] = ["A+", "A", "B", "C"];

const statusVariant = (s: string) => {
  switch (s) {
    case "Pending":   return "secondary";
    case "Confirmed": return "default";
    case "Delivered": return "default";
    case "Cancelled": return "destructive";
    default:          return "secondary";
  }
};

const CustomerPortal = () => {
  const { logout, customerId, userEmail } = useAuthStore();
  const { orders, fetchMyOrders, addOrder, loading: ordersLoading } = useOnlineOrderStore();
  const { fetchLedger, ledgerEntries } = useCustomerStore();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Account popover state
  const [accountOpen, setAccountOpen] = useState(false);
  const [changingPw, setChangingPw]   = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);

  // New order form
  const [orderOpen, setOrderOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<OnlineOrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [currentItem, setCurrentItem]   = useState("");
  const [currentGrade, setCurrentGrade] = useState<Grade>("A");
  const [currentQty, setCurrentQty]     = useState("");

  useEffect(() => {
    if (!customerId) return;
    fetchMyOrders(customerId);
    fetchLedger(customerId);
    loadCustomerProfile();
  }, [customerId]);

  const loadCustomerProfile = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .single();
    if (data) {
      setCustomerName(data.name ?? "");
      setCustomerPhone(data.phone ?? "");
    }
  };

  const myLedger = customerId ? (ledgerEntries[customerId] ?? []) : [];
  const outstanding = myLedger.length > 0 ? myLedger[myLedger.length - 1].balance : 0;

  // ── Change password
  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd          = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;
    const confirm     = fd.get("confirm") as string;

    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully");
      setChangingPw(false);
      setAccountOpen(false);
      (e.target as HTMLFormElement).reset();
    }
  };

  // ── Order helpers
  const addOrderItem = () => {
    if (!currentItem)    { toast.error("Select an item"); return; }
    const qty = Number(currentQty);
    if (qty <= 0)        { toast.error("Enter a valid quantity"); return; }
    setOrderItems(prev => [...prev, { itemName: currentItem, grade: currentGrade, quantity: qty, notes: "" }]);
    setCurrentItem(""); setCurrentGrade("A"); setCurrentQty("");
  };

  const removeOrderItem = (idx: number) =>
    setOrderItems(prev => prev.filter((_, i) => i !== idx));

  const resetOrderForm = () => {
    setOrderItems([]); setDeliveryDate(""); setOrderNotes("");
    setCurrentItem(""); setCurrentGrade("A"); setCurrentQty("");
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId)             { toast.error("Session error. Please log in again."); return; }
    if (orderItems.length === 0) { toast.error("Add at least one item"); return; }

    setSubmitting(true);
    const id = await addOrder(customerId, orderItems, orderNotes, deliveryDate || undefined);
    setSubmitting(false);

    if (id) {
      toast.success("Order placed! The factory will confirm it shortly.");
      resetOrderForm();
      setOrderOpen(false);
    } else {
      toast.error("Failed to place order. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ── */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        {/* Left: brand / customer info */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{customerName || "Customer Portal"}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {/* Right: account + logout */}
        <div className="flex items-center gap-2">

          {/* Account Popover */}
          <Popover open={accountOpen} onOpenChange={v => { setAccountOpen(v); if (!v) setChangingPw(false); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                Account
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-72 p-0" align="end">
              {!changingPw ? (
                <div>
                  {/* Profile header */}
                  <div className="p-4 bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{customerName || userEmail}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Customer</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Info */}
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{customerName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium truncate max-w-[160px]">{userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{customerPhone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className={`font-semibold ${outstanding > 0 ? "text-destructive" : "text-green-600"}`}>
                        {formatPKR(outstanding)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="p-2 space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm h-9"
                      onClick={() => setChangingPw(true)}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                /* Change Password view */
                <div>
                  <div className="p-4 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setChangingPw(false)}>←</Button>
                    <span className="font-semibold text-sm">Change Password</span>
                  </div>
                  <form onSubmit={handleChangePassword} className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">New Password</Label>
                      <Input name="newPassword" type="password"
                        placeholder="Min 6 characters" required minLength={6} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Confirm Password</Label>
                      <Input name="confirm" type="password"
                        placeholder="Repeat new password" required />
                    </div>
                    <Button type="submit" className="w-full" size="sm" disabled={pwLoading}>
                      {pwLoading ? "Saving..." : "Update Password"}
                    </Button>
                  </form>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Logout button with text */}
          <Button
            variant="ghost" size="sm"
            onClick={logout}
            className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-600">
              {orders.filter(o => o.status === "Pending").length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${outstanding > 0 ? "text-red-500" : "text-green-600"}`}>
              {formatPKR(outstanding)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="orders">My Orders</TabsTrigger>
            <TabsTrigger value="ledger">My Ledger</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Order History</h2>
              <Dialog open={orderOpen} onOpenChange={v => { setOrderOpen(v); if (!v) resetOrderForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Place Order</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
                  <form onSubmit={handleOrderSubmit} className="space-y-4">
                    <div className="border rounded-lg p-3 space-y-3">
                      <h4 className="font-medium text-sm">Items *</h4>
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted rounded p-2 text-sm">
                          <span>
                            {item.itemName}{" "}
                            <span className="text-muted-foreground">Grade {item.grade}</span>
                            {" — "}
                            <span className="font-medium">{formatKG(item.quantity)}</span>
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={currentItem} onValueChange={setCurrentItem}>
                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            {ITEM_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={currentGrade} onValueChange={v => setCurrentGrade(v as Grade)}>
                          <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                          <SelectContent>
                            {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Input type="number" placeholder="kg" min={1}
                            value={currentQty} onChange={e => setCurrentQty(e.target.value)} />
                          <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Delivery Date (optional)</Label>
                      <Input type="date" value={deliveryDate}
                        onChange={e => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
                        placeholder="Any special instructions..." rows={2} />
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      Prices will be confirmed by the factory after order review.
                      You will be notified via WhatsApp.
                    </p>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing order...</>
                        : "Place Order"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /><span>Loading orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 border rounded-lg text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm">Place your first order using the button above.</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Ref</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {o.orderRef || o.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(o.date)}</TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <div className="truncate">
                            {o.items.map(i => `${i.itemName} (${i.quantity} kg)`).join(", ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.requestedDeliveryDate ? formatDate(o.requestedDeliveryDate) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Ledger Tab */}
          <TabsContent value="ledger" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Account Statement</h2>
              <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                outstanding > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}>
                Balance: {formatPKR(outstanding)}
              </div>
            </div>
            {myLedger.length === 0 ? (
              <div className="text-center py-12 border rounded-lg text-muted-foreground">
                <p>No transactions yet.</p>
              </div>
            ) : (
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
                    {myLedger.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                        <TableCell className="text-right text-sm text-red-500">
                          {entry.debit > 0 ? formatPKR(entry.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-green-600">
                          {entry.credit > 0 ? formatPKR(entry.credit) : "—"}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${entry.balance > 0 ? "text-red-500" : "text-green-600"}`}>
                          {formatPKR(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerPortal;