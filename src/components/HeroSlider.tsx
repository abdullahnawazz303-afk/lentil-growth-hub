import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { QfLogo } from "@/components/QfLogo";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string;
}

// Fallback slides when no admin images are uploaded
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    title: "Pakistan's Trusted Lentil & Pulse Factory",
    subtitle: "Factory-cleaned, machine-graded — delivering unmatched quality to wholesale markets across the nation.",
    image_url: "/hero_1.png",
    link_url: "/shop",
  },
  {
    id: "fallback-2",
    title: "Premium Grains & Pulses",
    subtitle: "Dal Masoor, Dal Chana, Chawal 386 — all grades, all pack sizes, ready for bulk wholesale.",
    image_url: "/hero_2.png",
    link_url: "/shop",
  },
  {
    id: "fallback-3",
    title: "Quality You Can Count On",
    subtitle: "Established since 2010 — serving wholesale partners across Pakistan with consistent factory-grade products.",
    image_url: "/hero_3.png",
    link_url: "/shop",
  },
];

export function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch admin-uploaded slides
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("hero_slides")
        .select("id, title, subtitle, image_url, link_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) setSlides(data as HeroSlide[]);
    })();
  }, []);

  const goTo = useCallback(
    (index: number, dir: 1 | -1) => {
      setDirection(dir);
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // Auto-advance every 5.5 seconds
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5500);
  }, [next]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const slide = slides[current];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "92vh", minHeight: 520 }}>
      {/* Slides */}
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.32, 0, 0.67, 0] }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: `url(${slide.image_url})` }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/60" />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center mb-5">
                <QfLogo className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4 drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
                  {slide.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all shadow-xl hover:scale-105"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Shop Now
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-white/70 text-white font-bold text-base hover:bg-white/15 transition-all backdrop-blur-sm hover:scale-105"
                >
                  Get a Quote
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={() => { prev(); resetTimer(); }}
        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => { next(); resetTimer(); }}
        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i, i > current ? 1 : -1); resetTimer(); }}
            className={`transition-all rounded-full ${
              i === current
                ? "w-8 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
