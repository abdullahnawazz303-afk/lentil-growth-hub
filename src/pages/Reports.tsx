import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Printer } from "lucide-react";
import { useSalesStore } from "@/stores/salesStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVendorStore } from "@/stores/vendorStore";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { formatPKR, formatKG, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

const Reports = () => {
  const sales = useSalesStore(s => s.sales);
  const batches = useInventoryStore(s => s.batches);
  const customers = useCustomerStore(s => s.customers);
  const vendors = useVendorStore(s => s.vendors);
  const customerLedger = useCustomerStore(s => s.ledgerEntries);
  const vendorLedger = useVendorStore(s => s.ledgerEntries);
  const days = useCashFlowStore(s => s.days);
  const getCustomerOutstanding = useCustomerStore(s => s.getOutstanding);
  const getVendorOutstanding = useVendorStore(s => s.getOutstanding);
  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown';
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const handlePrint = () => window.print();

  const exportCSV = (headers: string, rows: string, filename: string) => {
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute top customers/items for sales report
  const totalSalesAmount = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const customerSalesMap: Record<string, number> = {};
  const itemSalesMap: Record<string, number> = {};
  sales.forEach(sale => {
    customerSalesMap[sale.customerId] = (customerSalesMap[sale.customerId] || 0) + sale.totalAmount;
    sale.items.forEach(item => {
      const batch = batches.find(b => b.id === item.batchId);
      const name = batch?.itemName || 'Unknown';
      itemSalesMap[name] = (itemSalesMap[name] || 0) + item.quantity;
    });
  });
  const topCustomers = Object.entries(customerSalesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topItems = Object.entries(itemSalesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const paidSales = sales.filter(s => s.paymentStatus === 'Paid').length;
  const partialSales = sales.filter(s => s.paymentStatus === 'Partially Paid').length;
  const unpaidSales = sales.filter(s => s.paymentStatus === 'Unpaid').length;

  // Purchase totals per vendor
  const vendorPurchaseMap: Record<string, number> = {};
  Object.entries(vendorLedger).forEach(([vendorId, entries]) => {
    vendorPurchaseMap[vendorId] = entries.filter(e => e.type === 'Purchase' || e.type === 'Opening Balance').reduce((s, e) => s + e.credit, 0);
  });
  const topVendors = Object.entries(vendorPurchaseMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial and operational reports</p>
        </div>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="vendorBalance">Vendor Balances</TabsTrigger>
          <TabsTrigger value="customerBalance">Customer Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <h3 className="font-semibold">Sales Report</h3>
          {sales.length === 0 ? <EmptyState title="No sales data" description="Sales will appear here once recorded." /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="font-bold text-lg">{formatPKR(totalSalesAmount)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-bold text-lg status-healthy">{paidSales}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Partially Paid</p>
                  <p className="font-bold text-lg status-due-soon">{partialSales}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Unpaid</p>
                  <p className="font-bold text-lg status-overdue">{unpaidSales}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-2">Top 5 Customers by Sales</h4>
                  {topCustomers.map(([cId, amount]) => (
                    <div key={cId} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{getCustomerName(cId)}</span><span className="font-medium">{formatPKR(amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-2">Top 5 Items by Quantity</h4>
                  {topItems.map(([name, qty]) => (
                    <div key={name} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{name}</span><span className="font-medium">{formatKG(qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.id}</TableCell>
                        <TableCell>{formatDate(s.date)}</TableCell>
                        <TableCell>{getCustomerName(s.customerId)}</TableCell>
                        <TableCell className="text-right">{formatPKR(s.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatPKR(s.amountPaid)}</TableCell>
                        <TableCell><Badge variant={s.paymentStatus === 'Paid' ? 'default' : 'destructive'}>{s.paymentStatus}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const h = "Sale ID,Date,Customer,Amount,Paid,Status\n";
                const r = sales.map(s => `${s.id},${s.date},${getCustomerName(s.customerId)},${s.totalAmount},${s.amountPaid},${s.paymentStatus}`).join("\n");
                exportCSV(h, r, "sales-report.csv");
              }}>Export CSV</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <h3 className="font-semibold">Purchase Report</h3>
          {batches.length === 0 ? <EmptyState title="No purchase data" description="Inventory batches will appear here." /> : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-sm mb-2">Top 5 Vendors by Purchase Value</h4>
                {topVendors.map(([vId, amount]) => (
                  <div key={vId} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{getVendorName(vId)}</span><span className="font-medium">{formatPKR(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price/kg</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-sm">{b.batchRef}</TableCell>
                        <TableCell>{b.itemName}</TableCell>
                        <TableCell>{b.grade}</TableCell>
                        <TableCell>{getVendorName(b.vendorId)}</TableCell>
                        <TableCell className="text-right">{formatKG(b.quantity)}</TableCell>
                        <TableCell className="text-right">{formatPKR(b.purchasePrice)}</TableCell>
                        <TableCell>{formatDate(b.purchaseDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <h3 className="font-semibold">Current Stock</h3>
          {batches.filter(b => b.remainingQuantity > 0).length === 0 ? <EmptyState title="No stock" description="No items in stock." /> : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Stock Value</p>
                <p className="font-bold text-lg">{formatPKR(batches.reduce((s, b) => s + b.remainingQuantity * b.purchasePrice, 0))}</p>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.filter(b => b.remainingQuantity > 0).map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{b.itemName}</TableCell>
                        <TableCell>{b.grade}</TableCell>
                        <TableCell>{getVendorName(b.vendorId)}</TableCell>
                        <TableCell className={`text-right ${b.remainingQuantity < 100 ? 'status-overdue' : ''}`}>{formatKG(b.remainingQuantity)}</TableCell>
                        <TableCell className="text-right">{formatPKR(b.remainingQuantity * b.purchasePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <h3 className="font-semibold">Cash Flow Summary</h3>
          {Object.keys(days).length === 0 ? <EmptyState title="No cash flow data" description="Cash entries will appear here." /> : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Cash In</TableHead>
                    <TableHead className="text-right">Cash Out</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(days).sort((a, b) => b.date.localeCompare(a.date)).map(d => {
                    const tIn = d.entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
                    const tOut = d.entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
                    return (
                      <TableRow key={d.date}>
                        <TableCell>{formatDate(d.date)}</TableCell>
                        <TableCell className="text-right">{formatPKR(d.openingBalance)}</TableCell>
                        <TableCell className="text-right status-healthy">{formatPKR(tIn)}</TableCell>
                        <TableCell className="text-right status-overdue">{formatPKR(tOut)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPKR(d.isClosed ? d.closingBalance! : d.openingBalance + tIn - tOut)}</TableCell>
                        <TableCell><Badge variant={d.isClosed ? 'default' : 'secondary'}>{d.isClosed ? 'Closed' : 'Open'}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendorBalance" className="space-y-4">
          <h3 className="font-semibold">Vendor Outstanding Balances</h3>
          {vendors.length === 0 ? <EmptyState title="No vendors" description="Add vendors to see balances." /> : (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Total Purchased</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...vendors].sort((a, b) => getVendorOutstanding(b.id) - getVendorOutstanding(a.id)).map(v => {
                      const entries = vendorLedger[v.id] || [];
                      const totalPurchased = entries.reduce((s, e) => s + e.credit, 0);
                      const totalPaid = entries.reduce((s, e) => s + e.debit, 0);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.phone}</TableCell>
                          <TableCell className="text-right">{formatPKR(totalPurchased)}</TableCell>
                          <TableCell className="text-right">{formatPKR(totalPaid)}</TableCell>
                          <TableCell className={`text-right font-medium ${getVendorOutstanding(v.id) > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(getVendorOutstanding(v.id))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const h = "Vendor,Phone,Outstanding\n";
                const r = vendors.map(v => `${v.name},${v.phone},${getVendorOutstanding(v.id)}`).join("\n");
                exportCSV(h, r, "vendor-balances.csv");
              }}>Export CSV</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customerBalance" className="space-y-4">
          <h3 className="font-semibold">Customer Outstanding Balances</h3>
          {customers.length === 0 ? <EmptyState title="No customers" description="Add customers to see balances." /> : (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...customers].sort((a, b) => getCustomerOutstanding(b.id) - getCustomerOutstanding(a.id)).map(c => {
                      const entries = customerLedger[c.id] || [];
                      const totalSales = entries.reduce((s, e) => s + e.debit, 0);
                      const totalPaid = entries.reduce((s, e) => s + e.credit, 0);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.phone}</TableCell>
                          <TableCell className="text-right">{formatPKR(totalSales)}</TableCell>
                          <TableCell className="text-right">{formatPKR(totalPaid)}</TableCell>
                          <TableCell className={`text-right font-medium ${getCustomerOutstanding(c.id) > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(getCustomerOutstanding(c.id))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const h = "Customer,Phone,Outstanding\n";
                const r = customers.map(c => `${c.name},${c.phone},${getCustomerOutstanding(c.id)}`).join("\n");
                exportCSV(h, r, "customer-balances.csv");
              }}>Export CSV</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
