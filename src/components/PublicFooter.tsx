import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-white/80 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="mb-4">
              <span className="font-display font-bold text-2xl text-gold uppercase tracking-wide">Qais Foods</span>
              <div className="h-0.5 w-12 bg-gold mt-2" />
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Premium quality lentils and pulses, sourced from the finest farms across Pakistan.
              Factory-cleaned, graded, and packaged to perfection.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm uppercase tracking-[0.15em]">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-white/50">
              <li><Link to="/" className="hover:text-gold transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-gold transition-colors">Products</Link></li>
              <li><Link to="/about" className="hover:text-gold transition-colors">About Us</Link></li>
              <li><Link to="/faqs" className="hover:text-gold transition-colors">FAQs</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contact</Link></li>
              <li><Link to="/login" className="hover:text-gold transition-colors">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm uppercase tracking-[0.15em]">Contact Info</h4>
            <ul className="space-y-2.5 text-sm text-white/50">
              <li>📍 Industrial Area, Lahore, Pakistan</li>
              <li>📞 +92 300 0000000</li>
              <li>✉️ info@qaisfoods.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span>© {new Date().getFullYear()} Qais Foods. All rights reserved.</span>
          <span className="uppercase tracking-widest">Premium Pulses &amp; Rice — Pakistan</span>
        </div>
      </div>
    </footer>
  );
}
