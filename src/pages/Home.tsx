import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Truck, Award, Leaf, ArrowRight, ChevronRight, Package } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { HeroSlider } from "@/components/HeroSlider";

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

      {/* ── Hero Slider ─────────────────────────────── */}
      <HeroSlider />

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
              Built on Quality & Trust
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
                <span className="text-primary-foreground opacity-80">Premium Products</span>
              </h2>
              <motion.p
                className="text-white/60 mt-5 max-w-md leading-relaxed"
                variants={fadeSlide("up")}
              >
                Dal Masoor, Dal Chana, Chawal 386, Lobiya — all grades, all pack sizes.
              </motion.p>
            </motion.div>

            <motion.div variants={fadeSlide("right")} className="shrink-0">
              <Link to="/shop">
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
            <Link to="/shop">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" variant="outline" className="rounded-full text-base px-10 h-12 text-primary border-primary/40 hover:bg-primary/10 font-semibold">
                  Browse Shop <Package className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
