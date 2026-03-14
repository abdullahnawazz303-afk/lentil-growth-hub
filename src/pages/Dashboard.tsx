import { useEffect } from "react";
import { KpiCard } from "@/components/KpiCard";
import { Wallet, Users, Landmark, FileText, Package, Calendar, AlertTriangle, ShoppingCart } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useChequeStore } from "@/stores/chequeStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useSalesStore } from "@/stores/salesStore";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { formatPKR, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { getTodayBalance, fetchDays } = useCashFlowStore();
  const { getTotalReceivables, fetchCustomers } = useCustomerStore();
  const { getTotalPayables, getOverduePayables, fetchVendors, fetchPurchases, vendors } = useVendorStore();
  const { getPendingCount, getPendingTotal, fetchCheques } = useChequeStore();
  const { getTotalStockValue, getLowStockBatches, fetchBatches } = useInventoryStore();
  const { getPendingDeliveryCount, getUpcomingDeliveries, fetchBookings } = useBookingStore();
  const { sales, fetchSales } = useSalesStore();
  const { orders, fetchOrders } = useOnlineOrderStore();

  useEffect(() => {
    fetchDays();
    fetchCustomers();
    fetchVendors();
    fetchPurchases();
    fetchCheques();
    fetchBatches();
    fetchBookings();
    fetchSales();
    fetchOrders();
  }, []);

  const todayBalance      = getTodayBalance();
  const totalReceivables  = getTotalReceivables();
  const totalPayables     = getTotalPayables();
  const overduePayables   = getOverduePayables();
  const pendingCount      = getPendingCount();
  const pendingTotal      = getPendingTotal();
  const inventoryValue    = getTotalStockValue();
  const pendingDeliveries = getPendingDeliveryCount();
  const lowStockCount     = getLowStockBatches().length;
  const recentSales       = sales.slice(0, 5);
  const upcomingBookings  = getUpcomingDeliveries(5);

  // ── Online orders — pending only, latest 5
  const pendingOrders = orders
    .filter((o) => o.status === 'Pending')
    .slice(0, 5);
  const pendingOrderCount = orders.filter((o) => o.status === 'Pending').length;

  const getVendorName = (id: string) =>
    vendors.find((v) => v.id === id)?.name || 'Unknown';

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Pending':    return 'destructive';
      case 'Confirmed':  return 'secondary';
      case 'Processing': return 'secondary';
      case 'Delivered':  return 'default';
      case 'Cancelled':  return 'outline';
      default:           return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of factory operations & finances</p>
      </div>

      {/* ── Row 1 — Finance KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Cash Balance"
          value={formatPKR(todayBalance)}
          subtitle="Opening + In - Out"
          icon={Wallet}
        />
        <KpiCard
          title="Total Receivables"
          value={formatPKR(totalReceivables)}
          subtitle="Outstanding from customers"
          icon={Users}
        />
        <KpiCard
          title="Total Payables"
          value={formatPKR(totalPayables)}
          subtitle={overduePayables.length > 0 ? `${overduePayables.length} overdue` : "Outstanding to vendors"}
          icon={Landmark}
          variant={totalPayables > 0 ? "warning" : undefined}
        />
        <KpiCard
          title="Pending Cheques"
          value={String(pendingCount)}
          subtitle={formatPKR(pendingTotal)}
          icon={FileText}
          variant={pendingCount > 0 ? "warning" : undefined}
        />
      </div>

      {/* ── Row 2 — Inventory + Orders KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Inventory Value"
          value={formatPKR(inventoryValue)}
          subtitle="Total stock value"
          icon={Package}
        />
        <KpiCard
          title="Pending Deliveries"
          value={String(pendingDeliveries)}
          subtitle="Advance bookings"
          icon={Calendar}
        />
        <KpiCard
          title="Low Stock Alerts"
          value={String(lowStockCount)}
          subtitle="Batches below 100 kg"
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? "danger" : undefined}
        />
        <KpiCard
          title="Online Orders"
          value={String(pendingOrderCount)}
          subtitle="Awaiting confirmation"
          icon={ShoppingCart}
          variant={pendingOrderCount > 0 ? "warning" : undefined}
        />
      </div>

      {/* ── Row 3 — Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Sales */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sales recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{s.customerName || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        s.paymentStatus === 'Paid' ? 'default' :
                        s.paymentStatus === 'Unpaid' ? 'destructive' : 'secondary'
                      }>
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Upcoming Deliveries */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Upcoming Deliveries</h3>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending deliveries</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">
                      {b.vendorName || getVendorName(b.vendorId)}
                    </TableCell>
                    <TableCell>{formatDate(b.expectedDeliveryDate)}</TableCell>
                    <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ── Row 4 — Pending Online Orders ── */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Pending Online Orders</h3>
          {pendingOrderCount > 5 && (
            <span className="text-xs text-muted-foreground">
              Showing 5 of {pendingOrderCount} — go to Online Orders for full list
            </span>
          )}
        </div>
        {pendingOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pending online orders
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">
                    {(o as any).orderRef || o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{formatDate(o.date)}</TableCell>
                  <TableCell className="font-medium">{o.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{o.customerPhone}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {o.items.map((item, idx) => (
                        <span key={idx} className="text-xs text-muted-foreground">
                          {item.itemName} {item.grade} — {item.quantity} kg
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(o as any).requestedDeliveryDate
                      ? formatDate((o as any).requestedDeliveryDate)
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(o.status)}>
                      {o.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

    </div>
  );
};

export default Dashboard;