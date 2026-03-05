import { useState } from "react";
import { useVendorStore } from "@/stores/vendorStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatDate } from "@/lib/formatters";

const Vendors = () => {
  const { vendors, addVendor, getOutstanding } = useVendorStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addVendor({
      name: fd.get("name") as string,
      phone: fd.get("phone") as string,
      address: fd.get("address") as string,
      creditDays: Number(fd.get("creditDays")) || 30,
    });
    setOpen(false);
    toast.success("Vendor added");
  };

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage supplier/vendor list</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Phone</Label><Input name="phone" required /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <div className="space-y-2"><Label>Credit Days</Label><Input name="creditDays" type="number" defaultValue="30" /></div>
              <Button type="submit" className="w-full">Add Vendor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {vendors.length === 0 ? (
        <EmptyState title="No vendors yet" description="Add your first vendor to get started." actionLabel="Add First Vendor" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Credit Days</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.phone}</TableCell>
                    <TableCell>{v.address}</TableCell>
                    <TableCell>{v.creditDays} days</TableCell>
                    <TableCell className={`text-right font-medium ${getOutstanding(v.id) > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(getOutstanding(v.id))}</TableCell>
                    <TableCell>{formatDate(v.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Vendors;
