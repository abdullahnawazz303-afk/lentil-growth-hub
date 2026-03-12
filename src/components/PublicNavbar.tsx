import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex h-24 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3.5">
          <img src={qfLogo} alt="QF Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-2xl md:text-3xl text-primary transition-colors">
              Qais Food
            </span>
            <span className="text-xs md:text-sm font-bold tracking-wider text-primary/70 uppercase">
              Deals In: Pulses &amp; Rice
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-base font-bold transition-colors",
                location.pathname === l.to
                  ? "text-primary"
                  : "text-primary/80 hover:text-primary"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login">
            <Button size="default" className="shadow-sm text-base px-6">Login</Button>
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? (
            <X className="h-8 w-8 text-foreground" />
          ) : (
            <Menu className="h-8 w-8 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-5 pb-5 pt-3 space-y-1 shadow-lg">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-3 text-base font-bold transition-colors",
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button size="default" className="w-full mt-3 text-base">Login</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
