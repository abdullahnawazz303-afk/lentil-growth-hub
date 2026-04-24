import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Leaf, CheckCircle, Building2 } from "lucide-react";

const RequestAccess = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    phone: "",
    city: "",
    address: "",
    email: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    // ── Check if phone already registered as a customer
    const cleanPhone = form.phone.trim().replace(/\s+/g, "");
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingCustomer) {
      toast.error(
        "This phone number is already registered. Go to Register page to create your account.",
        { duration: 6000 }
      );
      setLoading(false);
      return;
    }

    // ── Check if request already submitted with same phone
    const { data: existingRequest } = await supabase
      .from("customer_requests")
      .select("id, status")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === "Pending") {
        toast.error("A request with this phone number is already pending review.");
      } else if (existingRequest.status === "Approved") {
        // If it says Approved but we found no customer earlier, it's an orphaned request
        // from a previously deleted customer. We should allow them to re-submit.
        if (!existingCustomer) {
          // Silent cleanup of the orphaned request to allow the new one
          await supabase.from("customer_requests").delete().eq("id", existingRequest.id);
        } else {
          toast.error("This phone number is already approved. Go to Register to create your account.");
          setLoading(false);
          return;
        }
      } else {
        toast.error("A previous request with this phone was rejected. Contact the factory directly.");
      }
      
      // If we cleared an orphaned request, we continue to submission. 
      // Otherwise, we stop (the 'return' statements above handled that).
      if (existingRequest.status !== "Approved" || existingCustomer) {
        setLoading(false);
        return;
      }
    }

    // ── Submit request
    const { error } = await supabase
      .from("customer_requests")
      .insert({
        full_name:     form.full_name.trim(),
        business_name: form.business_name.trim() || null,
        phone:         cleanPhone,
        city:          form.city.trim() || null,
        address:       form.address.trim() || null,
        email:         form.email.trim().toLowerCase(),
        notes:         form.notes.trim() || null,
        status:        "Pending",
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to submit request. Please try again.");
      return;
    }

    setSuccess(true);
  };

  // ── Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm shadow-xl border-none text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Request Submitted!</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Your request has been sent to the factory team. They will review it and contact you soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Once approved, you will be able to create your account using your phone number.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <Link to="/register">
                <Button className="w-full" variant="outline">
                  Already approved? Register now
                </Button>
              </Link>
              <Link to="/login">
                <Button className="w-full" variant="ghost">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Request Customer Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your details and our team will review your request within 24 hours
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    name="full_name"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business / Shop Name</Label>
                  <Input
                    name="business_name"
                    placeholder="Optional"
                    value={form.business_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="03001234567"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to create your account later
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    name="city"
                    placeholder="Your city"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    name="address"
                    placeholder="Shop / delivery address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  name="notes"
                  placeholder="Tell us about your business, what products you need, expected order quantity..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  : <><Building2 className="h-4 w-4 mr-2" /> Submit Request</>
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Link
            to="/register"
            className="text-sm text-muted-foreground hover:text-foreground block"
          >
            Already approved? Create your account →
          </Link>
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;