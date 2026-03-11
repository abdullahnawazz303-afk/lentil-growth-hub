import aboutImg from "@/assets/about-factory.jpg";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Users, Award } from "lucide-react";

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

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={aboutImg} alt="Our factory" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-36 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Our Factory</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            A modern lentil packaging facility in the heart of Pakistan, serving wholesale markets with premium quality products.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{s.value}</div>
              <div className="text-sm text-primary-foreground/70 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">What Drives Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((v) => (
              <Card key={v.title} className="border-none shadow-md">
                <CardContent className="p-8 flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <v.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
