import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Leaf, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

// Google G icon (inline SVG — no extra dependency needed)
const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [customerName, setCustomerName] = useState("");

  // ── Google sign-up: same OAuth flow as login — /auth/callback handles the rest
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    await loginWithGoogle();
    setGoogleLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (password.length < 6)  { toast.error("Password must be at least 6 characters"); return; }
    if (email.toLowerCase().includes("@qaisfoods.com")) {
      toast.error("Customer accounts cannot use a @qaisfoods.com email"); return;
    }
    setLoading(true);
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const { data: customerRow, error: lookupErr } = await supabase
      .from("customers").select("id, name").eq("phone", cleanPhone).eq("is_active", true).maybeSingle();
    if (lookupErr || !customerRow) {
      const { data: requestRow } = await supabase
        .from("customer_requests").select("status").eq("phone", cleanPhone).maybeSingle();
      if (requestRow?.status === "Pending") {
        toast.error("Your request is still pending review. You will be able to register once approved.", { duration: 6000 });
      } else if (requestRow?.status === "Rejected") {
        toast.error("Your request was rejected. Please contact the factory for more information.", { duration: 6000 });
      } else {
        toast.error("No account found for this phone number. Submit a request first.", { duration: 6000 });
      }
      setLoading(false); return;
    }
    const { data: existingUser } = await supabase
      .from("users").select("id").eq("customer_id", customerRow.id).maybeSingle();
    if (existingUser) {
      toast.error("An account is already registered for this phone number. Please login instead.", { duration: 6000 });
      setLoading(false); return;
    }
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { name: customerRow.name, role: "customer", account_type: "customer", customer_id: customerRow.id } },
    });
    let userId = authData.user?.id;

    if (signUpErr) {
      if (signUpErr.message.includes("already registered")) {
        // Attempt to log them in seamlessly with the password they provided
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        
        if (signInErr || !signInData.user) {
          toast.error("This email is already registered, but the password provided was incorrect. Please try logging in.");
          setLoading(false); return;
        }
        
        userId = signInData.user.id;
        // Optionally notify them that we recovered their account
        toast.success("Account recovered. Linking to your approved profile...");
      } else {
        toast.error(signUpErr.message ?? "Registration failed. Please try again.");
        setLoading(false); return;
      }
    }

    if (!userId) { toast.error("Registration failed. Please try again."); setLoading(false); return; }
    
    // Safely upsert the user record in public.users to ensure it exists
    await supabase.from("users").upsert({ 
      id: userId,
      customer_id: customerRow.id, 
      role: "customer", 
      account_type: "customer",
      name: customerRow.name,
      email: email.trim().toLowerCase()
    });

    // Save the email to the customers table to enable auto-linking in the future
    await supabase.from("customers").update({ email: email.trim().toLowerCase() }).eq("id", customerRow.id);

    setLoading(false); setCustomerName(customerRow.name); setSuccess(true);
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
              <h2 className="text-2xl font-bold">Account Created!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, <span className="font-medium text-foreground">{customerName}</span>! Your account has been successfully created.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/login")}>Login Now →</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Create Customer Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign up with Google or register with your phone number
          </p>
        </div>

        {/* ── Google Sign-Up ── */}
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading}
        >
          {googleLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <GoogleIcon />
          }
          Sign up with Google
        </Button>

        {/* ── Divider ── */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-muted/30 px-2 text-muted-foreground select-none">
              or register with phone number
            </span>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input type="tel" placeholder="03001234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Must be approved by the factory first</p>
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</> : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
            Not approved yet?{" "}
            <Link to="/request-access" className="text-primary font-medium hover:underline">Submit a request →</Link>
          </div>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Already have an account? Login
          </Link>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Need help?{" "}
          <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
            Contact factory on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;