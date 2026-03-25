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

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError]     = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const login           = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const navigate        = useNavigate();

  // ── Simple validation
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

    const role = useAuthStore.getState().userRole;

    if (role === "customer") {
      toast.success("Welcome! Redirecting to your portal...");
      navigate("/portal", { replace: true });
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    // This triggers the OAuth redirect — page will leave, so no need to reset loading
    await loginWithGoogle();
    // If we somehow get here (popup blocked etc.), reset
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md space-y-4">

        <Card className="shadow-xl border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl ">Welcome Back</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              Sign in to access the management system or your customer portal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* ── Google Sign-In (customers) ── */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-2 mb-4"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <GoogleIcon />
              }
              Continue with Google
            </Button>

            {/* ── Divider ── */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground select-none">
                  or sign in with email
                </span>
              </div>
            </div>

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

              <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading}>
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
              Login with your <span className="font-mono text-foreground">@qaisfoods.com</span> email & password
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <p>
              <span className="font-medium text-foreground">Customers</span> —
              Sign in with Google or use your email & password
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}