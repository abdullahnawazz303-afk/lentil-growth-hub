import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "dbe20b1b-4c59-47a2-8cfc-59edf77ac055",
          name: form.name,
          email: form.email,
          message: form.message,
          subject: "New Contact Form Submission from QAISFOODS",
          from_name: "QAISFOODS Website",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Thank you! Your message has been sent. We'll get back to you soon.");
        setForm({ name: "", email: "", message: "" });
      } else {
        toast.error(result.message || "Something went wrong. Please try again later.");
      }
    } catch (error) {
      toast.error("Failed to send message. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-primary py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/15 blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>
        <motion.div
          className="relative max-w-7xl mx-auto px-4 md:px-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-xs font-semibold text-primary-foreground/80 uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full border border-white/20 bg-white/10">
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 tracking-tight">Contact Us</h1>
          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
            Have a question or want to place a bulk order? Our team is ready to help.
          </p>
        </motion.div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <p className="text-sm text-muted-foreground">Fill out the form and we'll respond within 24 hours.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your requirements..."
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send Message</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Let's Work Together</h3>
              <p className="text-muted-foreground leading-relaxed">
                Whether you need bulk pricing, wholesale partnerships, or have any questions about our products — we're just a message away.
              </p>
            </div>

            <div className="space-y-5">
              {[
                { icon: MapPin, label: "Address", value: "Industrial Area, GT Road, Lahore, Pakistan" },
                { icon: Phone, label: "Phone", value: "+92 300 0000000" },
                { icon: Mail, label: "Email", value: "info@qaisfoods.com" },
                { icon: Clock, label: "Business Hours", value: "Mon–Sat: 9:00 AM – 6:00 PM" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{item.label}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
