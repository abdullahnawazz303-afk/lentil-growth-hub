import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Truck, Award, Leaf, ArrowRight, ChevronRight, Package } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero_lentils_new.png";

const features = [
  { icon: CheckCircle, title: "Quality Graded", desc: "Every batch meticulously sorted into A+, A, B, C grades for consistency." },
  { icon: Award, title: "Premium Standards", desc: "Factory-cleaned and hygienically packaged under strict quality control." },
  { icon: Truck, title: "Reliable Supply", desc: "Wholesale quantities delivered on schedule to markets nationwide." },
  { icon: Leaf, title: "Farm Fresh", desc: "Directly sourced from trusted farms across Pakistan's fertile regions." },
];

const stats = [
  { value: "15+", label: "Years Experience" },
  { value: "500+", label: "Wholesale Partners" },
  { value: "100+", label: "Tons Monthly" },
  { value: "6+", label: "Product Lines" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Premium lentils and pulses"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/92 via-foreground/70 to-foreground/25" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 w-full">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 border border-gold/50 bg-gold/10 mb-6">
              <Leaf className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-bold tracking-[0.2em] text-gold uppercase">Established Quality Since 2010</span>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.5} className="mb-4">
              <img src={qfLogo} alt="QF Logo" className="w-24 h-24 md:w-28 md:h-28 object-contain" />
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-[1.0] tracking-tight uppercase">
              Pakistan's Trusted
              <br />
              <span className="text-gold">Lentil &amp; Pulse</span>
              <br />
              Factory
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-base sm:text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-lg">
              Factory-cleaned, graded, and packaged — delivering unmatched quality to wholesale markets across the nation.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="text-base px-8 h-13 bg-gold text-gold-foreground hover:bg-gold/90 font-bold border-0 shadow-lg">
                  View Products <Package className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-13 bg-white/5 text-white border-white/30 hover:bg-white/15 backdrop-blur-sm font-semibold"
                >
                  Get a Quote <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/60" />
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="bg-foreground py-8 md:py-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center px-4"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="text-3xl md:text-5xl font-display font-bold text-gold">{s.value}</div>
              <div className="text-xs md:text-sm text-white/50 mt-1 font-medium uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Why Qais Foods</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">Built on Quality &amp; Trust</h2>
            <div className="mt-4 h-1 w-20 bg-primary" />
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-border">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="p-8 border-b border-r border-border last:border-r-0 hover:bg-secondary/30 transition-colors"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="w-14 h-14 bg-primary/10 flex items-center justify-center mb-5">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2 text-xl uppercase tracking-wide">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products teaser banner */}
      <section className="relative overflow-hidden bg-primary py-20 md:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white blur-3xl" />
        </div>
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)" }} />
        <motion.div
          className="relative max-w-5xl mx-auto px-4 md:px-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
            <div>
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-3 block">Product Catalogue</span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase leading-tight">
                Explore Our<br />
                <span className="text-gold">Premium Products</span>
              </h2>
              <p className="text-white/60 mt-5 max-w-md leading-relaxed">
                Dal Masoor, Dal Chana, Dal Moong, Dal Mash, Chickpeas, Basmati Rice — all grades, all pack sizes.
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/products">
                <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-10 h-14 border-0 shadow-xl">
                  View All Products <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-foreground py-20 md:py-28">
        <motion.div
          className="max-w-3xl mx-auto text-center px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-bold text-gold uppercase tracking-[0.25em] mb-4 block">Partner With Us</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-5 uppercase">
            Ready to Work Together?
          </h2>
          <p className="text-white/60 mb-10 text-lg leading-relaxed max-w-lg mx-auto">
            Whether you need bulk orders, wholesale pricing, or a reliable long-term supplier — let's talk.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-10 h-13 border-0 shadow-lg">
                Contact Us <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base px-10 h-13 bg-white/5 text-white border-white/25 hover:bg-white/20 font-semibold">
                Customer Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
