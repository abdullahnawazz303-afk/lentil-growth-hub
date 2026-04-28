import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, Edit2, ShoppingBag, Package, MapPin, CheckCircle, ExternalLink, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyAdminWhatsApp } from "@/lib/whatsapp";
import { GuestCheckoutModal } from "./GuestCheckoutModal";
import { AddToCartModal } from "./AddToCartModal";

interface CartDrawerProps {
  onClose: () => void;
}

export function CartDrawer({ onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const { items, removeItem, clearCart } = useCartStore();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId     = useAuthStore((s) => s.userId);
  const customerId = useAuthStore((s) => s.customerId);
  const userRole   = useAuthStore((s) => s.userRole);
  
  const { rates } = useRateCardStore();

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

  const totalBill = items.reduce((sum, item) => {
    return sum + item.entries.reduce((entrySum, entry) => {
      const rate = rates.find(r => r.item_name === item.itemName && r.grade === entry.grade);
      const pricePerKg = rate ? rate.price_per_kg : 0;
      return entrySum + (pricePerKg * Number(entry.kgs));
    }, 0);
  }, 0);

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
          total_amount: totalBill, // Store the calculated total bill
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          className="relative bg-background w-full max-w-md h-full flex flex-col shadow-2xl rounded-l-3xl overflow-hidden"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.4, type: "spring", damping: 25, stiffness: 200 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight leading-none">Your Cart</h2>
                {items.length > 0 && (
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                    {items.length} Product{items.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Order Placed Success Screen */}
          {orderPlaced ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5 bg-white">
              <div className="w-28 h-28 rounded-full bg-green-50 border-[4px] border-green-100 flex items-center justify-center mb-2">
                <CheckCircle className="h-14 w-14 text-green-500" />
              </div>
              <div>
                <h3 className="text-3xl font-display font-black text-foreground">Order Placed!</h3>
                <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xs mx-auto">
                  {customerName ? (
                    <>Thank you, <strong className="text-foreground">{customerName}</strong>! Your wholesale order is pending review.</>
                  ) : (
                    "Your order has been received securely by our dispatch team."
                  )}
                </p>
              </div>
              <div className="w-full rounded-[2rem] bg-primary/5 border border-primary/20 p-6 space-y-4 shadow-sm my-2">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Order Reference</p>
                  <p className="text-2xl font-mono font-black text-primary tracking-widest bg-white px-3 py-1 rounded-xl shadow-sm inline-block">{orderRef}</p>
                </div>
                {deliveryDate && (
                  <div className="pt-4 border-t border-primary/10">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Preferred Delivery</p>
                    <p className="text-base font-bold text-foreground">
                      {new Date(deliveryDate).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              <a
                href="/portal"
                className="w-full h-14 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-base mt-2"
              >
                <ExternalLink className="h-5 w-5" /> View in My Portal
              </a>
              <button
                onClick={onClose}
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Close Cart
              </button>
            </div>
          ) : (
            <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/20">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <p className="text-xl font-black text-foreground">Your cart is empty</p>
                <p className="text-sm text-muted-foreground max-w-[250px]">Browse our premium wholesale catalog and add products.</p>
                <button
                  onClick={() => {
                    onClose();
                    navigate("/shop");
                  }}
                  className="mt-4 px-8 py-3.5 rounded-full bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg hover:-translate-y-0.5"
                >
                  Browse Shop
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-[2rem] border border-border/50 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Item header */}
                  <div className="flex items-center gap-4 p-4 border-b border-border/50 relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.englishName} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-primary/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <p className="font-black text-foreground text-base truncate">{item.englishName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium" dir="rtl">{item.itemName}</p>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-1">
                      <button
                        onClick={() => setEditingItem(item.itemId)}
                        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.itemId)}
                        className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-white transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="p-2 space-y-1 bg-muted/10">
                    {item.entries.map((entry, j) => {
                      const rate = rates.find(r => r.item_name === item.itemName && r.grade === entry.grade);
                      const pricePerKg = rate ? rate.price_per_kg : 0;
                      const entryTotal = pricePerKg * Number(entry.kgs);

                      return (
                        <div key={j} className="px-3 py-2 flex flex-col gap-1 rounded-xl bg-white border border-border/40 text-sm shadow-sm">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase">
                                Grade {entry.grade}
                              </span>
                              <span className="text-muted-foreground text-xs font-semibold">{entry.packing} bags</span>
                            </div>
                            <span className="font-bold text-foreground">{Number(entry.kgs).toLocaleString()} kg</span>
                          </div>
                          {entryTotal > 0 && (
                            <div className="flex justify-between items-center pt-1 border-t border-border/30 mt-1">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Est. Cost</span>
                              <span className="text-xs font-bold text-primary">Rs. {entryTotal.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Sticky Bar */}
          {items.length > 0 && (
            <div className="bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-10 p-5 rounded-t-3xl relative">
              {/* Totals Summary */}
              <div className="bg-primary/5 rounded-[1.5rem] p-4 mb-4 border border-primary/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Weight</span>
                  <span className="text-sm font-black text-foreground">{totalKgs.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-primary/10">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                    <Calculator className="h-3.5 w-3.5" /> Estimated Bill
                  </span>
                  <span className="text-2xl font-black text-primary leading-none">Rs. {totalBill.toLocaleString()}</span>
                </div>
              </div>

              {/* Customer identity banner */}
              {isLoggedIn && userRole === "customer" && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                  <span className="font-medium leading-relaxed">Logged in as a registered customer. Your order will be placed instantly.</span>
                </div>
              )}

              {/* Note for unauthenticated users */}
              {!isLoggedIn && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">We'll verify your delivery details securely on the next step.</span>
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-3">
                {isLoggedIn && userRole === "customer" ? (
                  // ── Registered customer: delivery date + direct checkout
                  <div className="space-y-3">
                    <div className="bg-background rounded-xl px-3 py-2 border border-input focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                        Delivery Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-transparent text-sm font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleRegisteredCheckout}
                      disabled={submitting}
                      className="w-full h-14 rounded-full bg-primary text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      {submitting ? "Placing Order..." : "Confirm Wholesale Order"}
                    </button>
                  </div>
                ) : isLoggedIn && userRole !== "customer" ? (
                  // ── Staff/admin: can't place customer orders
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center font-bold">
                    Staff accounts cannot place customer orders from the shop.
                  </div>
                ) : (
                  // ── Not logged in: guest checkout
                  <button
                    onClick={() => setShowGuest(true)}
                    className="w-full h-14 rounded-full bg-primary text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl"
                  >
                    Proceed to Checkout <ExternalLink className="h-5 w-5 ml-1" />
                  </button>
                )}
                
                <button
                  onClick={() => { clearCart(); }}
                  className="w-full text-xs font-bold text-muted-foreground hover:text-destructive transition-colors text-center py-2 underline underline-offset-4 decoration-border hover:decoration-destructive"
                >
                  Clear entire cart
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
