import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Package, Star, Shield, Leaf } from "lucide-react";
import masoor from "@/assets/product-masoor-hd.jpg";
import chana from "@/assets/product-chana-hd.jpg";
import moong from "@/assets/product-moong-hd.jpg";
import mash from "@/assets/product-mash-hd.jpg";
import chickpeas from "@/assets/product-chickpeas-hd.jpg";
import rice from "@/assets/product-rice-hd.jpg";

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

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function Products() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Hero Banner */}
      <section className="relative py-28 md:py-40 bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)" }} />
        <motion.div
          className="relative max-w-5xl mx-auto px-4 md:px-8 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-bold text-gold uppercase tracking-[0.25em] mb-5 px-4 py-1.5 border border-gold/40 bg-gold/10">
            Product Catalogue
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-[1.0] tracking-tight uppercase">
            Our Premium<br />
            <span className="text-gold">Products</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
            Factory-cleaned, machine-graded lentils and pulses — available for wholesale in bulk quantities across Pakistan.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-10 h-13 shadow-xl border-0">
              Request a Quote <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Quality highlights strip */}
      <section className="bg-foreground py-5 md:py-6 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {highlights.map((h, i) => (
            <motion.div
              key={h.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="w-10 h-10 rounded-sm bg-primary/60 flex items-center justify-center shrink-0">
                <h.icon className="h-5 w-5 text-gold" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{h.label}</div>
                <div className="text-xs text-white/50">{h.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14 md:mb-18"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">What We Offer</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">
                  Full Product Range
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                All products available in multiple pack sizes from 500g retail to 50kg bulk sacks.
              </p>
            </div>
            <div className="mt-5 h-1 w-24 bg-primary" />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-border">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                className="group relative border-b border-r border-border last:border-r-0 overflow-hidden bg-card hover:bg-secondary/20 transition-colors duration-300"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                  {p.badge && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-gold text-gold-foreground text-xs font-bold uppercase tracking-widest">
                      {p.badge}
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-xl md:text-2xl font-display font-bold text-white uppercase leading-tight">{p.name}</h3>
                      <span className="text-white/60 text-sm font-medium">{p.urdu}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground py-20 md:py-24">
        <motion.div
          className="max-w-4xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-bold text-gold uppercase tracking-[0.25em] mb-4 block">Bulk Orders Welcome</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-5 uppercase leading-tight">
            Need Wholesale Pricing?
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Get in touch for bulk pricing, custom packaging, and dedicated account management.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-10 h-13 border-0">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base px-10 h-13 text-white border-white/30 bg-white/5 hover:bg-white/10 font-semibold">
                Customer Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
