import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSalesStore } from "@/stores/salesStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, LogOut, User, ShoppingCart, History, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatPKR, formatDate } from "@/lib/formatters";
import type { Grade, OnlineOrderItem } from "@/types";

const PRODUCTS = ["Dal Mash", "Dal Chana", "Dal Moong", "Masoor", "Rice", "Chickpeas"];
const GRADES: Grade[] = ["A+", "A", "B", "C"];

export default function CustomerPortal() {
  const { userEmail, logout } = useAuthStore();
  const navigate = useNavigate();
  const onlineOrderStore = useOnlineOrderStore();
  const customerStore = useCustomerStore();
  const salesStore = useSalesStore();

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OnlineOrderItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemGrade, setItemGrade] = useState<Grade>("A");
  const [itemQty, setItemQty] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCity, setCustCity] = useState("");

  const email = userEmail || "";
  const myOrders = onlineOrderStore.getOrdersByEmail(email);

  // Try to find a matching customer in the system
  const matchedCustomer = customerStore.customers.find(
    (c) => c.name.toLowerCase() === email.replace(/@.*/, "").toLowerCase() || c.phone === custPhone
  );
  const customerLedger = matchedCustomer ? customerStore.ledgerEntries[matchedCustomer.id] || [] : [];
  const outstanding = matchedCustomer ? customerStore.getOutstanding(matchedCustomer.id) : 0;
  const customerSales = matchedCustomer
    ? salesStore.sales.filter((s) => s.customerId === matchedCustomer.id)
    : [];

  const addItemToOrder = () => {
    if (!itemName || !itemQty || Number(itemQty) <= 0) {
      toast.error("Please fill item name and quantity");
      return;
    }
    setOrderItems([...orderItems, { itemName, grade: itemGrade, quantity: Number(itemQty), notes: itemNotes }]);
    setItemName("");
    setItemQty("");
    setItemNotes("");
  };

  const removeItem = (idx: number) => setOrderItems(orderItems.filter((_, i) => i !== idx));

  const submitOrder = () => {
    if (orderItems.length === 0) { toast.error("Add at least one item"); return; }
    if (!custName || !custPhone || !custCity) { toast.error("Fill your contact details"); return; }
    onlineOrderStore.addOrder({
      customerEmail: email,
      customerName: custName,
      customerPhone: custPhone,
      customerCity: custCity,
      items: orderItems,
    });
    toast.success("Order placed successfully!");
    setOrderItems([]);
    setOrderOpen(false);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "secondary";
      case "Confirmed": return "default";
      case "Rejected": return "destructive";
      case "Delivered": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Qais Foods</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {email}</p>
          </div>
          <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Place Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Place New Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Your Name *</Label>
                    <Input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone *</Label>
                    <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="+92..." />
                  </div>
                  <div className="space-y-1">
                    <Label>City *</Label>
                    <Input value={custCity} onChange={(e) => setCustCity(e.target.value)} placeholder="City" />
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-3">
                  <h4 className="font-medium text-sm">Add Items</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Select value={itemName} onValueChange={setItemName}>
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={itemGrade} onValueChange={(v) => setItemGrade(v as Grade)}>
                      <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty (kg)" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
                    <Button type="button" onClick={addItemToOrder} size="sm" className="h-10">Add</Button>
                  </div>
                  {orderItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Qty (kg)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((it, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{it.itemName}</TableCell>
                            <TableCell>{it.grade}</TableCell>
                            <TableCell>{it.quantity}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <Button onClick={submitOrder} className="w-full">Submit Order</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" /> My Orders</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Deal History</TabsTrigger>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
          </TabsList>

          {/* My Orders */}
          <TabsContent value="orders">
            {myOrders.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                No orders yet. Click "Place Order" to get started.
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">{o.id}</TableCell>
                          <TableCell>{formatDate(o.date)}</TableCell>
                          <TableCell>
                            {o.items.map((i) => `${i.itemName} ${i.grade} (${i.quantity} kg)`).join(", ")}
                          </TableCell>
                          <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Deal History — shows sales and ledger from the main system */}
          <TabsContent value="history">
            {!matchedCustomer ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                Your account is not yet linked to our system. Once the admin registers you, your deal history will appear here.
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Deals</p>
                      <p className="text-2xl font-bold">{customerSales.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">{formatPKR(customerSales.reduce((s, x) => s + x.totalAmount, 0))}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className="text-2xl font-bold text-destructive">{formatPKR(outstanding)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">Ledger</CardTitle></CardHeader>
                  <CardContent className="p-0">
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
                        {customerLedger.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{formatDate(e.date)}</TableCell>
                            <TableCell>{e.type}</TableCell>
                            <TableCell>{e.description}</TableCell>
                            <TableCell className="text-right">{e.debit > 0 ? formatPKR(e.debit) : "-"}</TableCell>
                            <TableCell className="text-right">{e.credit > 0 ? formatPKR(e.credit) : "-"}</TableCell>
                            <TableCell className="text-right font-medium">{formatPKR(e.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchedCustomer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-muted-foreground text-xs">Name</Label><p className="font-medium">{matchedCustomer.name}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Contact Person</Label><p className="font-medium">{matchedCustomer.contactPerson}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{matchedCustomer.phone}</p></div>
                    <div><Label className="text-muted-foreground text-xs">City</Label><p className="font-medium">{matchedCustomer.city}</p></div>
                    <div className="sm:col-span-2"><Label className="text-muted-foreground text-xs">Address</Label><p className="font-medium">{matchedCustomer.address}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Outstanding Balance</Label><p className="font-medium text-destructive">{formatPKR(outstanding)}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant={matchedCustomer.isActive ? "default" : "secondary"}>{matchedCustomer.isActive ? "Active" : "Inactive"}</Badge></div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6">
                    <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>Email: {email}</p>
                    <p className="text-sm mt-2">Your profile will be available once the admin registers you as a customer.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
