import { useState } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPKR, formatDate } from "@/lib/formatters";

const Customers = () => {
  const { customers, addCustomer, getOutstanding } = useCustomerStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addCustomer({
      name: fd.get("name") as string,
      phone: fd.get("phone") as string,
      address: fd.get("address") as string,
      openingBalance: Number(fd.get("openingBalance")) || 0,
    } as any);
    setOpen(false);
    toast.success("Customer added");
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
  });

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage wholesale customer list</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Phone</Label><Input name="phone" required /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <div className="space-y-2">
                <Label>Opening Balance (PKR)</Label>
                <Input
                  name="openingBalance"
                  type="number"
                  min="0"
                  defaultValue="0"
                  placeholder="0 if no outstanding"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the amount this customer already owes you before today, if any.
                </p>
              </div>
              <Button type="submit" className="w-full">Add Customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="max-w-xs" />

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="Add your first customer to get started." actionLabel="Add First Customer" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.address}</TableCell>
                    <TableCell className={`text-right font-medium ${getOutstanding(c.id) > 0 ? 'status-overdue' : 'status-healthy'}`}>{formatPKR(getOutstanding(c.id))}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
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

export default Customers;