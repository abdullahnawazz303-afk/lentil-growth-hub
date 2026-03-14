import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Leaf, CheckCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Registration flow:
//  1. Admin creates customer record (Customers page) — no auth yet
//  2. Customer visits /register, enters phone + email + password
//  3. We verify phone exists in customers table
//  4. We call supabase.auth.signUp with metadata: role, customer_id
//  5. handle_new_user DB trigger creates public.users row
//  6. Redirect to /login with success message
//
//  IMPORTANT: Email confirmation must be DISABLED in Supabase
//  Auth → Settings → Email → Disable "Enable email confirmations"
// ─────────────────────────────────────────────────────────────

const Register = () => {
  const navigate = useNavigate();

  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [customerName, setCustomerName] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side validation
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (email.toLowerCase().includes("@qaisfoods.com")) {
      toast.error("Customer accounts cannot use a @qaisfoods.com email");
      return;
    }

    setLoading(true);

    // ── Step 1: Find customer record by phone number
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const { data: customerRow, error: lookupErr } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", cleanPhone)
      .eq("is_active", true)
      .maybeSingle();

    if (lookupErr || !customerRow) {
      toast.error(
        "No account found for this phone number. Please contact the factory to register you first.",
        { duration: 6000 }
      );
      setLoading(false);
      return;
    }

    // ── Step 2: Check if auth account already exists for this customer
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("customer_id", customerRow.id)
      .maybeSingle();

    if (existingUser) {
      toast.error(
        "An account is already registered for this phone number. Please login instead.",
        { duration: 6000 }
      );
      setLoading(false);
      return;
    }

    // ── Step 3: Create Supabase auth account
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: customerRow.name,
          role: "customer",
          account_type: "customer",
          customer_id: customerRow.id,
        },
      },
    });

    if (signUpErr) {
      // Handle common errors with friendly messages
      if (signUpErr.message.includes("already registered")) {
        toast.error("This email is already registered. Please login instead.");
      } else {
        toast.error(signUpErr.message ?? "Registration failed. Please try again.");
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      toast.error("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // ── Step 4: Update public.users with customer_id
    // The handle_new_user trigger creates the row but may not set customer_id
    // This ensures it is always set correctly
    await supabase
      .from("users")
      .update({
        customer_id: customerRow.id,
        role: "customer",
        account_type: "customer",
      })
      .eq("id", authData.user.id);

    setLoading(false);
    setCustomerName(customerRow.name);
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
              <h2 className="text-xl font-bold">Account Created!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, <span className="font-medium text-foreground">{customerName}</span>!
                Your account has been successfully created.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate("/login")}
            >
              Login Now →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Create Customer Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register using your phone number registered with the factory
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must match the number registered with the factory
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be your login email
                </p>
              </div>

              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</>
                  : "Create Account"
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Already have an account? Login
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Don't have a registered phone number?{" "}
          <a
            href="https://wa.me/923001234567"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline"
          >
            Contact factory on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;