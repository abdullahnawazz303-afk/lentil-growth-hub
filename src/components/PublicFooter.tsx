import { Link } from "react-router-dom";
import { QfLogo } from "@/components/QfLogo";
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-white/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* Brand & Mission */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-block mb-6 group">
              <QfLogo isWhite className="scale-110 origin-left transition-transform group-hover:scale-115" />
            </Link>
            <p className="text-sm md:text-base text-white/50 leading-relaxed max-w-sm mb-8">
              A state-of-the-art lentil processing and packaging facility delivering Pakistan's finest factory-grade pulses and rice to wholesale partners nationwide.
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="md:col-span-3">
            <h4 className="font-display font-black text-white mb-6 text-xs uppercase tracking-[0.3em]">Navigation</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/shop" className="text-white/40 hover:text-primary transition-colors">Shop Catalog</Link></li>
              <li><Link to="/about" className="text-white/40 hover:text-primary transition-colors">Our Factory</Link></li>
              <li><Link to="/track-order" className="text-white/40 hover:text-primary transition-colors">Track Your Order</Link></li>
              <li><Link to="/contact" className="text-white/40 hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/login" className="text-white/40 hover:text-primary transition-colors">Wholesale Portal</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4">
            <h4 className="font-display font-black text-white mb-6 text-xs uppercase tracking-[0.3em]">Get In Touch</h4>
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-4 text-white/40">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>Shahdara Industrial Area,<br />Lahore, Punjab, Pakistan</span>
              </li>
              <li className="flex items-center gap-4 text-white/40">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span dir="ltr">+92 321 4455667</span>
              </li>
              <li className="flex items-center gap-4 text-white/40">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>info@qaisfoods.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Attribution */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] md:text-xs text-white/20 font-bold uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Qais Foods. All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
