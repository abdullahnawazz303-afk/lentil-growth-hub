import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Package, X, SlidersHorizontal, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRateCardStore } from "@/stores/rateCardStore";
import { ProductCard, type ShopItem } from "@/components/ProductCard";
import { Link } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/CartDrawer";

const CATEGORIES = [
  { key: "all",    label: "All Products",   urdu: "سب" },
  { key: "dal",    label: "Dal",            urdu: "دال" },
  { key: "chawal", label: "Chawal",         urdu: "چاول" },
  { key: "channe", label: "Channa",         urdu: "چنا" },
  { key: "lobiya", label: "Lobiya",         urdu: "لوبیا" },
  { key: "bajra",  label: "Bajra",          urdu: "باجرہ" },
  { key: "others", label: "Others",         urdu: "دیگر" },
];

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);

  const { items: cartItems } = useCartStore();
  const { rates, fetchRates } = useRateCardStore();
  const cartCount = cartItems.length;

  useEffect(() => {
    fetchRates();
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("item_names")
        .select("id, name, english_name, category, image_url, is_active")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (!error && data) setItems(data as ShopItem[]);
      setLoading(false);
    })();
  }, [fetchRates]);

  const filtered = items.filter((item) => {
    const matchCategory =
      activeCategory === "all" || item.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (item.english_name || "").toLowerCase().includes(q) ||
      (item.name || "").includes(search);
    return matchCategory && matchSearch;
  });

  const isInCart = (id: string) => cartItems.some((i) => i.itemId === id);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header Banner (Minimalist) */}
      <section className="bg-background pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <nav className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="text-xs">»</span>
            <span className="text-foreground">Products</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-display font-black text-foreground tracking-tight"
            >
              Products
            </motion.h1>

            {/* Cart button in header */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-3 px-6 py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-md"
            >
              <ShoppingBag className="h-5 w-5" />
              View Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center shadow-md border-2 border-white">
                  {cartCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="sticky top-24 z-30 bg-background/80 backdrop-blur-xl border-b shadow-sm py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row md:items-center gap-4">
          
          {/* Search bar */}
          <div className="relative w-full md:w-96 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full h-14 pl-12 pr-12 rounded-full border-2 border-border bg-white text-base focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted-foreground hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex-1 min-w-0 flex flex-nowrap gap-3 overflow-x-auto pb-2 pt-1 md:py-1 scrollbar-none items-center pr-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-bold transition-all border-2 flex items-center gap-2 ${
                  activeCategory === cat.key
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {cat.label}
                <span className={`opacity-60 text-xs font-normal ${activeCategory === cat.key ? "text-white" : "text-muted-foreground"}`} dir="rtl">{cat.urdu}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-8 md:py-12 relative">
        {/* Subtle background blob */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/5 blob-shape pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Results count */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {loading ? "Loading Catalog..." : `Showing ${filtered.length} Product${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-[2.5rem] bg-muted/40 animate-pulse aspect-[3/4]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center gap-4 bg-white rounded-[3rem] border shadow-sm">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <SlidersHorizontal className="h-10 w-10 text-primary" />
              </div>
              <p className="text-2xl font-display font-black text-foreground">No products found</p>
              <p className="text-base text-muted-foreground max-w-md">Try adjusting your search or category filter to find what you're looking for.</p>
              <button
                onClick={() => { setSearch(""); setActiveCategory("all"); }}
                className="mt-4 px-8 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filtered.map((item) => {
                const itemRates = rates.filter(r => r.item_name === item.name).map(r => r.price_per_kg);
                const lowestPrice = itemRates.length > 0 ? Math.min(...itemRates) : null;
                
                return (
                  <ProductCard
                    key={item.id || `idx-${item.name}`}
                    item={item}
                    lowestPrice={lowestPrice}
                    inCart={isInCart(item.id || item.name)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
