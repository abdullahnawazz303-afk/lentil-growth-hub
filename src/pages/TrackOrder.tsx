import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Package, CheckCircle, XCircle, Clock, AlertTriangle, Leaf, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

interface GuestOrderItem {
  id: string;
  item_name: string;
  urdu_name: string | null;
  grade: string | null;
  packing: string | null;
  quantity_kg: number;
}

interface GuestOrder {
  id: string;
  order_ref: string;
  guest_name: string;
  guest_phone: string;
  status: "Pending" | "Approved" | "Rejected" | "Converted" | "Cancelled";
  notes: string | null;
  total_amount: number;
  created_at: string;
  guest_order_items: GuestOrderItem[];
}

const STATUS_CONFIG = {
  Pending:   { icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50  border-amber-200",  label: "Pending Review" },
  Approved:  { icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50  border-green-200",  label: "Approved" },
  Rejected:  { icon: XCircle,      color: "text-red-600",    bg: "bg-red-50    border-red-200",    label: "Rejected" },
  Converted: { icon: CheckCircle,  color: "text-blue-600",   bg: "bg-blue-50   border-blue-200",   label: "Converted to Sale" },
  Cancelled: { icon: X,            color: "text-gray-500",   bg: "bg-gray-50   border-gray-200",   label: "Cancelled" },
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [ref, setRef] = useState(searchParams.get("ref") || "");
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Auto-search if params provided on load
  useEffect(() => {
    if (searchParams.get("phone")) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone) { toast.error("Please enter your phone number"); return; }

    setLoading(true);
    setSearched(false);

    let query = supabase
      .from("guest_orders")
      .select("*, guest_order_items(*)")
      .ilike("guest_phone", `%${cleanPhone}%`)
      .order("created_at", { ascending: false });

    if (ref.trim()) {
      query = supabase
        .from("guest_orders")
        .select("*, guest_order_items(*)")
        .ilike("guest_phone", `%${cleanPhone}%`)
        .ilike("order_ref", `%${ref.trim()}%`)
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    setLoading(false);
    setSearched(true);

    if (error) {
      toast.error("Search failed. Please try again.");
      return;
    }

    setOrders((data || []) as GuestOrder[]);
    if (data && data.length > 0 && data.length === 1) {
      setExpandedId(data[0].id);
    }
  };

  const handleCancel = async (order: GuestOrder) => {
    if (order.status !== "Pending") return;
    if (!confirm(`Cancel order ${order.order_ref}? This cannot be undone.`)) return;

    setCancelling(order.id);

    const { error } = await supabase
      .from("guest_orders")
      .update({ status: "Cancelled", notes: (order.notes ? order.notes + "\n" : "") + "Cancelled by customer via Track Order page." })
      .eq("id", order.id)
      .eq("guest_phone", order.guest_phone);

    setCancelling(null);

    if (error) {
      toast.error("Could not cancel order. Please contact us directly.");
      return;
    }

    // Update local state
    setOrders((prev) =>
      prev.map((o) => o.id === order.id ? { ...o, status: "Cancelled" as const } : o)
    );
    toast.success(`Order ${order.order_ref} cancelled.`);

    // Notify admin via WhatsApp
    const { notifyAdminWhatsApp } = await import("@/lib/whatsapp");
    notifyAdminWhatsApp({
      type: "guest",
      orderRef: order.order_ref,
      name: order.guest_name,
      phone: order.guest_phone,
      action: "cancelled",
      items: order.guest_order_items.map((i) => ({
        itemName: i.item_name,
        quantity: i.quantity_kg,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Track Your Order</h1>
          <p className="text-muted-foreground text-sm">
            Enter your phone number to find your guest orders
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 03001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Order Reference (optional)</label>
            <input
              type="text"
              placeholder="e.g. GO-20260422-0042"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
            ) : (
              <><Search className="h-4 w-4" /> Find My Orders</>
            )}
          </button>
        </form>

        {/* Results */}
        <AnimatePresence mode="wait">
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border p-10 text-center space-y-3">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground">
                    Double-check your phone number, or{" "}
                    <Link to="/shop" className="text-primary hover:underline font-medium">place a new order →</Link>
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground font-medium px-1">
                    Found {orders.length} order{orders.length !== 1 ? "s" : ""} for your phone number
                  </p>
                  {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                    const Icon = cfg.icon;
                    const isExpanded = expandedId === order.id;
                    const isCancellable = order.status === "Pending";

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        {/* Order header */}
                        <button
                          className="w-full text-left p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                            <Icon className={`h-5 w-5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-sm">{order.order_ref}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(order.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}
                              {order.guest_order_items.length} item{order.guest_order_items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="border-t px-5 pb-5 space-y-4">
                            {/* Items */}
                            <div className="pt-4 space-y-2">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Items</p>
                              <div className="space-y-1.5">
                                {order.guest_order_items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/30">
                                    <div>
                                      <span className="font-medium text-foreground">{item.item_name}</span>
                                      {item.grade && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                                          {item.grade}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-foreground">{item.quantity_kg} kg</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Admin notes (visible if any) */}
                            {order.notes && !order.notes.includes("Cancelled by customer") && (
                              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                                <span className="font-semibold">Factory Note: </span>{order.notes}
                              </div>
                            )}

                            {/* Rejection reason */}
                            {order.status === "Rejected" && (
                              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>Your order was rejected. Please contact us for more information.</span>
                              </div>
                            )}

                            {/* Cancel button */}
                            {isCancellable && (
                              <button
                                onClick={() => handleCancel(order)}
                                disabled={cancelling === order.id}
                                className="w-full h-10 rounded-full border-2 border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                {cancelling === order.id ? (
                                  <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling...</>
                                ) : (
                                  <><X className="h-4 w-4" /> Cancel This Order</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to shop */}
        <div className="text-center">
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
