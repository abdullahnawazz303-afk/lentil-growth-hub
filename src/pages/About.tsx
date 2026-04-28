import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aboutImg from "@/assets/about_factory_new.png";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Users, Award, ArrowRight, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const stats = [
  { label: "Years in Business", value: "15+" },
  { label: "Products", value: "6+" },
  { label: "Happy Clients", value: "50+" },
  { label: "Monthly Capacity", value: "100+ Tons" },
];

const values = [
  { icon: Target, title: "Our Mission", desc: "To provide the highest quality lentils and pulses to markets across Pakistan, ensuring purity, consistency, and fair pricing for our wholesale partners." },
  { icon: Eye, title: "Our Vision", desc: "To become Pakistan's most trusted lentil packaging factory, known for quality grading, reliable supply, and modern operations." },
  { icon: Users, title: "Our Team", desc: "A dedicated team of quality inspectors, packaging specialists, and logistics experts who ensure every bag meets our premium standards." },
  { icon: Award, title: "Quality Promise", desc: "Every batch is cleaned, sorted by grade (A+, A, B, C), and packaged under strict quality control before reaching our customers." },
];

const faqCategories = [
  {
    category: "Ordering & Minimums",
    faqs: [
      {
        question: "Is there a weight limit for orders?",
        answer: "Any weight can be selected during the order process, but final approval depends on stock and logistics. If an order is rejected, you will receive a formal notification via WhatsApp.",
      },
      {
        question: "Where is your factory located?",
        answer: "Our main factory and processing facility is located in the Shahdara, Lahore area, strategically positioned to serve markets across Pakistan.",
      },
      {
        question: "Can I order multiple products in one shipment?",
        answer: "Absolutely. You can combine different lentil varieties, pulses, and rice in a single order. Our logistics team in Lahore will coordinate to ensure efficient delivery.",
      },
    ],
  },
  {
    category: "Packaging & Customisation",
    faqs: [
      {
        question: "Do you offer custom packing sizes?",
        answer: "Yes, we provide packaging solutions ranging from 0.5 kg retail packs to 50 kg bulk sacks, tailored precisely to your distribution and market needs.",
      },
      {
        question: "Can you print custom labels or branding on packaging?",
        answer: "We offer white-label and custom-branded packaging for qualifying wholesale accounts. Minimum quantities apply for custom printing. Please contact us to discuss your branding requirements.",
      },
    ],
  },
  {
    category: "Quality & Sourcing",
    faqs: [
      {
        question: "Where do you source your lentils and pulses?",
        answer: "We source our legumes directly from trusted, established farms across the most fertile regions of Pakistan, as well as importing premium grades internationally to guarantee year-round supply.",
      },
      {
        question: "What quality assurance standards do you follow?",
        answer: "Every batch undergoes rigorous machine cleaning, color sorting, and manual inspection. We grade products meticulously into A+, A, B, and C categories ensuring absolute consistency.",
      },
    ],
  },
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
          <span className="inline-block text-xs font-black text-white uppercase tracking-[0.25em] mb-5 px-6 py-2 rounded-full bg-primary shadow-xl">
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

      {/* FAQs Section */}
      <section className="py-20 md:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <motion.div
            className="mb-14 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Help Center</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mt-2 uppercase leading-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Common questions about our wholesale operations, delivery, and quality control.</p>
          </motion.div>

          <div className="space-y-10">
            {faqCategories.map((cat, ci) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.1, duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">{cat.category}</h3>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-3">
                  {cat.faqs.map((faq, fi) => (
                    <AccordionItem
                      key={fi}
                      value={`cat-${ci}-item-${fi}`}
                      className="border border-border bg-white rounded-2xl px-6 transition-all data-[state=open]:border-primary/40 data-[state=open]:shadow-md"
                    >
                      <AccordionTrigger className="text-left font-bold text-base md:text-lg py-5 hover:text-primary no-underline hover:no-underline transition-colors">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-5">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-6">Still have a question that isn't answered here?</p>
            <Link to="/contact">
              <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 font-bold px-10 shadow-lg">
                Contact Our Support <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
