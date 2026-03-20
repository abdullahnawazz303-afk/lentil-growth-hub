import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/formatters";

interface CustomerRequest {
  id: string;
  full_name: string;
  business_name: string | null;
  phone: string;
  city: string | null;
  address: string | null;
  email: string;
  notes: string | null;
  status: "Pending" | "Approved" | "Rejected";
  reject_reason: string | null;
  reviewed_at: string | null;
  customer_id: string | null;
  created_at: string;
}

const CustomerRequests = () => {
  const { userId } = useAuthStore();

  const [requests, setRequests]         = useState<CustomerRequest[]>([]);
  const [loading, setLoading]           = useState(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [filter, setFilter]             = useState<"Pending" | "Rejected">("Pending");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(0);
  const pageSize = 10;

  const [selected, setSelected]         = useState<CustomerRequest | null>(null);
  const [detailOpen, setDetailOpen]     = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing]     = useState(false);

  // Fetch only Pending and Rejected — Approved go to Customers page
  const fetchRequests = async () => {
    setLoading(true);
    setFetchError(null);

    const { data, error } = await supabase
      .from("customer_requests")
      .select("*")
      .in("status", ["Pending", "Rejected"])
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(error.message);
    } else {
      setRequests((data || []) as CustomerRequest[]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  // ── Approve: create customer record + mark approved
  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);

    // Step 1: Create customer in customers table
    const { data: newCustomer, error: customerErr } = await supabase
      .from("customers")
      .insert({
        name:            selected.full_name,
        contact_person:  selected.full_name,
        phone:           selected.phone,
        city:            selected.city ?? null,
        address:         selected.address ?? null,
        opening_balance: 0,
        credit_limit:    0,
        notes:           selected.business_name
                           ? `Business: ${selected.business_name}${selected.notes ? `. ${selected.notes}` : ""}`
                           : selected.notes ?? null,
        is_active: true,
      })
      .select("id")
      .single();

    if (customerErr || !newCustomer) {
      toast.error("Failed to create customer: " + customerErr?.message);
      setProcessing(false);
      return;
    }

    // Step 2: Mark request as Approved + link customer_id
    const { error: updateErr } = await supabase
      .from("customer_requests")
      .update({
        status:      "Approved",
        customer_id: newCustomer.id,
        reviewed_by: userId ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (updateErr) {
      toast.error("Failed to update request: " + updateErr.message);
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setDetailOpen(false);

    toast.success(
      `${selected.full_name} approved! Added to Customers. They can now register at /register using their phone number.`,
      { duration: 7000 }
    );

    // Remove from local list — approved ones go to Customers page
    setRequests((prev) => prev.filter((r) => r.id !== selected.id));
    setSelected(null);
  };

  // ── Reject
  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    setProcessing(true);

    const { error } = await supabase
      .from("customer_requests")
      .update({
        status:        "Rejected",
        reject_reason: rejectReason.trim(),
        reviewed_by:   userId ?? null,
        reviewed_at:   new Date().toISOString(),
      })
      .eq("id", selected.id);

    setProcessing(false);

    if (error) {
      toast.error("Failed to reject request: " + error.message);
      return;
    }

    toast.success("Request rejected.");
    setDetailOpen(false);
    setSelected(null);
    setRejectReason("");
    fetchRequests();
  };

  // ── Filter + search + paginate
  const filtered = requests.filter((r) => {
    const matchFilter = r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || (
      r.full_name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q) ||
      (r.business_name ?? "").toLowerCase().includes(q)
    );
    return matchFilter && matchSearch;
  });

  const paged         = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages    = Math.ceil(filtered.length / pageSize);
  const pendingCount  = requests.filter((r) => r.status === "Pending").length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Customer Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review new customer access requests
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Error banner ── */}
      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error: {fetchError}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-destructive"
            onClick={fetchRequests}>Retry</Button>
        </div>
      )}

      {/* ── Info note ── */}
      <div className="rounded-lg bg-muted/50 border px-4 py-2 text-xs text-muted-foreground">
        Approved requests are automatically moved to the <strong>Customers</strong> page and removed from this list.
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search name, phone, email, city..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "Pending" ? "default" : "outline"}
            onClick={() => { setFilter("Pending"); setPage(0); }}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "Rejected" ? "default" : "outline"}
            onClick={() => { setFilter("Rejected"); setPage(0); }}
          >
            Rejected ({rejectedCount})
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading requests...</span>
        </div>
      ) : paged.length === 0 ? (
        <EmptyState
          title={
            filter === "Pending"
              ? "No pending requests"
              : "No rejected requests"
          }
          description={
            filter === "Pending"
              ? "No new customer requests at the moment."
              : "No requests have been rejected yet."
          }
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.business_name || "—"}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>{r.city || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "Rejected" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(r);
                          setRejectReason(r.reject_reason ?? "");
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Detail / Action Dialog ── */}
      <Dialog
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) { setSelected(null); setRejectReason(""); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request — {selected?.full_name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Full Name",  value: selected.full_name },
                  { label: "Business",   value: selected.business_name || "—" },
                  { label: "Phone",      value: selected.phone },
                  { label: "Email",      value: selected.email },
                  { label: "City",       value: selected.city || "—" },
                  { label: "Address",    value: selected.address || "—" },
                  { label: "Submitted",  value: formatDate(selected.created_at) },
                  { label: "Status",     value: selected.status },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Notes from requester</p>
                  <p>{selected.notes}</p>
                </div>
              )}

              {/* Rejection reason display */}
              {selected.status === "Rejected" && selected.reject_reason && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
                  <p className="text-xs text-destructive mb-1 font-medium">Rejection Reason</p>
                  <p className="text-destructive">{selected.reject_reason}</p>
                </div>
              )}

              {/* Action buttons — only for Pending */}
              {selected.status === "Pending" && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium">Take Action</p>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Rejection Reason (required if rejecting)
                    </Label>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={processing}
                    >
                      {processing
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><CheckCircle className="h-4 w-4 mr-2" /> Approve & Add to Customers</>
                      }
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={processing}
                    >
                      {processing
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><XCircle className="h-4 w-4 mr-2" /> Reject</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerRequests;