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
    title: "Pakistan's Trusted Lentil Factory",
    subtitle: "Factory-cleaned, machine-graded — delivering unmatched quality to wholesale markets.",
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
    enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#F9F9F9] pt-24 pb-12 lg:pt-32 lg:pb-20 min-h-[600px] lg:min-h-[85vh] flex items-center">
      
      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-0 right-0 w-full max-w-[60%] h-full z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-primary blob-shape-2 mix-blend-multiply filter blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 w-full relative z-10">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center"
          >
            {/* Left Content (Typography) */}
            <div className="order-2 lg:order-1 text-center lg:text-left flex flex-col items-center lg:items-start pt-8 lg:pt-0">
              <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary font-bold text-xs tracking-widest uppercase mb-6 shadow-sm">
                Premium Quality
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-foreground leading-[1.1] mb-6 uppercase">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  {slide.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all shadow-xl hover:-translate-y-1"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Shop Now
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-[3px] border-border text-foreground font-bold text-base hover:border-primary hover:text-primary transition-all hover:-translate-y-1 bg-white"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Right Content (Image & Blob) */}
            <div className="order-1 lg:order-2 relative flex justify-center items-center">
              {/* Colored Blob Shape Behind Image */}
              <div className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] bg-primary blob-shape z-0 opacity-90 shadow-2xl"></div>
              
              {/* Product/Hero Image */}
              <motion.img
                src={slide.image_url}
                alt={slide.title}
                className="relative z-10 w-[80%] max-w-[500px] h-auto object-cover rounded-3xl drop-shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
              />

              {/* Navigation Arrows (Positioned near the image on desktop) */}
              <div className="absolute -bottom-6 right-0 lg:right-auto lg:-bottom-12 lg:-left-12 z-20 flex gap-3">
                <button
                  onClick={() => { prev(); resetTimer(); }}
                  className="w-12 h-12 rounded-full bg-white text-primary shadow-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center border border-primary/10"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => { next(); resetTimer(); }}
                  className="w-12 h-12 rounded-full bg-white text-primary shadow-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center border border-primary/10"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative Bottom Curve (Matches Navbar style but reversed or used as transition) */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-20 transform rotate-180">
        <svg 
          data-name="Layer 1" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="relative block w-full h-[30px] md:h-[60px]"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            className="fill-background"
          ></path>
        </svg>
      </div>
    </section>
  );
}
