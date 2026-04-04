import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Package, Star, Shield, Leaf } from "lucide-react";
import masoor from "@/assets/product-masoor.png";
import chana from "@/assets/product-chana.png";
import moong from "@/assets/product-moong.png";
import mash from "@/assets/product-mash.png";
import chickpeas from "@/assets/product-chickpeas.png";
import rice from "@/assets/product-rice.png";

const products = [
  {
    name: "Dal Masoor",
    urdu: "دال مسور",
    image: masoor,
    desc: "Premium red lentils, machine-cleaned and graded for exceptional purity and consistent cooking quality.",
    tags: ["Grade A+", "Wholesale Available"],
    badge: "Bestseller",
  },
  {
    name: "Dal Chana",
    urdu: "دال چنا",
    image: chana,
    desc: "Split chickpea lentils with a rich golden hue, sourced from Pakistan's finest farms.",
    tags: ["Grade A+", "Export Quality"],
    badge: "Premium",
  },
  {
    name: "Dal Moong",
    urdu: "دال مونگ",
    image: moong,
    desc: "Green gram lentils, nutrient-dense, carefully sorted and hygienically packaged.",
    tags: ["Grade A", "Wholesale Available"],
    badge: null,
  },
  {
    name: "Dal Mash",
    urdu: "دال ماش",
    image: mash,
    desc: "Urad Dal — black gram lentils, high in protein, rich in flavour, consistent quality.",
    tags: ["Grade A+", "Bulk Orders"],
    badge: null,
  },
  {
    name: "Chickpeas",
    urdu: "کابلی چنا",
    image: chickpeas,
    desc: "Whole kabuli chana, export-grade with uniform sizing and superior cleaning standards.",
    tags: ["Export Grade", "Bulk Orders"],
    badge: "Export Grade",
  },
  {
    name: "Basmati Rice",
    urdu: "باسمتی چاول",
    image: rice,
    desc: "Fine-grain basmati rice, extra-long aromatic grains, perfect for wholesale distribution.",
    tags: ["Premium", "Wholesale Available"],
    badge: null,
  },
];

const highlights = [
  { icon: Star, label: "A+ Grade", desc: "Meticulously graded in every batch" },
  { icon: Shield, label: "Factory Cleaned", desc: "Hygienically processed & packed" },
  { icon: Package, label: "Bulk Ready", desc: "Available in wholesale quantities" },
  { icon: Leaf, label: "Farm Fresh", desc: "Sourced directly from trusted farms" },
];

const fadeSlide = (dir: "up" | "left" | "right" = "up", delay = 0) => ({
  hidden: {
    opacity: 0,
    y: dir === "up" ? 36 : 0,
    x: dir === "left" ? -36 : dir === "right" ? 36 : 0,
  },
  visible: {
    opacity: 1, y: 0, x: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
  },
});

export default function Products() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Hero Banner ───────────────────────────── */}
      <section className="relative py-14 md:py-20 bg-primary overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl"
            animate={{ scale: [1, 1.2, 1], x: [0, -15, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)" }} />

        <motion.div
          className="relative max-w-5xl mx-auto px-4 md:px-8 text-center"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14 } } }}
        >
          <motion.span
            variants={fadeSlide("up")}
            className="inline-block text-xs font-bold text-white/70 uppercase tracking-[0.25em] mb-5 px-4 py-1.5 rounded-full border border-white/30 bg-white/10"
          >
            Product Catalogue
          </motion.span>
          <motion.h1
            variants={fadeSlide("up")}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-[1.0] tracking-tight uppercase"
          >
            Our Premium<br />
            <span className="text-white/60">Products</span>
          </motion.h1>
          <motion.p variants={fadeSlide("up")} className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
            Factory-cleaned, machine-graded lentils and pulses — available for wholesale in bulk quantities across Pakistan.
          </motion.p>
          <motion.div variants={fadeSlide("up")}>
            <Link to="/contact">
              <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/85 font-bold text-base px-10 shadow-xl border-0 animate-pulse-glow">
                  Request a Quote <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Quality highlights strip ───────────────── */}
      <section className="bg-primary/5 py-5 md:py-6 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {highlights.map((h, i) => (
            <motion.div
              key={h.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                whileHover={{ scale: 1.15, backgroundColor: "hsl(var(--primary) / 0.2)" }}
                transition={{ duration: 0.2 }}
              >
                <h.icon className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <div className="text-sm font-bold text-foreground">{h.label}</div>
                <div className="text-xs text-muted-foreground">{h.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Product Grid ──────────────────────────── */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeSlide("up")} className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">What We Offer</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">
                  Full Product Range
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                All products available in multiple pack sizes from 500g retail to 50kg bulk sacks.
              </p>
            </motion.div>
            <motion.div
              className="mt-5 h-1 w-24 bg-primary"
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted img-zoom">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/10 to-transparent" />

                  {/* Badge */}
                  {p.badge && (
                    <motion.div
                      className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest"
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                    >
                      {p.badge}
                    </motion.div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-white uppercase leading-tight">{p.name}</h3>
                    <span className="text-white/60 text-sm">{p.urdu}</span>
                  </div>
                </div>

                {/* Content */}
                <motion.div
                  className="p-6"
                  whileHover={{ backgroundColor: "hsl(var(--secondary) / 0.35)" }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="bg-primary/5 py-20 md:py-24">
        <motion.div
          className="max-w-4xl mx-auto px-4 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.13 } } }}
        >
          <motion.span variants={fadeSlide("up")} className="text-xs font-bold text-primary uppercase tracking-[0.25em] mb-4 block">
            Bulk Orders Welcome
          </motion.span>
          <motion.h2 variants={fadeSlide("up")} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-5 uppercase leading-tight">
            Need Wholesale Pricing?
          </motion.h2>
          <motion.p variants={fadeSlide("up")} className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Get in touch for bulk pricing, custom packaging, and dedicated account management.
          </motion.p>
          <motion.div variants={fadeSlide("up")} className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/85 font-bold text-base px-10 border-0">
                  Contact Us <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.96 }}>
                <Button size="lg" variant="outline" className="rounded-full text-base px-10 text-primary border-primary/40 hover:bg-primary/10 font-semibold">
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
