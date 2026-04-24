import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { QfLogo } from "@/components/QfLogo";

/**
 * /auth/callback
 *
 * Supabase redirects here after Google OAuth completes.
 *
 * Flow:
 *  1. Wait for Supabase to write the session from the URL hash.
 *  2. Call finalizeGoogleLogin() which:
 *       a. Checks public.users for a matching profile.
 *       b. Falls back to customers.email lookup for pre-registered customers.
 *       c. Signs out + blocks anyone still unrecognised.
 *  3. Redirect based on role:
 *       - customer  → /portal
 *       - staff     → /dashboard
 *       - unregistered → /login (with error toast)
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const finalizeGoogleLogin = useAuthStore((s) => s.finalizeGoogleLogin);
  const [status, setStatus] = useState("Verifying your account…");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Give Supabase a moment to process the OAuth tokens from the URL hash
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;

      const result = await finalizeGoogleLogin();
      if (cancelled) return;

      if (result.ok) {
        const role = useAuthStore.getState().userRole;

        if (role === "customer") {
          setStatus("Welcome! Taking you to your portal…");
          toast.success("Signed in with Google successfully!");
          navigate("/portal", { replace: true });
        } else if (["admin", "manager", "cashier"].includes(role || "")) {
          setStatus("Welcome back! Redirecting to dashboard…");
          toast.success("Signed in with staff privileges!");
          navigate("/dashboard", { replace: true });
        } else {
          setStatus("Access denied. Redirecting…");
          toast.error("Unrecognised account. Please contact QAIS Foods.");
          navigate("/login", { replace: true });
        }
      } else {
        setStatus("Access denied.");
        toast.error(result.message || "Login failed. Please try again.", {
          duration: 7000,
        });
        navigate("/login", { replace: true });
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-secondary/30">
      <QfLogo className="w-16 h-16" />
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
