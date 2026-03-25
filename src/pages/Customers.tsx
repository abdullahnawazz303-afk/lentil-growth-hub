import { useState, useEffect } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { useSalesStore } from "@/stores/salesStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatDate } from "@/lib/formatters";
import type { Customer } from "@/types";

const Customers = () => {
  const { customers, addCustomer, editCustomer, deleteCustomer, fetchCustomers, getOutstanding, loading } = useCustomerStore();
  const { sales, fetchSales, addPayment } = useSalesStore();

  const [open, setOpen]             = useState(false);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  const [editOpen, setEditOpen]                   = useState(false);
  const [editingCustomer, setEditingCustomer]     = useState<Customer | null>(null);
  const [editSubmitting, setEditSubmitting]       = useState(false);

  const [deleteConfirmId, setDeleteConfirmId]     = useState<string | null>(null);
  const [deleting, setDeleting]                   = useState(false);

  const [payOpen, setPayOpen]                     = useState(false);
  const [payingSale, setPayingSale]               = useState<{ id: string; outstanding: number; customerName: string } | null>(null);
  const [payAmount, setPayAmount]                 = useState("");
  const [paying, setPaying]                       = useState(false);

  const [pickSaleOpen, setPickSaleOpen]           = useState(false);
  const [pickSaleCustomerId, setPickSaleCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchSales();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    const id = await addCustomer({
      name:           fd.get("name") as string,
      email:          fd.get("email") as string || "",
      contactPerson:  fd.get("contactPerson") as string || "",
      phone:          fd.get("phone") as string,
      city:           fd.get("city") as string || "",
      address:        fd.get("address") as string || "",
      openingBalance: Number(fd.get("openingBalance")) || 0,
      creditLimit:    Number(fd.get("creditLimit")) || 0,
      notes:          fd.get("notes") as string || "",
      isActive: true,
    });
    setSubmitting(false);
    if (id) { setOpen(false); toast.success("Customer added"); }
    else toast.error("Failed to add customer");
  };

  const openEditDialog = (c: Customer) => { setEditingCustomer(c); setEditOpen(true); };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const fd = new FormData(e.currentTarget);
    setEditSubmitting(true);
    const ok = await editCustomer(editingCustomer.id, {
      name:          fd.get("name") as string,
      email:         fd.get("email") as string || "",
      contactPerson: fd.get("contactPerson") as string || "",
      phone:         fd.get("phone") as string,
      city:          fd.get("city") as string || "",
      address:       fd.get("address") as string || "",
      creditLimit:   Number(fd.get("creditLimit")) || 0,
      notes:         fd.get("notes") as string || "",
      isActive:      fd.get("isActive") === "on",
    });
    setEditSubmitting(false);
    if (ok) { setEditOpen(false); setEditingCustomer(null); toast.success("Customer updated"); }
    else toast.error("Failed to update customer");
  };

  const handleDelete = async (customerId: string) => {
    setDeleting(true);
    const result = await deleteCustomer(customerId);
    setDeleting(false);
    setDeleteConfirmId(null);
    if (result.success) toast.success("Customer deleted");
    else toast.error(result.reason || "Cannot delete this customer");
  };

  const openPayForSale = (saleId: string, outstanding: number, customerName: string) => {
    setPayingSale({ id: saleId, outstanding, customerName });
    setPayAmount(String(outstanding));
    setPayOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSale) return;
    const amount = Number(payAmount);
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > payingSale.outstanding) {
      toast.error(`Cannot exceed outstanding: ${formatPKR(payingSale.outstanding)}`); return;
    }
    setPaying(true);
    const result = await addPayment(payingSale.id, amount);
    setPaying(false);
    if (result) {
      toast.success(`${formatPKR(amount)} payment recorded`);
      setPayOpen(false); setPayingSale(null); setPayAmount("");
    } else toast.error("Payment failed. Please try again.");
  };

  const filtered   = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );
  const paged      = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const pickSalePending = pickSaleCustomerId
    ? sales.filter(s => s.customerId === pickSaleCustomerId && s.outstanding > 0)
    : [];

  const customerToDelete = customers.find(c => c.id === deleteConfirmId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage wholesale customer list</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required maxLength={100} /></div>
                <div className="space-y-2">
                  <Label>Email (for Google Login)</Label>
                  <Input name="email" type="email" placeholder="customer@gmail.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone *</Label><Input name="phone" required maxLength={20} /></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input name="contactPerson" maxLength={100} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input name="city" maxLength={50} /></div>
                <div className="space-y-2"><Label>Address</Label><Input name="address" maxLength={200} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opening Balance (PKR)</Label>
                  <Input name="openingBalance" type="number" min="0" defaultValue="0" />
                  <p className="text-xs text-muted-foreground">Amount this customer already owes you.</p>
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit (PKR)</Label>
                  <Input name="creditLimit" type="number" min="0" defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" maxLength={500} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Add Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search customers..." value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /><span>Loading customers...</span>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState title="No customers yet"
          description="No records found. Add your first customer to get started."
          actionLabel="Add First Customer" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(c => {
                  const outstanding = getOutstanding(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.name}
                        {c.email && <div className="text-xs text-muted-foreground font-normal">{c.email}</div>}
                      </TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell className={`text-right font-medium ${outstanding > 0 ? "text-red-500" : "text-green-600"}`}>
                        {formatPKR(outstanding)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Edit */}
                          <Button size="sm" variant="ghost"
                            onClick={() => openEditDialog(c)} title="Edit Customer">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {/* Delete */}
                          <Button size="sm" variant="ghost"
                            onClick={() => setDeleteConfirmId(c.id)}
                            title="Delete Customer"
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {/* Pay */}
                          {outstanding > 0 && (
                            <Button size="sm" variant="outline"
                              onClick={() => { setPickSaleCustomerId(c.id); setPickSaleOpen(true); }}
                              title="Record Payment">
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                            </Button>
                          )}
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
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setEditingCustomer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Customer — {editingCustomer?.name}</DialogTitle></DialogHeader>
          {editingCustomer && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required maxLength={100} defaultValue={editingCustomer.name} />
                </div>
                <div className="space-y-2">
                  <Label>Email (for Google Login)</Label>
                  <Input name="email" type="email" defaultValue={editingCustomer.email} placeholder="customer@gmail.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input name="phone" required maxLength={20} defaultValue={editingCustomer.phone} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input name="contactPerson" maxLength={100} defaultValue={editingCustomer.contactPerson} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" maxLength={50} defaultValue={editingCustomer.city} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" maxLength={200} defaultValue={editingCustomer.address} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Credit Limit (PKR)</Label>
                <Input name="creditLimit" type="number" min="0" defaultValue={editingCustomer.creditLimit} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" maxLength={500} defaultValue={editingCustomer.notes} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">Inactive customers cannot be assigned new sales</p>
                </div>
                <Switch name="isActive" defaultChecked={editingCustomer.isActive} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={editSubmitting}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={v => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{customerToDelete?.name}</span>?
              This cannot be undone.
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              Deletion is blocked if this customer has any sales or ledger history.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1"
                onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" disabled={deleting}
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pick Sale Dialog */}
      <Dialog open={pickSaleOpen} onOpenChange={v => { setPickSaleOpen(v); if (!v) setPickSaleCustomerId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Select Sale to Pay</DialogTitle></DialogHeader>
          {pickSalePending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No outstanding sales found.</p>
          ) : (
            <div className="space-y-2">
              {pickSalePending.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">
                    <p className="font-medium font-mono">{s.saleRef || s.id.slice(0, 8)}</p>
                    <p className="text-muted-foreground">{formatDate(s.date)}</p>
                  </div>
                  <div className="text-right text-sm mr-4">
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-semibold text-red-500">{formatPKR(s.outstanding)}</p>
                  </div>
                  <Button size="sm" onClick={() => {
                    setPickSaleOpen(false);
                    openPayForSale(s.id, s.outstanding, s.customerName ?? "");
                  }}>
                    <CreditCard className="h-3 w-3 mr-1" /> Pay
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={v => { setPayOpen(v); if (!v) { setPayingSale(null); setPayAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payingSale && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium">{payingSale.customerName}</span></p>
                <p><span className="text-muted-foreground">Outstanding: </span>
                  <span className="font-semibold text-red-500">{formatPKR(payingSale.outstanding)}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (PKR) *</Label>
                <Input type="number" min={1} max={payingSale.outstanding}
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus required />
                <p className="text-xs text-muted-foreground">Max: {formatPKR(payingSale.outstanding)}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={paying}>
                  {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Confirm Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;