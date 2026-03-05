import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopNavbar() {
  return (
    <header className="h-14 border-b flex items-center px-4 gap-4 bg-card shrink-0">
      <SidebarTrigger />
      <span className="font-display font-semibold text-sm text-primary">FFCMS</span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <User className="h-4 w-4" />
      </Button>
    </header>
  );
}
