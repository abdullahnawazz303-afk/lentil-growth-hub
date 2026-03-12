import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Truck, Award, Leaf, ArrowRight, ChevronRight } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-lentils.jpg";
import masoor from "@/assets/product-masoor.jpg";
import chana from "@/assets/product-chana.jpg";
import moong from "@/assets/product-moong.jpg";
import mash from "@/assets/product-mash.jpg";
import chickpeas from "@/assets/product-chickpeas.jpg";
import rice from "@/assets/product-rice.jpg";

const products = [
  { name: "Dal Masoor", image: masoor, desc: "Premium red lentils, cleaned and graded for exceptional purity." },
  { name: "Dal Chana", image: chana, desc: "Split chickpea lentils with a rich golden hue and consistent quality." },
  { name: "Dal Moong", image: moong, desc: "Green gram lentils, nutrient-dense and carefully sorted." },
  { name: "Dal Mash", image: mash, desc: "Black lentils (Urad Dal), high in protein and flavor." },
  { name: "Chickpeas", image: chickpeas, desc: "Whole kabuli chana, export-grade quality and uniform sizing." },
  { name: "Rice", image: rice, desc: "Fine-grain basmati rice, aromatic with extra-long grains." },
];

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
      <section className="relative min-h-[85vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Premium lentils and pulses"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 w-full">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-4">
              <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
              <span className="text-xs font-medium tracking-wide text-white/90 uppercase">Established Quality Since 2010</span>
            </motion.div>
            <motion.div variants={fadeUp} custom={0.5} className="flex items-center gap-5 mb-4">
              <img src={qfLogo} alt="QF Logo" className="w-20 h-20 md:w-32 md:h-32 object-contain" />
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Pakistan's Trusted
                <br />
                <span className="text-primary">Lentil &amp; Pulse</span>
                <br />
                Factory
              </h1>
            </motion.div>
            <motion.p variants={fadeUp} custom={2} className="text-base sm:text-lg md:text-xl text-white/75 mb-10 leading-relaxed max-w-lg">
              Factory-cleaned, graded, and packaged — delivering unmatched quality to wholesale markets across the nation.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
              <Link to="/contact">
                <Button size="lg" className="text-base px-8 h-12 shadow-lg">
                  Get a Quote <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-12 bg-white/5 text-white border-white/25 hover:bg-white/15 backdrop-blur-sm"
                >
                  Learn More
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
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-white/60" />
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary py-8 md:py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{s.value}</div>
              <div className="text-sm text-primary-foreground/70 mt-1 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Why Qais Foods</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Built on Quality & Trust</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From farm to market, every step of our process is designed to deliver the finest lentils and pulses.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full text-center border-none shadow-sm hover:shadow-md transition-shadow bg-card">
                  <CardContent className="pt-10 pb-8 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <f.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-widest">Product Range</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Our Premium Products</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A carefully curated selection of lentils, pulses, and grains — all graded and available in wholesale quantities.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-none shadow-sm">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-foreground mb-2">{p.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent-foreground" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <motion.div
          className="relative max-w-3xl mx-auto text-center px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-5">
            Ready to Partner with Us?
          </h2>
          <p className="text-primary-foreground/80 mb-10 text-lg leading-relaxed max-w-lg mx-auto">
            Whether you need bulk orders, wholesale pricing, or a reliable long-term supplier — let's talk.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" variant="secondary" className="text-base px-10 h-12 shadow-lg">
                Contact Us <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base px-10 h-12 bg-white/10 text-white border-white/25 hover:bg-white/20">
                Customer Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
