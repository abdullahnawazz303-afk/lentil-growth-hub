import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/CartDrawer";
import { AnimatePresence } from "framer-motion";
import { QfLogo } from "@/components/QfLogo";

const navLinks = [
  { label: "Shop", to: "/shop" },
  { label: "Track Order", to: "/track-order" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const cartCount = useCartStore((s) => s.items.length);

  return (
    <>
      <div className="sticky top-0 z-50">
        <header className="bg-primary text-primary-foreground relative shadow-md">
          <div className="max-w-7xl mx-auto flex h-24 items-center justify-between px-4 md:px-8">
            
            {/* Overlapping Logo Container */}
            <div className="relative h-full flex items-center w-[160px]">
              <Link 
                to="/" 
                onClick={() => {
                  if (location.pathname === "/") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="absolute top-4 left-0 flex items-center z-10 group bg-white rounded-br-[2rem] rounded-tr-[2rem] px-7 py-4 border-r border-y border-border/50 shadow-xl transition-transform hover:translate-x-1 hover:shadow-2xl"
              >
                <QfLogo className="group-hover:opacity-90 transition-opacity" />
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8 pl-8">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "text-sm font-bold uppercase tracking-widest transition-all relative py-2",
                    location.pathname === l.to
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {l.label}
                  {location.pathname === l.to && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-white rounded-t-md" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="hidden lg:flex items-center gap-5">
              {/* Cart icon */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-3 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-white"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-primary text-[11px] font-black flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>

              <Link to="/login">
                <Button size="default" className="rounded-full bg-white text-primary hover:bg-white/95 font-black text-xs uppercase tracking-widest px-8 py-6 h-auto shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile right icons */}
            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-white"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-primary text-[11px] font-black flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
              <button className="p-2 text-white bg-black/10 rounded-full" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Decorative Curved Bottom Edge (SVG) */}
          <div className="absolute -bottom-[20px] left-0 w-full overflow-hidden leading-[0] z-[-1]">
            <svg 
              data-name="Layer 1" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 1200 120" 
              preserveAspectRatio="none" 
              className="relative block w-full h-[22px] drop-shadow-md"
            >
              <path 
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
                className="fill-primary"
              ></path>
            </svg>
          </div>
        </header>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="lg:hidden absolute top-[100%] left-0 w-full bg-primary border-t border-white/10 px-5 pb-6 pt-4 space-y-2 shadow-2xl z-40 rounded-b-3xl">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block py-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors rounded-xl",
                    location.pathname === l.to 
                      ? "bg-white/20 text-white" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block mt-6">
                <Button size="default" className="w-full bg-white text-primary hover:bg-gray-100 font-bold py-6 rounded-full shadow-lg">
                  Login to Portal
                </Button>
              </Link>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
