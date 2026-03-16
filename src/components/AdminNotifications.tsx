import { useState, useCallback, useEffect } from "react";
import { useOnlineOrderStore } from "@/stores/onlineOrderStore";
import { useBookingStore } from "@/stores/bookingStore";
import { formatDate } from "@/lib/formatters";
import {
  X, ShoppingCart, Calendar, AlertCircle, Bell,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type NotifType = "online_order" | "booking_due" | "booking_overdue";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  date?: string;
  ref?: string;
}

// ── Config per type ────────────────────────────────────────────────────────
const typeConfig: Record<
  NotifType,
  { icon: typeof ShoppingCart; rowClass: string; iconClass: string; tagClass: string; tag: string }
> = {
  online_order: {
    icon: ShoppingCart,
    rowClass: "border-l-4 border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20",
    iconClass: "text-amber-500",
    tagClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    tag: "Order",
  },
  booking_due: {
    icon: Calendar,
    rowClass: "border-l-4 border-l-blue-400 bg-blue-50/60 dark:bg-blue-950/20",
    iconClass: "text-blue-500",
    tagClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    tag: "Due Today",
  },
  booking_overdue: {
    icon: AlertCircle,
    rowClass: "border-l-4 border-l-red-500 bg-red-50/60 dark:bg-red-950/20",
    iconClass: "text-red-500",
    tagClass: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    tag: "Overdue",
  },
};

// ── Component ──────────────────────────────────────────────────────────────
export const AdminNotifications = () => {
  const { orders } = useOnlineOrderStore();
  const { bookings } = useBookingStore();

  // Open by default whenever there are notifications
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Build notification list
  const buildNotifs = useCallback((): Notif[] => {
    const list: Notif[] = [];

    // 1. Pending online orders
    orders
      .filter(o => o.status === "Pending")
      .forEach(o => {
        list.push({
          id: `order-${o.id}`,
          type: "online_order",
          title: "New Online Order",
          description: `${o.customerName} placed an order${o.customerCity ? ` from ${o.customerCity}` : ""}`,
          date: o.date,
          ref: o.orderRef || o.id.slice(0, 8),
        });
      });

    // 2. Advance bookings — due today or overdue
    const activeStatuses = ["Booked", "Partially Paid", "Fully Paid"];
    bookings
      .filter(b => activeStatuses.includes(b.status))
      .forEach(b => {
        const isOverdue = b.expectedDeliveryDate < today;
        const isDueToday = b.expectedDeliveryDate === today;
        if (!isOverdue && !isDueToday) return;
        const type: NotifType = isOverdue ? "booking_overdue" : "booking_due";
        list.push({
          id: `booking-${b.id}`,
          type,
          title: isOverdue ? "Booking Overdue!" : "Booking Due Today",
          description: `${b.vendorName || "Vendor"} — ${b.items
            .map(i => `${i.itemName} (${i.quantity} kg)`)
            .join(", ")}`,
          date: b.expectedDeliveryDate,
          ref: b.bookingRef || b.id.slice(0, 8),
        });
      });

    return list;
  }, [orders, bookings, today]);

  const notifs = buildNotifs();

  // Auto-open only if there are notifications AND it hasn't been closed this session
  useEffect(() => {
    const hasClosedThisSession = sessionStorage.getItem("admin_notif_panel_closed") === "true";
    if (notifs.length > 0 && !hasClosedThisSession) {
      setOpen(true);
    }
  }, [notifs.length]);

  const handleClose = () => {
    sessionStorage.setItem("admin_notif_panel_closed", "true");
    setOpen(false);
  };

  if (!open || notifs.length === 0) return null;

  return (
    // ── Floating card — no backdrop, sits directly over dashboard content ──
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 pointer-events-none">
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        className="
          pointer-events-auto
          relative w-full max-w-lg bg-background
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-border
          flex flex-col
          max-h-[75vh]
          animate-in fade-in slide-in-from-top-4 duration-300
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-foreground" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Action Required</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notifs.length} pending task{notifs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Close (×) */}
          <button
            onClick={handleClose}
            aria-label="Close notifications"
            className="
              h-8 w-8 flex items-center justify-center
              text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground
              transition-colors
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable notification list */}
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {notifs.map(n => {
            const cfg = typeConfig[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-6 py-4 bg-card ${cfg.rowClass}`}
              >
                {/* Text */}
                <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{n.title}</span>
                    <div className="flex gap-1.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider ${cfg.tagClass}`}>
                        {cfg.tag}
                      </span>
                      {n.ref && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-muted text-muted-foreground">
                          {n.ref}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{n.description}</p>
                  {n.date && (
                    <p className="text-xs font-medium text-foreground/70 mt-2">
                      {n.type === "online_order" ? "Placed:" : "Expected:"} {formatDate(n.date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 bg-muted/20">
          <button
            onClick={handleClose}
            className="
              w-full py-2.5 text-sm font-bold uppercase tracking-widest
              bg-foreground text-background
              hover:bg-foreground/90 transition-colors
            "
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
