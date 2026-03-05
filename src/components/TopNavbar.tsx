import { Bell, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mockNotifications } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

export function TopNavbar() {
  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="font-display font-semibold text-foreground hidden sm:block">
          Lentil Factory Operations
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {mockNotifications.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b font-semibold text-sm">Notifications</div>
            <div className="max-h-64 overflow-auto">
              {mockNotifications.map((n) => (
                <div key={n.id} className="p-3 border-b last:border-0 hover:bg-muted/50">
                  <div className="flex items-start gap-2">
                    <Badge variant={n.type === "error" ? "destructive" : n.type === "warning" ? "outline" : "secondary"} className="shrink-0 mt-0.5 text-[10px]">
                      {n.type}
                    </Badge>
                    <div>
                      <p className="text-xs">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
