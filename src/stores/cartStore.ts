import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartEntry {
  grade: string;
  packing: string;
  kgs: number;
}

export interface CartItem {
  itemId: string;
  itemName: string;      // Urdu name
  englishName: string;
  imageUrl: string | null;
  entries: CartEntry[];
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "entries"> & { entries: CartEntry[] }) => void;
  updateItem: (itemId: string, entries: CartEntry[]) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getTotalEntryCount: () => number;
  getItem: (itemId: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.itemId === item.itemId);
          if (existing) {
            // Replace entries (edit mode)
            return {
              items: state.items.map((i) =>
                i.itemId === item.itemId
                  ? { ...i, entries: item.entries }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      updateItem: (itemId, entries) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.itemId === itemId ? { ...i, entries } : i
          ),
        }));
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.itemId !== itemId),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalEntryCount: () => {
        return get().items.reduce((acc, item) => acc + item.entries.length, 0);
      },

      getItem: (itemId) => {
        return get().items.find((i) => i.itemId === itemId);
      },
    }),
    { name: "qais-cart" }
  )
);
