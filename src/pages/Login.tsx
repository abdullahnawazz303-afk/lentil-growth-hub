import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Leaf, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [emailError, setEmailError]     = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  // ── Simple validation — just check not empty
  const validateEmail = (val: string) => {
    if (!val.trim()) return "Email is required";
    if (!val.includes("@")) return "Enter a valid email address";
    return null;
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required";
    if (val.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setLoading(true);
    const ok = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!ok) {
      toast.error("Incorrect email or password. Please try again.");
      return;
    }

    // Read role from store after login
    const role = useAuthStore.getState().userRole;

    if (role === "customer") {
      toast.success("Welcome! Redirecting to your portal...");
      navigate("/portal", { replace: true });
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md space-y-4">

        <Card className="shadow-xl border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access the management system or your customer portal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateEmail(e.target.value));
                  }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(validatePassword(e.target.value));
                    }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={passwordError ? "border-destructive" : ""}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                  : "Sign In"
                }
              </Button>
            </form>

            {/* Register link */}
            <div className="mt-6 pt-5 border-t text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Customer? Don't have an account yet?
              </p>
              <Link
                to="/register"
                className="text-sm font-medium text-primary hover:underline"
              >
                Create your customer account →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info box */}
        <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground text-sm mb-2">Account Types</p>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
            <p>
              <span className="font-medium text-foreground">Factory Staff</span> —
              Login with your <span className="font-mono text-foreground">@qaisfoods.com</span> email
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <p>
              <span className="font-medium text-foreground">Customers</span> —
              Register first using your factory-registered phone number
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}