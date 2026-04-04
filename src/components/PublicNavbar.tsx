import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "About", to: "/about" },
  { label: "FAQs", to: "/faqs" },
  { label: "Contact", to: "/contact" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-foreground border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={qfLogo} alt="QF Logo" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-2xl md:text-3xl text-gold uppercase tracking-wide">
              Qais Foods
            </span>
            <span className="text-[10px] md:text-xs font-bold tracking-[0.18em] text-white/50 uppercase">
              Pulses &amp; Rice
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-sm font-bold uppercase tracking-wider transition-colors",
                location.pathname === l.to
                  ? "text-gold"
                  : "text-white/70 hover:text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login">
            <Button size="default" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-sm px-6 border-0">
              Login
            </Button>
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? (
            <X className="h-7 w-7 text-white" />
          ) : (
            <Menu className="h-7 w-7 text-white" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-foreground border-t border-white/10 px-5 pb-5 pt-3 space-y-1 shadow-xl">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b border-white/5",
                location.pathname === l.to ? "text-gold" : "text-white/60 hover:text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button size="default" className="w-full mt-4 bg-gold text-gold-foreground hover:bg-gold/90 font-bold border-0">
              Login
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
