import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { User, LogOut, KeyRound, ShieldCheck } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { QfLogo } from "@/components/QfLogo";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function TopNavbar() {
  const logout    = useAuthStore((s) => s.logout);
  const userEmail = useAuthStore((s) => s.userEmail);
  const userRole  = useAuthStore((s) => s.userRole);
  const navigate  = useNavigate();

  const [accountOpen, setAccountOpen] = useState(false);
  const [changingPw, setChangingPw]   = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd          = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;
    const confirm     = fd.get("confirm") as string;

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully");
      setChangingPw(false);
      setAccountOpen(false);
      (e.target as HTMLFormElement).reset();
    }
  };

  // Role display label
  const roleLabel = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : "User";

  return (
    <header className="h-16 border-b flex items-center px-4 gap-4 bg-card shrink-0">
      <SidebarTrigger />

      <QfLogo className="w-11 h-11 shrink-0" />
      <span className="font-semibold text-lg text-primary">Qais Food</span>

      <div className="flex-1" />

      {/* Account Popover */}
      <Popover open={accountOpen} onOpenChange={(v) => { setAccountOpen(v); if (!v) setChangingPw(false); }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            title="Account"
          >
            <User className="h-4 w-4" />
            <span className="text-sm">Account</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0" align="end">
          {!changingPw ? (
            /* ── Profile View ── */
            <div>
              {/* Header */}
              <div className="p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate capitalize">
                      {userEmail?.split('@')[0]?.replace(/[._]/g, ' ') || "Admin User"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account info */}
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium truncate capitalize max-w-[160px]">
                    {userEmail?.split('@')[0]?.replace(/[._]/g, ' ') || "Admin User"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate max-w-[160px]">{userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{roleLabel}</span>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="p-2 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9"
                  onClick={() => setChangingPw(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            /* ── Change Password View ── */
            <div>
              <div className="p-4 border-b flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setChangingPw(false)}
                >
                  ←
                </Button>
                <span className="font-semibold text-sm">Change Password</span>
              </div>

              <form onSubmit={handleChangePassword} className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">New Password</Label>
                  <Input
                    name="newPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirm Password</Label>
                  <Input
                    name="confirm"
                    type="password"
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="sm" disabled={pwLoading}>
                  {pwLoading ? "Saving..." : "Update Password"}
                </Button>
              </form>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Logout button with label */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm">Logout</span>
      </Button>
    </header>
  );
}