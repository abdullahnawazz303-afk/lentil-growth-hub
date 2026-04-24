import { useState } from "react";
import { X, Trash2, Edit2, ShoppingBag, Package, MapPin, CheckCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyAdminWhatsApp } from "@/lib/whatsapp";
import { GuestCheckoutModal } from "./GuestCheckoutModal";
import { AddToCartModal } from "./AddToCartModal";

interface CartDrawerProps {
  onClose: () => void;
}

export function CartDrawer({ onClose }: CartDrawerProps) {
  const { items, removeItem, clearCart } = useCartStore();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId     = useAuthStore((s) => s.userId);
  const customerId = useAuthStore((s) => s.customerId);
  const userRole   = useAuthStore((s) => s.userRole);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showGuest, setShowGuest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerName, setCustomerName] = useState("");

  const totalKgs = items.reduce(
    (sum, item) => sum + item.entries.reduce((s, e) => s + Number(e.kgs), 0),
    0
  );

  const handleRegisteredCheckout = async () => {
    if (!userId) { toast.error("Please log in to place an order."); return; }
    if (!customerId) {
      toast.error("Your account is not linked to a customer profile. Please contact admin.");
      return;
    }
    setSubmitting(true);

    try {
      // Build order items flat list
      const orderItems = items.flatMap((item) =>
        item.entries.map((entry) => ({
          item_name: item.itemName,
          grade: entry.grade,
          packing: entry.packing,
          quantity_kg: Number(entry.kgs),
        }))
      );

      const { data: order, error: orderError } = await supabase
        .from("online_orders")
        .insert({
          customer_id: customerId,
          total_amount: 0,
          status: "Pending",
          requested_delivery_date: deliveryDate || null,
          notes: `Order from shop page — ${items.length} product(s)`,
        })
        .select("id, order_ref")
        .single();

      if (orderError || !order) {
        toast.error("Failed to place order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Insert order items
      const { error: itemsError } = await supabase
        .from("online_order_items")
        .insert(orderItems.map((oi) => ({ order_id: order.id, ...oi })));

      if (itemsError) {
        toast.error("Order placed but items failed to save. Contact admin.");
        setSubmitting(false);
        return;
      }

      const { data: custData } = await supabase
        .from("customers")
        .select("name, phone")
        .eq("id", customerId)
        .single();

      const resolvedName = custData?.name || "Customer";
      setCustomerName(resolvedName);

      // Notify admin via WhatsApp
      notifyAdminWhatsApp({
        type: "customer",
        orderRef: order.order_ref || order.id.slice(0, 12).toUpperCase(),
        name: custData?.name || "Customer",
        phone: custData?.phone || "",
        action: "placed",
        items: items.flatMap((item) =>
          item.entries.map((entry) => ({
            itemName: `${item.englishName} (${entry.grade})`,
            quantity: Number(entry.kgs),
          }))
        ),
      });

      setOrderRef(order.order_ref || order.id.slice(0, 12).toUpperCase());
      setOrderPlaced(true);
      clearCart();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: [0.32, 0, 0.67, 0] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Shopping Cart</h2>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
                  {items.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Order Placed Success Screen */}
          {orderPlaced ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Order Placed!</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {customerName ? (
                    <>Thank you, <strong>{customerName}</strong>! Your order is pending review.</>
                  ) : (
                    "Your order has been received by our team."
                  )}
                </p>
              </div>
              <div className="w-full rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Reference</p>
                  <p className="text-xl font-mono font-bold text-primary tracking-wider">{orderRef}</p>
                </div>
                {deliveryDate && (
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferred Delivery</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {new Date(deliveryDate).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              <a
                href="/portal"
                className="w-full h-11 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" /> View in My Portal
              </a>
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Your cart is empty</p>
                <p className="text-sm text-muted-foreground/70">Browse the shop and add products</p>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2 rounded-full bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Browse Shop
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-xl border border-border bg-white shadow-sm overflow-hidden"
                >
                  {/* Item header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-muted/20">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/8 flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.englishName} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-primary/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{item.englishName}</p>
                      <p className="text-xs text-muted-foreground" dir="rtl">{item.itemName}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingItem(item.itemId)}
                        className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.itemId)}
                        className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="divide-y divide-border/40">
                    {item.entries.map((entry, j) => (
                      <div key={j} className="px-3 py-2 flex justify-between items-center text-sm">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {entry.grade}
                          </span>
                          <span className="text-muted-foreground">{entry.packing} bags</span>
                        </div>
                        <span className="font-semibold text-foreground">{Number(entry.kgs).toLocaleString()} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-3">
              {/* Total */}
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-muted-foreground font-medium">Total Quantity</span>
                <span className="text-xl font-bold text-primary">{totalKgs.toLocaleString()} kg</span>
              </div>

              {/* Customer identity banner (logged-in customer) */}
              {isLoggedIn && userRole === "customer" && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                  <span>You are logged in as a <strong>registered customer</strong>. Your order will be placed instantly — no extra details needed.</span>
                </div>
              )}

              {/* Note for unauthenticated users */}
              {!isLoggedIn && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>We'll ask for your delivery details on the next step. If you already have an account, your order will automatically be linked.</span>
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                {isLoggedIn && userRole === "customer" ? (
                  // ── Registered customer: delivery date + direct checkout
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        Preferred Delivery Date
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      onClick={handleRegisteredCheckout}
                      disabled={submitting}
                      className="w-full h-12 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-60"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      {submitting ? "Placing Order..." : "Place Order"}
                    </button>
                  </div>
                ) : isLoggedIn && userRole !== "customer" ? (
                  // ── Staff/admin: can't place customer orders
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center">
                    Staff accounts cannot place customer orders from the shop.
                  </div>
                ) : (
                  // ── Not logged in: unified checkout options
                  <>
                    <button
                      onClick={() => setShowGuest(true)}
                      className="w-full h-12 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Proceed to Checkout
                    </button>
                  </>
                )}
                <button
                  onClick={() => { clearCart(); }}
                  className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center py-1"
                >
                  Clear all items
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </motion.div>
      </div>


      {/* Sub-modals */}
      <AnimatePresence>
        {editingItem && (
          <AddToCartModal
            item={items.find((i) => i.itemId === editingItem)!}
            onClose={() => setEditingItem(null)}
          />
        )}
        {showGuest && (
          <GuestCheckoutModal
            onClose={() => setShowGuest(false)}
            onSuccess={() => { clearCart(); onClose(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
