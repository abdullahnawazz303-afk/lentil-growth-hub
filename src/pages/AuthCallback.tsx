import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Leaf, Loader2 } from "lucide-react";

/**
 * /auth/callback
 *
 * Supabase redirects here after Google OAuth completes.
 * We check the session and decide where to send the user:
 *   • Customer  → /portal
 *   • Anyone else → sign out + toast + /login
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const finalizeGoogleLogin = useAuthStore((s) => s.finalizeGoogleLogin);
  const [status, setStatus] = useState("Verifying your account…");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Small delay to let Supabase finish writing the session from the URL hash
      await new Promise((r) => setTimeout(r, 800));

      if (cancelled) return;

      const result = await finalizeGoogleLogin();

      if (cancelled) return;

      if (result.ok) {
        const role = useAuthStore.getState().userRole;
        if (role === "customer") {
          setStatus("Welcome! Redirecting to your portal…");
          toast.success("Signed in with Google successfully!");
          navigate("/portal", { replace: true });
        } else {
          setStatus("Welcome back! Redirecting to dashboard…");
          toast.success("Signed in with Google successfully!");
          navigate("/dashboard", { replace: true });
        }
      } else {
        toast.error(result.message, { duration: 6000 });
        navigate("/login", { replace: true });
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-secondary/30">
      {/* Brand mark */}
      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg">
        <Leaf className="h-7 w-7 text-primary-foreground" />
      </div>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
