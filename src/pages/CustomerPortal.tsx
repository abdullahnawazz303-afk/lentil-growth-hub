import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useRateCardStore } from "@/stores/rateCardStore";
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
import {
  Trash2, Plus, LogOut, Loader2, Package,
  User, KeyRound, ShieldCheck, Pencil, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatPKR, formatKG } from "@/lib/formatters";
import type { Grade, OnlineOrderItem } from "@/types";

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
  const { orders, fetchMyOrders, addOrder, cancelOrder, loading: ordersLoading } = useOnlineOrderStore();
  const { fetchLedger, ledgerEntries, editCustomerSelf } = useCustomerStore();
  const { rates, fetchRates, loading: ratesLoading } = useRateCardStore();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Account popover views: 'profile' | 'changePassword' | 'editProfile'
  const [accountOpen, setAccountOpen]   = useState(false);
  const [accountView, setAccountView]   = useState<'profile' | 'changePassword' | 'editProfile'>('profile');
  const [pwLoading, setPwLoading]       = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Cancel order confirm dialog
  const [cancelOrderId, setCancelOrderId]   = useState<string | null>(null);
  const [cancelling, setCancelling]         = useState(false);

  // New order form
  const [orderOpen, setOrderOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<OnlineOrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [currentItem, setCurrentItem]   = useState("");
  const [currentPacking, setCurrentPacking] = useState("Loose");
  const [currentGrade, setCurrentGrade] = useState<Grade>("A");
  const [currentQty, setCurrentQty]     = useState("");

  // ── Dynamic item names from Supabase (synced with Admin Inventory)
  const [itemOptions, setItemOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchItemNames = async () => {
      const { data } = await supabase
        .from("item_names")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (data) setItemOptions(data.map((d: any) => d.name));
    };
    fetchItemNames();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    fetchMyOrders(customerId);
    fetchLedger(customerId);
    loadCustomerProfile();
    fetchRates();
  }, [customerId]);

  const loadCustomerProfile = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from("customers")
      .select("name, phone, city, address")
      .eq("id", customerId)
      .single();
    if (data) {
      setCustomerName(data.name ?? "");
      setCustomerPhone(data.phone ?? "");
      setCustomerCity(data.city ?? "");
      setCustomerAddress(data.address ?? "");
    }
  };

  const myLedger = customerId ? (ledgerEntries[customerId] ?? []) : [];
  const outstanding = myLedger.length > 0 ? myLedger[myLedger.length - 1].balance : 0;

  // ── Change password
  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;
    const confirm     = fd.get("confirm") as string;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Password changed successfully");
      setAccountView('profile');
      setAccountOpen(false);
      (e.target as HTMLFormElement).reset();
    }
  };

  // ── Edit profile (phone, city, address only)
  const handleEditProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) return;
    const fd = new FormData(e.currentTarget);
    const phone   = fd.get("phone") as string;
    const city    = fd.get("city") as string;
    const address = fd.get("address") as string;

    setProfileSaving(true);
    const ok = await editCustomerSelf(customerId, { phone, city, address });
    setProfileSaving(false);

    if (ok) {
      setCustomerPhone(phone);
      setCustomerCity(city);
      setCustomerAddress(address);
      toast.success("Profile updated");
      setAccountView('profile');
    } else {
      toast.error("Failed to update profile");
    }
  };

  // ── Cancel order
  const handleCancelOrder = async () => {
    if (!cancelOrderId || !customerId) return;
    const target = orders.find(o => o.id === cancelOrderId);
    const orderRef = target?.orderRef || cancelOrderId.slice(0, 8);
    setCancelling(true);
    const result = await cancelOrder(cancelOrderId, customerId);
    setCancelling(false);
    setCancelOrderId(null);
    if (result.success) {
      toast.success("Order cancelled successfully");
      const cancelText = `*Order Cancelled*\nOrder Ref: ${orderRef}\nCustomer: ${customerName || userEmail}\nPhone: ${customerPhone || "N/A"}\n\nThis order has been cancelled by the customer.`;
      const whatsappUrl = `https://wa.me/923065887827?text=${encodeURIComponent(cancelText)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast.error(result.reason || "Could not cancel this order");
    }
  };

  // ── Order helpers
  const addOrderItem = () => {
    if (!currentItem) { toast.error("Select an item"); return; }
    const qty = Number(currentQty);
    if (qty <= 0) { toast.error("Enter a valid quantity"); return; }
    setOrderItems(prev => [...prev, { itemName: currentItem, packing: currentPacking, grade: currentGrade, quantity: qty, notes: "" }]);
    setCurrentItem(""); setCurrentPacking("Loose"); setCurrentGrade("A"); setCurrentQty("");
  };

  const removeOrderItem = (idx: number) =>
    setOrderItems(prev => prev.filter((_, i) => i !== idx));

  const resetOrderForm = () => {
    setOrderItems([]); setDeliveryDate(""); setOrderNotes("");
    setCurrentItem(""); setCurrentPacking("Loose"); setCurrentGrade("A"); setCurrentQty("");
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
      
      const orderText = `*New Online Order*\n` +
        `Customer: ${customerName || userEmail}\n` +
        `Phone: ${customerPhone || "N/A"}\n` +
        `Address: ${customerAddress || "N/A"}, ${customerCity || "N/A"}\n\n` +
        `*Items:*\n` +
        orderItems.map(i => `- ${i.itemName} (Grade ${i.grade})${i.packing && i.packing !== 'Loose' ? ` [${i.packing} packing]` : ''}: ${i.quantity} kg`).join("\n") +
        (deliveryDate ? `\n\nPreferred Delivery: ${deliveryDate}` : "") +
        (orderNotes ? `\nNotes: ${orderNotes}` : "");
      
      const whatsappUrl = `https://wa.me/923065887827?text=${encodeURIComponent(orderText)}`;
      window.open(whatsappUrl, '_blank');

      resetOrderForm(); setOrderOpen(false);
    } else {
      toast.error("Failed to place order. Please try again.");
    }
  };

  const cancelTarget = orders.find(o => o.id === cancelOrderId);

  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{customerName || "Customer Portal"}</p>
            <p className="hidden sm:block text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Popover */}
          <Popover open={accountOpen} onOpenChange={v => { setAccountOpen(v); if (!v) setAccountView('profile'); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 px-2 sm:px-3">
                <User className="h-4 w-4" /><span className="hidden sm:inline">Account</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-72 p-0" align="end">

              {/* ── Profile View ── */}
              {accountView === 'profile' && (
                <div>
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
                      <span className="text-muted-foreground">City</span>
                      <span className="font-medium">{customerCity || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className={`font-semibold ${outstanding > 0 ? "text-destructive" : "text-green-600"}`}>
                        {formatPKR(outstanding)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="p-2 space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-sm h-9"
                      onClick={() => setAccountView('editProfile')}>
                      <Pencil className="h-4 w-4 mr-2" />Edit Contact Info
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-sm h-9"
                      onClick={() => setAccountView('changePassword')}>
                      <KeyRound className="h-4 w-4 mr-2" />Change Password
                    </Button>
                    <Button variant="ghost"
                      className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />Logout
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Edit Profile View ── */}
              {accountView === 'editProfile' && (
                <div>
                  <div className="p-4 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setAccountView('profile')}>←</Button>
                    <span className="font-semibold text-sm">Edit Contact Info</span>
                  </div>
                  <form onSubmit={handleEditProfile} className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      You can update your phone, city, and address. To change your name, contact the factory.
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input name="phone" defaultValue={customerPhone}
                        placeholder="Your phone number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <Input name="city" defaultValue={customerCity}
                        placeholder="Your city" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address</Label>
                      <Input name="address" defaultValue={customerAddress}
                        placeholder="Your address" />
                    </div>
                    <Button type="submit" className="w-full" size="sm" disabled={profileSaving}>
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </div>
              )}

              {/* ── Change Password View ── */}
              {accountView === 'changePassword' && (
                <div>
                  <div className="p-4 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setAccountView('profile')}>←</Button>
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

          <Button variant="ghost" size="sm" onClick={logout}
            className="gap-2 px-2 sm:px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{orders.filter(o => o.status !== "Cancelled").length}</p>
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
          <TabsList className="w-full sm:w-auto flex flex-col sm:flex-row h-auto sm:h-10 gap-1 sm:gap-0 bg-transparent sm:bg-muted p-0 sm:p-1 items-stretch">
            <TabsTrigger value="orders" className="w-full sm:w-auto border sm:border-0 bg-muted/50 sm:bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground justify-start sm:justify-center">My Orders</TabsTrigger>
            <TabsTrigger value="rates" className="w-full sm:w-auto border sm:border-0 bg-muted/50 sm:bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground justify-start sm:justify-center">Market Rates</TabsTrigger>
            <TabsTrigger value="ledger" className="w-full sm:w-auto border sm:border-0 bg-muted/50 sm:bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground justify-start sm:justify-center">My Ledger</TabsTrigger>
          </TabsList>

          {/* Market Rates Tab */}
          <TabsContent value="rates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Today's Market Rates</h2>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground mb-4">
               <p className="font-semibold text-foreground mb-1">Pricing Note:</p>
               <p>These rates are indicative estimates representing today's market. Final pricing may be negotiated and confirmed based on your order quantity upon processing.</p>
            </div>

            {ratesLoading ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /><span>Loading rates...</span>
              </div>
            ) : rates.length === 0 ? (
              <div className="text-center py-12 border rounded-lg text-muted-foreground bg-card">
                <p>No market rates are published currently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(new Set(rates.map(r => r.item_name))).map(itemName => {
                   const itemRates = rates.filter(r => r.item_name === itemName).sort((a,b) => a.grade.localeCompare(b.grade));
                   if (itemRates.length === 0) return null;
                   
                   return (
                    <div key={itemName} className="rounded-lg border bg-card overflow-hidden">
                      <div className="bg-muted px-4 py-2 font-semibold text-sm border-b">
                        {itemName}
                      </div>
                      <div className="p-3">
                        <Table>
                          <TableBody>
                            {itemRates.map(rate => (
                              <TableRow key={rate.id} className="border-b-0 hover:bg-transparent">
                                <TableCell className="py-1.5 px-0 text-sm font-medium text-muted-foreground">Grade {rate.grade}</TableCell>
                                <TableCell className="py-1.5 px-0 text-right text-sm font-bold text-foreground">
                                  {rate.price_per_kg > 0 ? `${formatPKR(rate.price_per_kg)}/kg` : "Contact Us"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

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
                      <h4 className="font-medium text-sm">Order Items</h4>
                      
                      {/* Added Items List */}
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_1fr_1fr_40px] gap-2 items-center bg-muted/50 rounded-md border p-2 text-sm transition-all hover:bg-muted">
                          <span className="font-medium truncate">{item.itemName}</span>
                          <span className="text-muted-foreground">Grade {item.grade}</span>
                          <div>
                            {item.packing && item.packing !== "Loose" ? (
                              <Badge variant="secondary" className="font-normal">{item.packing}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Loose</span>
                            )}
                          </div>
                          <span className="font-medium text-right pr-2">{formatKG(item.quantity)}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeOrderItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Add Item Row Matrix */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 items-end rounded-md border p-3 bg-muted/20">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Item</Label>
                          <Select value={currentItem} onValueChange={setCurrentItem}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                            <SelectContent>
                              {itemOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Grade</Label>
                          <Select value={currentGrade} onValueChange={v => setCurrentGrade(v as Grade)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Grade" /></SelectTrigger>
                            <SelectContent>
                              {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Packing</Label>
                          <Select value={currentPacking} onValueChange={setCurrentPacking}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Packing" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Loose">Loose</SelectItem>
                              <SelectItem value="0.5 kg">0.5 kg</SelectItem>
                              <SelectItem value="1 kg">1 kg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Qty (kg)</Label>
                          <Input type="number" placeholder="0" min={1} value={currentQty} 
                            onChange={e => setCurrentQty(e.target.value)} className="h-9" />
                        </div>
                        <Button type="button" variant="secondary" size="icon" className="h-9 w-9 shrink-0" onClick={addOrderItem} title="Add to order">
                          <Plus className="h-4 w-4" />
                        </Button>
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
            ) : orders.filter(o => o.status !== "Cancelled").length === 0 ? (
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
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.filter(o => o.status !== "Cancelled").map(o => (
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
                        <TableCell>
                          {/* Cancel button — only for Pending orders */}
                          {o.status === "Pending" && (
                            <Button size="sm" variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                              onClick={() => setCancelOrderId(o.id)}
                              title="Cancel this order">
                              <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                            </Button>
                          )}
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

      {/* ── Cancel Order Confirmation Dialog ── */}
      <Dialog open={!!cancelOrderId} onOpenChange={v => { if (!v) setCancelOrderId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel order{" "}
              <span className="font-semibold text-foreground font-mono">
                {cancelTarget?.orderRef || cancelOrderId?.slice(0, 8)}
              </span>?
            </p>
            {cancelTarget && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                {cancelTarget.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.itemName} Grade {item.grade}</span>
                    <span className="font-medium">{item.quantity} kg</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Once cancelled, you can place a new order if needed.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1"
                onClick={() => setCancelOrderId(null)}>Keep Order</Button>
              <Button variant="destructive" className="flex-1"
                disabled={cancelling} onClick={handleCancelOrder}>
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPortal;