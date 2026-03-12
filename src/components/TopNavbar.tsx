import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User, LogOut } from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export function TopNavbar() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="h-16 border-b flex items-center px-4 gap-4 bg-card shrink-0">
      <SidebarTrigger />
      <img src={qfLogo} alt="QF" className="w-9 h-9 object-contain" />
      <span className="font-display font-bold text-lg text-primary">Qais Food</span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <User className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
