import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ShoppingBag, 
  Package, 
  Plus, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore, type CartEntry } from "@/stores/cartStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { ProductCard, type ShopItem } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { toast } from "sonner";

const GRADE_OPTIONS = ["A+", "A", "B", "C"];
const PACKING_OPTIONS = ["0.5 kg", "1 kg"];

const emptyEntry = (): CartEntry => ({ grade: "A", packing: "1 kg", kgs: 0 });

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { addItem, getItem } = useCartStore();
  const { rates, fetchRates } = useRateCardStore();

  const [entries, setEntries] = useState<CartEntry[]>([emptyEntry()]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      fetchRates();

      // Fetch current product
      const { data: product, error } = await supabase
        .from("item_names")
        .select("*")
        .or(`id.eq.${id},name.eq.${id}`)
        .single();

      if (error || !product) {
        toast.error("Product not found");
        navigate("/shop");
        return;
      }

      setItem(product as ShopItem);

      // Initialize entries if already in cart
      const existing = getItem(product.id);
      if (existing?.entries.length) {
        setEntries(existing.entries.map(e => ({ ...e })));
      } else {
        setEntries([emptyEntry()]);
      }

      // Fetch related items (same category, excluding current)
      if (product.category) {
        const { data: related } = await supabase
          .from("item_names")
          .select("id, name, english_name, category, image_url, is_active")
          .eq("category", product.category)
          .eq("is_active", true)
          .neq("id", product.id)
          .limit(4);
        
        if (related) setRelatedItems(related as ShopItem[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, navigate, fetchRates, getItem]);

  const itemRates = rates.filter(r => r.item_name === item?.name);

  const updateEntry = (i: number, field: keyof CartEntry, value: string | number) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  const addRow = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeRow = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const totalKgs = entries.reduce((sum, e) => sum + (Number(e.kgs) || 0), 0);
  const totalBill = entries.reduce((sum, e) => {
    const rate = itemRates.find(r => r.grade === e.grade);
    const pricePerKg = rate ? rate.price_per_kg : 0;
    return sum + (pricePerKg * (Number(e.kgs) || 0));
  }, 0);

  const handleAddToCart = () => {
    if (!item) return;
    const valid = entries.filter((e) => Number(e.kgs) > 0);
    if (valid.length === 0) {
      toast.error("Please enter a valid quantity in kg");
      return;
    }
    addItem({
      itemId: item.id,
      itemName: item.name,
      englishName: item.english_name || item.name,
      imageUrl: item.image_url,
      entries: valid
    });
    toast.success(`${item.english_name || item.name} updated in your cart`);
    setCartOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading Premium Grains...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/shop" 
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Catalog
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ShoppingBag className="h-6 w-6 text-foreground" />
            {totalKgs > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {entries.filter(e => e.kgs > 0).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 md:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Left Side: Product Image Display */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="aspect-square rounded-[3rem] overflow-hidden bg-muted/30 border border-border/50 shadow-2xl relative group">
              {item.image_url && !imgError ? (
                <img 
                  src={item.image_url} 
                  alt={item.english_name || item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Package className="h-24 w-24 opacity-20" />
                  <span className="font-bold uppercase tracking-widest text-xs">No Image Available</span>
                </div>
              )}
              
              {/* Badge */}
              <div className="absolute top-8 left-8 flex flex-col gap-2">
                <span className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                  Premium Quality
                </span>
                <span className="bg-white/90 backdrop-blur-sm text-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg border border-border/50">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Quality Accents */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, text: "Quality Verified" },
                { icon: Truck, text: "Bulk Delivery" },
                { icon: RotateCcw, text: "Grade Assured" }
              ].map((accent, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white border border-border/50 shadow-sm">
                  <accent.icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">{accent.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side: Configuration Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            {/* Header info */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
                <span className="text-xs font-bold text-muted-foreground ml-2">(4.9/5 Rating)</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                {item.english_name || item.name}
              </h1>
              <p 
                className="text-2xl text-muted-foreground mt-2" 
                dir="rtl" 
                style={{ fontFamily: "Noto Nastaliq Urdu, serif" }}
              >
                {item.name}
              </p>
            </div>

            {/* Live Rates Section */}
            {itemRates.length > 0 && (
              <div className="bg-primary/5 rounded-[2rem] p-6 mb-8 border border-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">Market Live Rates (Rs/KG)</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {GRADE_OPTIONS.map(g => {
                    const rate = itemRates.find(r => r.grade === g);
                    if (!rate) return null;
                    return (
                      <div key={g} className="bg-white border border-primary/20 px-4 py-2 rounded-2xl shadow-sm">
                        <span className="text-xs font-bold text-muted-foreground mr-2">Grade {g}:</span>
                        <span className="text-base font-black text-foreground">Rs. {rate.price_per_kg}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Configurator */}
            <div className="space-y-6 mb-10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Order Configuration</h3>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Wholesale Packaging</span>
              </div>

              {entries.map((entry, i) => {
                const currentRate = itemRates.find(r => r.grade === entry.grade)?.price_per_kg || 0;
                const entryTotal = currentRate * (Number(entry.kgs) || 0);

                return (
                  <motion.div 
                    layout
                    key={i}
                    className="p-6 rounded-[2.5rem] bg-white border-2 border-border/50 shadow-sm space-y-5 relative"
                  >
                    <div className="flex items-center justify-between border-b border-border/30 pb-4">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Package className="h-4 w-4" /> Batch Variant {i + 1}
                      </span>
                      {entries.length > 1 && (
                        <button 
                          onClick={() => removeRow(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2 ml-1">Grade</label>
                        <select
                          value={entry.grade}
                          onChange={(e) => updateEntry(i, "grade", e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none transition-all font-bold"
                        >
                          {GRADE_OPTIONS.map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2 ml-1">Packing</label>
                        <select
                          value={entry.packing}
                          onChange={(e) => updateEntry(i, "packing", e.target.value)}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none transition-all font-bold"
                        >
                          {PACKING_OPTIONS.map(p => <option key={p} value={p}>{p} bags</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2 ml-1">Weight (KG)</label>
                        <input
                          type="number"
                          min={0}
                          value={entry.kgs || ""}
                          onChange={(e) => updateEntry(i, "kgs", Number(e.target.value))}
                          placeholder="0.0"
                          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-background focus:border-primary outline-none transition-all font-bold text-lg"
                        />
                      </div>
                    </div>

                    {entryTotal > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/30 text-xs">
                        <span className="font-bold text-muted-foreground uppercase tracking-wider">Estimated Batch Cost</span>
                        <span className="text-sm font-black text-foreground">Rs. {entryTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <button 
                onClick={addRow}
                className="w-full py-4 rounded-[2rem] border-2 border-dashed border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" /> Add Quality Variation
              </button>
            </div>

            {/* Sticky Total Bar or Summary */}
            <div className="mt-auto pt-8 border-t border-border/50">
              {totalKgs > 0 && (
                <div className="flex items-end justify-between mb-6 px-4">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Total Weight</span>
                    <span className="text-2xl font-black text-foreground">{totalKgs.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">kg</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-1">Grand Estimated Bill</span>
                    <span className="text-3xl font-black text-primary">Rs. {totalBill.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                className="w-full h-16 rounded-full bg-primary text-white font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all"
              >
                <ShoppingBag className="h-6 w-6" />
                Add to Wholesale Cart
              </button>
            </div>
          </motion.div>
        </div>

        {/* You Might Also Love Section */}
        {relatedItems.length > 0 && (
          <section className="mt-24 md:mt-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">You Might Also Love</h2>
                <p className="text-muted-foreground mt-1">Discover other premium grains in the same category.</p>
              </div>
              <Link 
                to="/shop" 
                className="flex items-center gap-2 text-sm font-bold text-primary hover:underline group"
              >
                View full catalog <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {relatedItems.map(rel => (
                <ProductCard 
                  key={rel.id} 
                  item={rel} 
                  lowestPrice={null} // Prices calculated on card click usually or fetch separately if needed
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
