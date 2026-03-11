import { Link, useLocation } from "react-router-dom";
import { Leaf, Menu, X } from "lucide-react";
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
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors",
            scrolled ? "text-foreground" : "text-white"
          )}>
            Qais Foods
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-sm font-medium transition-colors",
                location.pathname === l.to
                  ? "text-primary"
                  : scrolled
                    ? "text-muted-foreground hover:text-primary"
                    : "text-white/80 hover:text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login">
            <Button size="sm" className="shadow-sm">Login</Button>
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? (
            <X className={cn("h-6 w-6", scrolled ? "text-foreground" : "text-white")} />
          ) : (
            <Menu className={cn("h-6 w-6", scrolled ? "text-foreground" : "text-white")} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 pb-4 pt-2 space-y-2 shadow-lg">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block py-2.5 text-sm font-medium transition-colors",
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full mt-2">Login</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
