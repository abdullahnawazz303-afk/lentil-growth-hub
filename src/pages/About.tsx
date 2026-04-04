import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aboutImg from "@/assets/about_factory_new.png";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Users, Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { label: "Years in Business", value: "15+" },
  { label: "Products", value: "6+" },
  { label: "Happy Clients", value: "500+" },
  { label: "Monthly Capacity", value: "100+ Tons" },
];

const values = [
  { icon: Target, title: "Our Mission", desc: "To provide the highest quality lentils and pulses to markets across Pakistan, ensuring purity, consistency, and fair pricing for our wholesale partners." },
  { icon: Eye, title: "Our Vision", desc: "To become Pakistan's most trusted lentil packaging factory, known for quality grading, reliable supply, and modern operations." },
  { icon: Users, title: "Our Team", desc: "A dedicated team of quality inspectors, packaging specialists, and logistics experts who ensure every bag meets our premium standards." },
  { icon: Award, title: "Quality Promise", desc: "Every batch is cleaned, sorted by grade (A+, A, B, C), and packaged under strict quality control before reaching our customers." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function About() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={aboutImg} alt="Our factory" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-foreground/85" />
        </div>
        <motion.div
          className="relative text-center px-4 py-28 md:py-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.25em] mb-5 px-4 py-1.5 border border-primary/40 bg-primary/10">
            Since 2010
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-8xl font-display font-bold text-white mb-5 tracking-tight uppercase leading-[1.0]">
            About Our Factory
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            A modern lentil processing and packaging facility in the heart of Pakistan, serving wholesale markets with premium quality products.
          </p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-primary/5 py-8 md:py-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center px-4"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="text-3xl md:text-5xl font-display font-bold text-primary">{s.value}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Our Core</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">What Drives Us</h2>
            <div className="mt-4 h-1 w-20 bg-primary" />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="h-full rounded-2xl border border-border shadow-sm hover:bg-secondary/20 transition-colors">
                  <CardContent className="p-8 flex gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <v.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-foreground mb-2 uppercase tracking-wide">{v.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs banner — links to /faqs */}
      <section className="relative overflow-hidden bg-primary py-20 md:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-white blur-3xl" />
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
              <span className="text-xs font-bold text-white/70 uppercase tracking-[0.2em] mb-3 block">Questions Answered</span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase leading-tight">
                Have Questions?<br />
                <span className="text-primary">See Our FAQs</span>
              </h2>
              <p className="text-white/60 mt-5 max-w-md leading-relaxed">
                Ordering, packaging, sourcing, quality, delivery — everything answered on our FAQ page.
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/faqs">
                <Button size="lg" className="rounded-full bg-white text-primary hover:bg-white/90 font-bold text-base px-10 h-12 border-0 shadow-xl">
                  View FAQs <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
