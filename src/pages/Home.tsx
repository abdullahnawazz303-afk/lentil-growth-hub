import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Truck, Award, Leaf, ArrowRight, ChevronRight, Package } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

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

const heroWords = ["Pakistan's", "Trusted"];
const heroHighlight = "Lentil & Pulse";
const heroLast = "Factory";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const wordVariant = {
  hidden: { opacity: 0, y: 40, skewY: 3 },
  visible: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const fadeSlide = (dir: "up" | "left" | "right" = "up") => ({
  hidden: {
    opacity: 0,
    y: dir === "up" ? 32 : 0,
    x: dir === "left" ? -32 : dir === "right" ? 32 : 0,
  },
  visible: {
    opacity: 1, y: 0, x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
});

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className="text-center px-4"
      initial={{ opacity: 0, scale: 0.75 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 160, damping: 18 }}
    >
      <div className="text-3xl md:text-5xl font-display font-bold text-primary">{value}</div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium uppercase tracking-widest">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-white">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Soft green gradient blobs */}
          <motion.div
            className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-primary/6 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-3xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle, hsl(151 75% 25% / 0.15) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          {/* Decorative circle rings */}
          <motion.div
            className="absolute right-12 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-primary/15"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-12 top-1/2 -translate-y-1/2 w-52 h-52 rounded-full border border-primary/25"
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute right-12 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary/8 border border-primary/30"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 w-full py-20">
          <motion.div
            className="max-w-2xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={wordVariant} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/8 text-xs font-bold tracking-[0.2em] text-primary uppercase">
                <Leaf className="h-3.5 w-3.5" />
                Established Quality Since 2010
              </span>
            </motion.div>

            {/* Logo */}
            <motion.div variants={wordVariant} className="mb-4">
              <img src={qfLogo} alt="QF Logo" className="w-24 h-24 md:w-28 md:h-28 object-contain" />
            </motion.div>

            {/* Title — word by word */}
            <div className="mb-6 overflow-hidden">
              {heroWords.map((word) => (
                <motion.span
                  key={word}
                  variants={wordVariant}
                  className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.05] uppercase tracking-tight"
                >
                  {word}
                </motion.span>
              ))}
              <motion.span
                variants={wordVariant}
                className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary leading-[1.05] uppercase tracking-tight"
              >
                {heroHighlight}
              </motion.span>
              <motion.span
                variants={wordVariant}
                className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.05] uppercase tracking-tight"
              >
                {heroLast}
              </motion.span>
            </div>

            <motion.p variants={wordVariant} className="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Factory-cleaned, graded, and packaged — delivering unmatched quality to wholesale markets across the nation.
            </motion.p>

            <motion.div variants={wordVariant} className="flex flex-wrap gap-4">
              <Link to="/products">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="rounded-full text-base px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/85 font-bold border-0 shadow-lg">
                    View Products <Package className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/contact">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant="outline" className="rounded-full text-base px-8 h-12 text-primary border-primary/40 hover:bg-primary/8 font-semibold">
                    Get a Quote <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 9, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-primary/50" />
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ────────────────────────────── */}
      <section className="bg-primary/5 py-8 md:py-10 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {stats.map((s, i) => (
            <AnimatedStat key={s.label} value={s.value} label={s.label} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────── */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14"
            variants={fadeSlide("up")}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Why Qais Foods</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">
              Built on Quality &amp; Trust
            </h2>
            <motion.div
              className="mt-4 h-1 w-20 bg-primary"
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="p-7 rounded-2xl border border-border bg-card shadow-sm hover-lift cursor-default"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"
                  whileHover={{ scale: 1.1, backgroundColor: "hsl(var(--primary) / 0.2)" }}
                  transition={{ duration: 0.25 }}
                >
                  <f.icon className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="font-display font-bold text-foreground mb-2 text-xl uppercase tracking-wide">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products teaser banner ────────────────── */}
      <section className="relative overflow-hidden bg-primary py-20 md:py-28">
        <div className="absolute inset-0 opacity-10">
          <motion.div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white blur-3xl"
            animate={{ scale: [1, 1.12, 1], opacity: [0.1, 0.18, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)" }} />

        <div className="relative max-w-5xl mx-auto px-4 md:px-8">
          <motion.div
            className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          >
            <motion.div variants={fadeSlide("left")}>
              <span className="text-xs font-bold text-white/70 uppercase tracking-[0.2em] mb-3 block">Product Catalogue</span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase leading-tight">
                Explore Our<br />
                <span className="text-primary">Premium Products</span>
              </h2>
              <motion.p
                className="text-white/60 mt-5 max-w-md leading-relaxed"
                variants={fadeSlide("up")}
              >
                Dal Masoor, Dal Chana, Dal Moong, Dal Mash, Chickpeas, Basmati Rice — all grades, all pack sizes.
              </motion.p>
            </motion.div>

            <motion.div variants={fadeSlide("right")} className="shrink-0">
              <Link to="/products">
                <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.96 }}>
                  <Button size="lg" className="rounded-full bg-white text-primary hover:bg-white/90 font-bold text-base px-10 h-12 border-0 shadow-xl">
                    View All Products <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="bg-primary/5 py-20 md:py-28">
        <motion.div
          className="max-w-3xl mx-auto text-center px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14 } } }}
        >
          <motion.span variants={fadeSlide("up")} className="text-xs font-bold text-primary uppercase tracking-[0.25em] mb-4 block">
            Partner With Us
          </motion.span>
          <motion.h2 variants={fadeSlide("up")} className="text-4xl md:text-5xl font-display font-bold text-foreground mb-5 uppercase">
            Ready to Work Together?
          </motion.h2>
          <motion.p variants={fadeSlide("up")} className="text-muted-foreground mb-10 text-lg leading-relaxed max-w-lg mx-auto">
            Whether you need bulk orders, wholesale pricing, or a reliable long-term supplier — let's talk.
          </motion.p>
          <motion.div variants={fadeSlide("up")} className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/85 font-bold text-base px-10 h-12 border-0 shadow-lg">
                  Contact Us <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" variant="outline" className="rounded-full text-base px-10 h-12 text-primary border-primary/40 hover:bg-primary/10 font-semibold">
                  Customer Login
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
