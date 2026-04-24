import { useState } from "react";
import { X, MapPin, User, Phone, Mail, Home, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { notifyAdminWhatsApp } from "@/lib/whatsapp";

interface GuestCheckoutModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function GuestCheckoutModal({ onClose, onSuccess }: GuestCheckoutModalProps) {
  const { items } = useCartStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [orderRef, setOrderRef] = useState("");

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success("Location captured!");
      },
      () => {
        toast.error("Could not get location. Please enter address manually.");
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    setSubmitting(true);

    try {
      const locationUrl =
        lat && lng
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : null;

      const totalKgs = items.reduce(
        (sum, item) => sum + item.entries.reduce((s, e) => s + Number(e.kgs), 0),
        0
      );

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        locationUrl,
        lat,
        lng,
        items: items.flatMap((item) =>
          item.entries.map((entry) => ({
            item_name: item.itemName,
            english_name: item.englishName,
            grade: entry.grade,
            packing: entry.packing,
            quantity_kg: Number(entry.kgs),
          }))
        ),
      };

      const { data, error } = await supabase.rpc("submit_public_order", { payload });

      if (error) throw error;
      if (!data || !data.success) throw new Error("Failed to place order");

      const ref = data.order_ref;
      const isRegistered = data.type === 'customer';

      setOrderRef(ref);
      setDone(true);

      // Notify admin via WhatsApp
      notifyAdminWhatsApp({
        type: isRegistered ? "customer" : "guest",
        orderRef: ref,
        name: name.trim(),
        phone: phone.trim(),
        action: "placed",
        items: items.flatMap((item) =>
          item.entries.map((entry) => ({
            itemName: `${item.englishName} (${entry.grade})`,
            quantity: Number(entry.kgs),
          }))
        ),
      });

      setTimeout(() => {
        onSuccess();
      }, 8000); // Give time to copy reference
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {done ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Order Placed!</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Your order has been received. We will contact you at <strong>{phone}</strong>.
                </p>
              </div>
              {/* Order Ref */}
              <div className="w-full rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Order Reference</p>
                <p className="text-2xl font-mono font-bold text-primary tracking-wider">{orderRef}</p>
                <p className="text-xs text-muted-foreground">Save this to track your order status</p>
              </div>
              <a
                href={`/track-order?phone=${encodeURIComponent(phone)}&ref=${encodeURIComponent(orderRef)}`}
                className="w-full h-11 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" /> Track My Order
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
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h2 className="text-lg font-bold">Checkout Details</h2>
                  <p className="text-xs text-muted-foreground">Fill in your details to place the order</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Full Name *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ahmad Ali"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" /> Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ahmad@example.com"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-primary" /> Address (optional)
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, Province"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Your Location (optional)
                  </label>
                  {lat && lng ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="flex-1">Location captured: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 underline text-xs"
                      >
                        View
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={shareLocation}
                      disabled={locating}
                      className="w-full h-10 rounded-lg border-2 border-dashed border-primary/30 text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60"
                    >
                      {locating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Locating...</>
                      ) : (
                        <><MapPin className="h-4 w-4" /> Share My Location</>
                      )}
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Your location helps us plan delivery. This is optional.
                  </p>
                </div>

                {/* Order summary */}
                <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Order Summary</p>
                  {items.map((item) => (
                    <div key={item.itemId} className="text-sm flex justify-between">
                      <span className="text-foreground font-medium">{item.englishName}</span>
                      <span className="text-muted-foreground">
                        {item.entries.reduce((s, e) => s + Number(e.kgs), 0)} kg
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-11 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Placing...</>
                    ) : (
                      "Place Order"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
