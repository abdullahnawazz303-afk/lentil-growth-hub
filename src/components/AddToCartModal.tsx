import { useState } from "react";
import { X, Plus, Trash2, ShoppingBag, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, type CartEntry } from "@/stores/cartStore";
import { toast } from "sonner";

interface AddToCartModalProps {
  item: {
    itemId: string;
    itemName: string;      // Urdu
    englishName: string;
    imageUrl: string | null;
  };
  onClose: () => void;
}

const GRADE_OPTIONS = ["A+", "A", "B", "C"];
const PACKING_OPTIONS = ["0.5 kg", "1 kg", "2 kg", "5 kg", "10 kg", "25 kg", "50 kg"];

const emptyEntry = (): CartEntry => ({ grade: "A", packing: "1 kg", kgs: 0 });

export function AddToCartModal({ item, onClose }: AddToCartModalProps) {
  const { addItem, getItem } = useCartStore();
  const existing = getItem(item.itemId);

  const [entries, setEntries] = useState<CartEntry[]>(
    existing?.entries.length ? existing.entries.map((e) => ({ ...e })) : [emptyEntry()]
  );

  const updateEntry = (i: number, field: keyof CartEntry, value: string | number) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  const addRow = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeRow = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const totalKgs = entries.reduce((sum, e) => sum + (Number(e.kgs) || 0), 0);

  const handleSubmit = () => {
    const valid = entries.filter((e) => Number(e.kgs) > 0);
    if (valid.length === 0) {
      toast.error("Enter at least one valid quantity (kg)");
      return;
    }
    addItem({ ...item, entries: valid });
    toast.success(`${item.englishName} added to cart`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-5 border-b">
            {/* Product image or placeholder */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-primary/8 shrink-0 flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.englishName} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-9 w-9 text-primary/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">Add to Cart</p>
              <h2 className="text-xl font-bold text-foreground leading-tight">{item.englishName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5" dir="rtl" style={{ fontFamily: "Noto Nastaliq Urdu, serif" }}>
                {item.itemName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Entries */}
          <div className="p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Order Details</p>
            <p className="text-xs text-muted-foreground">You can add multiple packing sizes in one order.</p>

            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Entry {i + 1}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Grade */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Grade</label>
                    <select
                      value={entry.grade}
                      onChange={(e) => updateEntry(i, "grade", e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Packing */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Packing</label>
                    <select
                      value={entry.packing}
                      onChange={(e) => updateEntry(i, "packing", e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {PACKING_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kgs */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Total (kg)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={entry.kgs || ""}
                      onChange={(e) => updateEntry(i, "kgs", Number(e.target.value))}
                      placeholder="0"
                      className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add row */}
            <button
              onClick={addRow}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add More Packing Size
            </button>

            {/* Total */}
            {totalKgs > 0 && (
              <div className="flex justify-between items-center rounded-xl bg-primary/8 border border-primary/20 px-4 py-2.5">
                <span className="text-sm text-muted-foreground font-medium">Total Quantity</span>
                <span className="text-lg font-bold text-primary">{totalKgs.toLocaleString()} kg</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 h-11 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg"
            >
              <ShoppingBag className="h-4 w-4" />
              {existing ? "Update Cart" : "Add to Cart"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
