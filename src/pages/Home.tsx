import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Truck, Award, Leaf } from "lucide-react";
import heroImg from "@/assets/hero-lentils.jpg";
import masoor from "@/assets/product-masoor.jpg";
import chana from "@/assets/product-chana.jpg";
import moong from "@/assets/product-moong.jpg";
import mash from "@/assets/product-mash.jpg";
import chickpeas from "@/assets/product-chickpeas.jpg";
import rice from "@/assets/product-rice.jpg";

const products = [
  { name: "Dal Masoor", image: masoor, desc: "Premium red lentils, cleaned and graded" },
  { name: "Dal Chana", image: chana, desc: "Split chickpea lentils, golden quality" },
  { name: "Dal Moong", image: moong, desc: "Green gram lentils, rich in nutrition" },
  { name: "Dal Mash", image: mash, desc: "Black lentils (Urad Dal), high protein" },
  { name: "Chickpeas", image: chickpeas, desc: "Whole kabuli chana, export quality" },
  { name: "Rice", image: rice, desc: "Fine-grain basmati, aromatic and long" },
];

const features = [
  { icon: CheckCircle, title: "Quality Graded", desc: "Every batch sorted into A+, A, B, C grades" },
  { icon: Award, title: "Premium Standards", desc: "Factory cleaned and hygienically packaged" },
  { icon: Truck, title: "Bulk Supply", desc: "Wholesale quantities for markets nationwide" },
  { icon: Leaf, title: "Farm Fresh", desc: "Sourced directly from trusted Pakistani farms" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Premium lentils and pulses" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-40">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Premium Lentils &amp; Pulses from Pakistan
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              Sourced from the finest farms, cleaned, graded, and packaged to deliver
              unmatched quality to wholesale markets across the country.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/contact">
                <Button size="lg" className="text-base px-8">Get a Quote</Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 text-white border-white/30 hover:bg-white/20">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="text-center border-none shadow-md">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <f.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">Our Products</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            We offer a wide range of lentils, pulses, and grains — all graded and available in bulk quantities.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <Card key={p.name} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg text-foreground mb-1">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Order in Bulk?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Contact us today for competitive wholesale pricing and reliable delivery.
          </p>
          <Link to="/contact">
            <Button size="lg" variant="secondary" className="text-base px-10">
              Contact Us Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
