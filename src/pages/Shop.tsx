import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Package, X, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AddToCartModal } from "@/components/AddToCartModal";
import { CartDrawer } from "@/components/CartDrawer";
import { useCartStore } from "@/stores/cartStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { ProductCard, type ShopItem } from "@/components/ProductCard";

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
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const { items: cartItems, getTotalEntryCount } = useCartStore();
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
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* Page Header Banner */}
      <section className="relative bg-primary py-8 md:py-10 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-white/60 mb-3 flex items-center gap-1.5">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span>/</span>
            <span className="text-white font-medium">Shop</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Shop All Products
              </h1>
              <p className="text-white/70 mt-2 max-w-lg">
                Factory-graded lentils, pulses & rice — available in bulk for wholesale & retail.
              </p>
            </motion.div>
            {/* Cart button in header */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative self-start md:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-primary font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
            >
              <ShoppingBag className="h-5 w-5" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="sticky top-[80px] z-30 bg-background/95 backdrop-blur-md border-b shadow-sm py-2">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row md:items-center gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-80 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products... (e.g. Masoor, مسور, Chana...)"
              className="w-full h-11 pl-9 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex-1 min-w-0 flex flex-wrap md:flex-nowrap gap-2 md:overflow-x-auto md:pb-1 md:scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                  activeCategory === cat.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {cat.label}
                <span className="ml-1 opacity-70 text-xs" dir="rtl">{cat.urdu}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
            </p>
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
              >
                <ShoppingBag className="h-4 w-4" />
                View cart ({cartCount} item{cartCount !== 1 ? "s" : ""})
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-square" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <SlidersHorizontal className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold text-foreground">No products found</p>
              <p className="text-sm text-muted-foreground">Try a different search or category</p>
              <button
                onClick={() => { setSearch(""); setActiveCategory("all"); }}
                className="mt-2 px-5 py-2 rounded-full border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((item) => {
                const itemRates = rates.filter(r => r.item_name === item.name).map(r => r.price_per_kg);
                const lowestPrice = itemRates.length > 0 ? Math.min(...itemRates) : null;
                
                return (
                  <ProductCard
                    key={item.id || `idx-${item.name}`}
                    item={item}
                    lowestPrice={lowestPrice}
                    onAddToCart={setSelectedItem}
                    inCart={isInCart(item.id || item.name)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Add to Cart Modal */}
      <AnimatePresence>
        {selectedItem && (
          <AddToCartModal
            item={{
              itemId: selectedItem.id || `temp-${selectedItem.name}`,
              itemName: selectedItem.name || "Unknown",
              englishName: selectedItem.english_name || selectedItem.name || "Product",
              imageUrl: selectedItem.image_url,
            }}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
