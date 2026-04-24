import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Package } from "lucide-react";

export interface ShopItem {
  id: string;
  name: string;           // Urdu
  english_name: string | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

const CATEGORIES = [
  { key: "all",    label: "All Products",   urdu: "سب" },
  { key: "dal",    label: "Dal",            urdu: "دال" },
  { key: "chawal", label: "Chawal",         urdu: "چاول" },
  { key: "channe", label: "Channa",         urdu: "چنا" },
  { key: "lobiya", label: "Lobiya",         urdu: "لوبیا" },
  { key: "bajra",  label: "Bajra",          urdu: "باجرہ" },
  { key: "others", label: "Others",         urdu: "دیگر" },
];

export function ProductCard({
  item,
  lowestPrice,
  onAddToCart,
  inCart,
  disableAction = false,
}: {
  item: ShopItem;
  lowestPrice: number | null;
  onAddToCart?: (item: ShopItem) => void;
  inCart?: boolean;
  disableAction?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const categoryLabel = CATEGORIES.find((c) => c.key === item.category)?.label || "Others";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full"
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/5 to-primary/12">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.english_name || item.name || "Product"}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package className="h-14 w-14 text-primary/25" />
            <span className="text-xs text-primary/40 font-medium">No image yet</span>
          </div>
        )}

        {/* Cart state badge */}
        {inCart && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-md">
            In Cart ✓
          </div>
        )}

        {/* Add to cart button */}
        {!disableAction && onAddToCart && (
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(item);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className={`absolute bottom-3 right-3 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              inCart
                ? "bg-primary text-white"
                : "bg-white text-primary border border-primary/30 hover:bg-primary hover:text-white"
            }`}
            aria-label="Add to cart"
          >
            <ShoppingBag className="h-5 w-5" />
          </motion.button>
        )}
        
        {disableAction && (
          <div className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm text-primary flex items-center justify-center shadow-md">
            <ShoppingBag className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Category */}
        <span className="text-[11px] font-bold text-primary uppercase tracking-widest block mb-1">
          {categoryLabel}
        </span>

        {/* English name */}
        <h3 className="text-base font-bold text-foreground leading-tight mb-0.5">
          {item.english_name || item.name || "Unknown Product"}
        </h3>

        {/* Urdu name */}
        <p
          className="text-sm text-muted-foreground mb-3"
          dir="rtl"
          style={{ fontFamily: "Noto Nastaliq Urdu, 'Jameel Noori Nastaleeq', serif" }}
        >
          {item.name}
        </p>

        {/* Pricing */}
        {lowestPrice ? (
          <div className="flex items-end gap-1">
            <span className="text-xs text-muted-foreground mb-0.5">Starting at</span>
            <span className="text-lg font-bold text-primary leading-none">Rs. {lowestPrice}</span>
            <span className="text-xs text-muted-foreground mb-0.5">/ kg</span>
          </div>
        ) : (
          <div className="text-sm font-medium text-muted-foreground pb-0.5">Price varies by grade</div>
        )}
      </div>
    </motion.div>
  );
}
