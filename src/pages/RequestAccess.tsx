import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, Building2 } from "lucide-react";
import { QfLogo } from "@/components/QfLogo";

const RequestAccess = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "", business_name: "", phone: "", city: "", address: "", email: "", notes: "",
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
    const cleanPhone = form.phone.trim().replace(/\s+/g, "");
    const cleanEmail = form.email.trim().toLowerCase();

    // ── Check if phone is already fully active (approved + customer exists + user exists)
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", cleanPhone)
      .eq("is_active", true)
      .maybeSingle();

    if (existingCustomer) {
      // Check if they also have a portal (users row)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("customer_id", existingCustomer.id)
        .maybeSingle();

      if (existingUser) {
        toast.error(
          "This phone number is already registered with an active portal. Please login instead.",
          { duration: 6000 }
        );
        setLoading(false);
        return;
      }
      // Customer record exists but no portal — allow re-submit so admin can re-provision
    }

    // ── Check for an existing pending request
    const { data: existingRequest } = await supabase
      .from("customer_requests")
      .select("id, status")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingRequest?.status === "Pending") {
      toast.error("Your request is already pending review. Please wait for the admin to respond.", { duration: 6000 });
      setLoading(false);
      return;
    }

    // ── If a previous request exists (Rejected or Approved), delete it so we can re-insert
    // This is the key fix: rejected users can re-apply by simply overwriting their old record
    if (existingRequest) {
      await supabase.from("customer_requests").delete().eq("id", existingRequest.id);
    }

    // ── Submit (or re-submit) the request as fresh Pending
    const { error } = await supabase.from("customer_requests").insert({
      full_name:     form.full_name.trim(),
      business_name: form.business_name.trim() || null,
      phone:         cleanPhone,
      city:          form.city.trim() || null,
      address:       form.address.trim() || null,
      email:         cleanEmail,
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
                Your request has been sent to the QAIS Foods team. They will review it and get back to you.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Once approved, you will receive login details automatically. The default password will be <strong>qaisfoods</strong>.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">

        <div className="text-center">
          <QfLogo className="mx-auto w-14 h-14 mb-3" />
          <h1 className="text-2xl font-bold">Request Customer Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your details. Our team will review within 24 hours and create your portal automatically.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input name="full_name" placeholder="Your full name" value={form.full_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Business / Shop Name</Label>
                  <Input name="business_name" placeholder="Optional" value={form.business_name} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input name="phone" type="tel" placeholder="03001234567" value={form.phone} onChange={handleChange} required />
                  <p className="text-xs text-muted-foreground">Used to identify your account</p>
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input name="email" type="email" placeholder="your@gmail.com" value={form.email} onChange={handleChange} required />
                  <p className="text-xs text-muted-foreground">Your login email (portal created with this)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" placeholder="Your city" value={form.city} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" placeholder="Shop / delivery address" value={form.address} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea name="notes" placeholder="Tell us about your business, what products you need..."
                  value={form.notes} onChange={handleChange} rows={3} />
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                After approval, a portal will be created for you with the default password <strong className="text-foreground">qaisfoods</strong>. You can change it after logging in.
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

        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;