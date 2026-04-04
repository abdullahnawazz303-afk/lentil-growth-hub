import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    category: "Ordering & Minimums",
    faqs: [
      {
        question: "What is your minimum wholesale order quantity?",
        answer: "Our minimum order quantity for wholesale pricing varies by product, but generally starts at 1,000 kg (1 ton). Contact our sales team for exact minimums based on your chosen product.",
      },
      {
        question: "Can I order multiple products in one shipment?",
        answer: "Absolutely. You can combine different lentil varieties, pulses, and rice in a single order. Our logistics team will coordinate to ensure efficient delivery of all items together.",
      },
      {
        question: "Do you offer sample orders before bulk purchasing?",
        answer: "Yes, we provide sample packs for quality evaluation before placing large wholesale orders. Contact our sales team to arrange a product sample.",
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
      {
        question: "What packaging materials do you use?",
        answer: "We use food-grade, moisture-resistant polypropylene bags for bulk orders and high-quality printed pouches for retail-sized packaging, ensuring product freshness from factory to shelf.",
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
      {
        question: "How do you ensure product purity?",
        answer: "Our factory uses state-of-the-art color sorters and cleaning machines to remove any impurities, damaged grains, or foreign matter before packaging, ensuring unmatched purity.",
      },
    ],
  },
  {
    category: "Delivery & Logistics",
    faqs: [
      {
        question: "How do you handle delivery logistics?",
        answer: "We manage a robust logistics network providing reliable, scheduled deliveries to wholesale markets nationwide, ensuring your stock arrives fresh and on time.",
      },
      {
        question: "Which cities do you deliver to?",
        answer: "We deliver across Pakistan, including Lahore, Karachi, Islamabad, Faisalabad, Multan, Peshawar, Quetta, and all major wholesale markets. Contact us for delivery timelines to your city.",
      },
      {
        question: "What are your payment terms for wholesale orders?",
        answer: "We offer flexible payment terms for verified wholesale partners, including advance payment, partial advance, and credit terms for established accounts. Contact our sales team to discuss terms suitable for your business.",
      },
    ],
  },
];

export default function FAQs() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section className="relative py-28 md:py-40 bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white blur-3xl translate-y-1/2" />
        </div>
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 40px)" }} />
        <motion.div
          className="relative max-w-4xl mx-auto px-4 md:px-8 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-bold text-gold uppercase tracking-[0.25em] mb-5 px-4 py-1.5 border border-gold/40 bg-gold/10">
            Support & Information
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-[1.0] tracking-tight uppercase">
            Frequently<br />
            <span className="text-gold">Asked Questions</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about ordering, quality, packaging, and working with Qais Foods.
          </p>
        </motion.div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="space-y-12">
            {faqCategories.map((cat, ci) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.1, duration: 0.5 }}
              >
                {/* Category Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-primary flex items-center justify-center shrink-0">
                    <HelpCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground uppercase tracking-wide">
                    {cat.category}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Accordion */}
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {cat.faqs.map((faq, fi) => (
                    <AccordionItem
                      key={fi}
                      value={`cat-${ci}-item-${fi}`}
                      className="border border-border bg-card px-6 data-[state=open]:border-primary"
                    >
                      <AccordionTrigger className="text-left font-display font-bold text-lg md:text-xl py-5 hover:text-primary transition-colors uppercase tracking-wide no-underline hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed text-base pb-5">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="bg-foreground py-20 md:py-24">
        <motion.div
          className="max-w-3xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-primary/60 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase">
            Still Have Questions?
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-md mx-auto">
            Our team is ready to help. Get in touch and we'll respond within one business day.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-10 border-0">
                Contact Us <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="text-base px-10 text-white border-white/30 bg-white/5 hover:bg-white/10 font-semibold">
                View Products
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
