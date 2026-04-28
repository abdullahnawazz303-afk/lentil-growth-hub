import { useState } from "react";
import { X, Plus, Trash2, ShoppingBag, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, type CartEntry } from "@/stores/cartStore";
import { toast } from "sonner";
import { useRateCardStore } from "@/stores/rateCardStore";

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
const PACKING_OPTIONS = ["0.5 kg", "1 kg"];

const emptyEntry = (): CartEntry => ({ grade: "A", packing: "1 kg", kgs: 0 });

export function AddToCartModal({ item, onClose }: AddToCartModalProps) {
  const { addItem, getItem } = useCartStore();
  const existing = getItem(item.itemId);
  const { rates } = useRateCardStore();
  const itemRates = rates.filter(r => r.item_name === item.itemName);

  const [entries, setEntries] = useState<CartEntry[]>(
    existing?.entries.length ? existing.entries.map((e) => ({ ...e })) : [emptyEntry()]
  );

  const updateEntry = (i: number, field: keyof CartEntry, value: string | number) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  const addRow = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeRow = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  // Calculate totals
  const totalKgs = entries.reduce((sum, e) => sum + (Number(e.kgs) || 0), 0);
  const totalBill = entries.reduce((sum, e) => {
    const rate = itemRates.find(r => r.grade === e.grade);
    const pricePerKg = rate ? rate.price_per_kg : 0;
    return sum + (pricePerKg * (Number(e.kgs) || 0));
  }, 0);

  const handleSubmit = () => {
    const valid = entries.filter((e) => Number(e.kgs) > 0);
    if (valid.length === 0) {
      toast.error("Please enter a valid quantity in kg");
      return;
    }
    addItem({ ...item, entries: valid });
    toast.success(`${item.englishName} updated in your cart`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Header */}
          <div className="flex items-start gap-5 p-6 border-b border-border/50 bg-muted/10 relative">
            {/* Product image */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center shadow-inner">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.englishName} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-10 w-10 text-primary/40" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                Configure Order
              </span>
              <h2 className="text-2xl font-black text-foreground leading-tight">{item.englishName}</h2>
              <p className="text-sm text-muted-foreground mt-1" dir="rtl" style={{ fontFamily: "Noto Nastaliq Urdu, serif" }}>
                {item.itemName}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Market Rates Bar */}
          {itemRates.length > 0 && (
            <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-3 overflow-x-auto scrollbar-none">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Live Rates:</span>
              <div className="flex gap-2">
                {GRADE_OPTIONS.map(g => {
                  const rate = itemRates.find(r => r.grade === g);
                  if (!rate) return null;
                  return (
                    <span key={g} className="text-xs font-semibold bg-white border border-primary/20 px-3 py-1.5 rounded-full shadow-sm text-foreground whitespace-nowrap">
                      Grade {g} <span className="text-primary mx-1">•</span> Rs. {rate.price_per_kg}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Entries Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-foreground uppercase tracking-widest">Packing Variations</p>
            </div>

            {entries.map((entry, i) => {
              const currentRate = itemRates.find(r => r.grade === entry.grade)?.price_per_kg || 0;
              const entryTotal = currentRate * (Number(entry.kgs) || 0);

              return (
                <div
                  key={i}
                  className="rounded-3xl border-2 border-primary/10 bg-white p-5 space-y-4 shadow-sm relative transition-all hover:border-primary/30"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
                      Batch {i + 1}
                    </span>
                    {entries.length > 1 && (
                      <button
                        onClick={() => removeRow(i)}
                        className="text-muted-foreground hover:text-destructive w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Grade Select */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Quality Grade</label>
                      <select
                        value={entry.grade}
                        onChange={(e) => updateEntry(i, "grade", e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </div>

                    {/* Packing Size */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Bag Size</label>
                      <select
                        value={entry.packing}
                        onChange={(e) => updateEntry(i, "packing", e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                      >
                        {PACKING_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p} bags</option>
                        ))}
                      </select>
                    </div>

                    {/* Total Kgs */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Total Weight (KG)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={entry.kgs || ""}
                        onChange={(e) => updateEntry(i, "kgs", Number(e.target.value))}
                        placeholder="0.0"
                        className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background font-bold text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Per Entry Calculation */}
                  {entryTotal > 0 && (
                    <div className="bg-muted/30 p-3 rounded-xl flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Est. Cost (Rs. {currentRate}/kg)</span>
                      <span className="font-bold text-foreground">Rs. {entryTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add row */}
            <button
              onClick={addRow}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full border-[3px] border-dashed border-primary/20 text-primary text-sm font-bold hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="h-5 w-5" /> Add Another Batch Variant
            </button>
          </div>

          {/* Footer Totals & Action */}
          <div className="p-6 bg-white border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
            {totalKgs > 0 && (
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estimated Total</span>
                  <span className="text-2xl font-black text-primary leading-none mt-1">Rs. {totalBill.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Volume</span>
                  <span className="text-xl font-bold text-foreground leading-none mt-1">{totalKgs.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">kg</span></span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleSubmit}
              className="w-full h-14 rounded-full bg-primary text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              <ShoppingBag className="h-5 w-5" />
              {existing ? "Update Order in Cart" : "Add to Cart"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
