import { useState, useEffect } from "react";
import { useVendorStore } from "@/stores/vendorStore";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, Users, AlertTriangle, Landmark, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/formatters";
import type { Vendor } from "@/types";

const Vendors = () => {
  const {
    vendors, loading,
    fetchVendors, fetchPurchases,
    addVendor, editVendor, deleteVendor,
    getOutstanding, getTotalPayables,
    getPayables, getOverduePayables,
  } = useVendorStore();

  const [open, setOpen]             = useState(false);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  // ── Edit state
  const [editOpen, setEditOpen]           = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  useEffect(() => {
    fetchVendors();
    fetchPurchases();
  }, []);

  const payables         = getPayables();
  const overduePayables  = getOverduePayables();
  const totalOverdue     = overduePayables.reduce((s, p) => s + p.remainingAmount, 0);
  const vendorsWithOutstanding = vendors.filter(v => getOutstanding(v.id) > 0).length;

  // ── Add vendor
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    const id = await addVendor({
      name:           fd.get("name") as string,
      contactPerson:  fd.get("contactPerson") as string || "",
      phone:          fd.get("phone") as string,
      city:           fd.get("city") as string || "",
      address:        fd.get("address") as string || "",
      openingBalance: Number(fd.get("openingBalance")) || 0,
      notes:          fd.get("notes") as string || "",
      isActive: true,
    });
    setSubmitting(false);
    if (id) { setOpen(false); toast.success("Vendor added"); }
    else toast.error("Failed to add vendor");
  };

  // ── Open edit dialog pre-filled
  const openEditDialog = (v: Vendor) => {
    setEditingVendor(v);
    setEditOpen(true);
  };

  // ── Submit edit
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVendor) return;
    const fd = new FormData(e.currentTarget);
    setEditSubmitting(true);
    const ok = await editVendor(editingVendor.id, {
      name:          fd.get("name") as string,
      contactPerson: fd.get("contactPerson") as string || "",
      phone:         fd.get("phone") as string,
      city:          fd.get("city") as string || "",
      address:       fd.get("address") as string || "",
      notes:         fd.get("notes") as string || "",
      isActive:      fd.get("isActive") === "on",
    });
    setEditSubmitting(false);
    if (ok) {
      setEditOpen(false);
      setEditingVendor(null);
      toast.success("Vendor updated");
    } else {
      toast.error("Failed to update vendor");
    }
  };

  // ── Delete with dependency check
  const handleDelete = async (vendorId: string) => {
    setDeleting(true);
    const result = await deleteVendor(vendorId);
    setDeleting(false);
    setDeleteConfirmId(null);
    if (result.success) {
      toast.success("Vendor deleted");
    } else {
      toast.error(result.reason || "Cannot delete this vendor");
    }
  };

  const getVendorPendingCount = (vendorId: string) =>
    payables.filter(p => p.vendorId === vendorId && p.remainingAmount > 0).length;

  const filtered = vendors.filter(v =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.includes(search)
  );
  const paged      = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const vendorToDelete = vendors.find(v => v.id === deleteConfirmId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage supplier list and payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input name="contactPerson" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone *</Label><Input name="phone" required /></div>
                <div className="space-y-2"><Label>City</Label><Input name="city" /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <div className="space-y-2">
                <Label>Opening Balance (PKR)</Label>
                <Input name="openingBalance" type="number" min="0" defaultValue="0" />
                <p className="text-xs text-muted-foreground">Amount you already owe this vendor before today.</p>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Add Vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Vendors" value={String(vendors.length)}
          subtitle={`${vendors.filter(v => v.isActive).length} active`} icon={Users} />
        <KpiCard title="Total Payables" value={formatPKR(getTotalPayables())}
          subtitle="Outstanding to vendors" icon={Landmark}
          variant={getTotalPayables() > 0 ? "warning" : undefined} />
        <KpiCard title="Vendors with Dues" value={String(vendorsWithOutstanding)}
          subtitle="Need payment" icon={CreditCard}
          variant={vendorsWithOutstanding > 0 ? "warning" : undefined} />
        <KpiCard title="Overdue Payables" value={formatPKR(totalOverdue)}
          subtitle={`${overduePayables.length} overdue`} icon={AlertTriangle}
          variant={overduePayables.length > 0 ? "danger" : undefined} />
      </div>

      <Input placeholder="Search vendors..." value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {vendors.length === 0 ? (
        <EmptyState title="No vendors yet" description="Add your first vendor to get started."
          actionLabel="Add Vendor" onAction={() => setOpen(true)} />
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
                  <TableHead className="text-center">Pending Invoices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(v => {
                  const outstanding = getOutstanding(v.id);
                  const pending     = getVendorPendingCount(v.id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.phone}</TableCell>
                      <TableCell>{v.city}</TableCell>
                      <TableCell className={`text-right font-medium ${outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {formatPKR(outstanding)}
                      </TableCell>
                      <TableCell className="text-center">
                        {pending > 0
                          ? <Badge variant="secondary">{pending}</Badge>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.isActive ? 'default' : 'secondary'}>
                          {v.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Edit — always allowed */}
                          <Button size="sm" variant="ghost"
                            onClick={() => openEditDialog(v)} title="Edit Vendor">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {/* Delete — blocked if history exists */}
                          <Button size="sm" variant="ghost"
                            onClick={() => setDeleteConfirmId(v.id)}
                            title="Delete Vendor"
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setEditingVendor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Vendor — {editingVendor?.name}</DialogTitle></DialogHeader>
          {editingVendor && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required defaultValue={editingVendor.name} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input name="contactPerson" defaultValue={editingVendor.contactPerson} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input name="phone" required defaultValue={editingVendor.phone} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" defaultValue={editingVendor.city} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" defaultValue={editingVendor.address} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={editingVendor.notes} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">Inactive vendors cannot be assigned new purchases</p>
                </div>
                <Switch name="isActive" defaultChecked={editingVendor.isActive} />
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={v => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{vendorToDelete?.name}</span>?
              This cannot be undone.
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              Deletion is blocked if this vendor has any purchases, inventory batches, or ledger history.
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
    </div>
  );
};

export default Vendors;