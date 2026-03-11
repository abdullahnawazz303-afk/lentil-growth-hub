import { useState } from "react";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/formatters";
import { Globe, CheckCircle, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import type { OnlineOrderStatus } from "@/types";

const OnlineOrders = () => {
  const orderStore = useOnlineOrderStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = orderStore.orders.filter((o) => {
    const matchSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const order = selectedOrder ? orderStore.orders.find((o) => o.id === selectedOrder) : null;

  const updateStatus = (status: OnlineOrderStatus) => {
    if (!selectedOrder) return;
    orderStore.updateStatus(selectedOrder, status, adminNotes);
    toast.success(`Order ${status.toLowerCase()}`);
    setSelectedOrder(null);
    setAdminNotes("");
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "Pending": return "secondary";
      case "Confirmed": return "default";
      case "Rejected": return "destructive";
      case "Delivered": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Online Orders</h1>
        <p className="text-sm text-muted-foreground">Customer orders placed through the portal</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search by name, email, or order ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orderStore.orders.length === 0 ? (
        <EmptyState title="No online orders yet" description="When customers place orders from the portal, they will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.id}</TableCell>
                    <TableCell>{formatDate(o.date)}</TableCell>
                    <TableCell>
                      <div>{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                    </TableCell>
                    <TableCell>{o.customerPhone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {o.items.map((i) => `${i.itemName} ${i.grade} (${i.quantity} kg)`).join(", ")}
                    </TableCell>
                    <TableCell><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(o.id); setAdminNotes(o.adminNotes); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm py-2">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => { if (!v) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono">{order.id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(order.date)}</div>
                <div><span className="text-muted-foreground">Customer:</span> {order.customerName}</div>
                <div><span className="text-muted-foreground">Phone:</span> {order.customerPhone}</div>
                <div><span className="text-muted-foreground">Email:</span> {order.customerEmail}</div>
                <div><span className="text-muted-foreground">City:</span> {order.customerCity}</div>
              </div>

              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">Items</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{item.itemName} — Grade {item.grade}</span>
                    <span className="font-medium">{item.quantity} kg</span>
                  </div>
                ))}
              </div>

              <div><Badge variant={statusBadge(order.status)} className="text-sm">{order.status}</Badge></div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes for this order..." rows={2} />
              </div>

              {order.status === "Pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => updateStatus("Confirmed")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus("Rejected")}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {order.status === "Confirmed" && (
                <Button className="w-full" onClick={() => updateStatus("Delivered")}>
                  <Truck className="h-4 w-4 mr-1" /> Mark Delivered
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnlineOrders;
