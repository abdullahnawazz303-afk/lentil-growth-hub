import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-white/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-white">Qais Foods</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Premium quality lentils and pulses, sourced from the finest farms across Pakistan.
              Cleaned, graded, and packaged to perfection.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact Info</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li>📍 Industrial Area, Lahore, Pakistan</li>
              <li>📞 +92 300 0000000</li>
              <li>✉️ info@qaisfoods.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Qais Foods. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
