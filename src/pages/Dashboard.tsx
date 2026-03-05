import { KpiCard } from "@/components/KpiCard";
import { Wallet, Users, Landmark, FileText, Package, Calendar, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useChequeStore } from "@/stores/chequeStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useSalesStore } from "@/stores/salesStore";
import { formatPKR, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const todayBalance = useCashFlowStore(s => s.getTodayBalance());
  const totalReceivables = useCustomerStore(s => s.getTotalReceivables());
  const totalPayables = useVendorStore(s => s.getTotalPayables());
  const pendingCount = useChequeStore(s => s.getPendingCount());
  const pendingTotal = useChequeStore(s => s.getPendingTotal());
  const inventoryValue = useInventoryStore(s => s.getTotalStockValue());
  const pendingDeliveries = useBookingStore(s => s.getPendingDeliveryCount());
  const lowStockCount = useInventoryStore(s => s.getLowStockBatches().length);
  const sales = useSalesStore(s => s.sales);
  const upcomingBookings = useBookingStore(s => s.getUpcomingDeliveries(5));
  const customers = useCustomerStore(s => s.customers);
  const vendors = useVendorStore(s => s.vendors);
  const batches = useInventoryStore(s => s.batches);

  const recentSales = sales.slice(0, 5);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of factory operations & finances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Today's Cash Balance" value={formatPKR(todayBalance)} subtitle="Opening + In - Out" icon={Wallet} />
        <KpiCard title="Total Receivables" value={formatPKR(totalReceivables)} subtitle="Outstanding from customers" icon={Users} />
        <KpiCard title="Total Payables" value={formatPKR(totalPayables)} subtitle="Outstanding to vendors" icon={Landmark} />
        <KpiCard title="Pending Cheques" value={String(pendingCount)} subtitle={formatPKR(pendingTotal)} icon={FileText} variant={pendingCount > 0 ? "warning" : undefined} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Inventory Value" value={formatPKR(inventoryValue)} subtitle="Total stock value" icon={Package} />
        <KpiCard title="Pending Deliveries" value={String(pendingDeliveries)} subtitle="Advance bookings" icon={Calendar} />
        <KpiCard title="Low Stock Alerts" value={String(lowStockCount)} subtitle="Batches below 100 kg" icon={AlertTriangle} variant={lowStockCount > 0 ? "danger" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                {recentSales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(s.customerId)}</TableCell>
                    <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={s.paymentStatus === 'Paid' ? 'default' : s.paymentStatus === 'Unpaid' ? 'destructive' : 'secondary'}>
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Upcoming Deliveries</h3>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending deliveries</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingBookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.id}</TableCell>
                    <TableCell className="font-medium">{getVendorName(b.vendorId)}</TableCell>
                    <TableCell>{formatDate(b.expectedDeliveryDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{b.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
