import {
  LayoutDashboard, Package, ShoppingCart, Users, BookOpen,
  Wallet, Landmark, FileText, BarChart3, Store, CreditCard, Globe, Trash2
} from "lucide-react";
import qfLogo from "@/assets/qf-logo.png";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Customer Ledger", url: "/customer-ledger", icon: BookOpen },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Vendor Ledger", url: "/vendor-ledger", icon: BookOpen },
  { title: "Advance Bookings", url: "/advance-bookings", icon: FileText },
  { title: "Bank & Cheques", url: "/bank-cheques", icon: CreditCard },
  { title: "Daily Cash Flow", url: "/cash-flow", icon: Wallet },
  { title: "Waste Management", url: "/waste", icon: Trash2 },
  { title: "Online Orders", url: "/online-orders", icon: Globe },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="overflow-hidden">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={qfLogo} alt="QF Logo" className="w-10 h-10 object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-base text-sidebar-primary">Qais Food</span>
              <span className="text-[11px] font-medium text-sidebar-foreground/60">Pulses &amp; Rice</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-none">
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.slice(0, 5).map((item) => {
                const isActive = location.pathname === item.url || (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} className={cn(isActive && "bg-sidebar-accent text-sidebar-primary font-medium")}>
                        <item.icon className="h-4 w-4 mr-2 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.slice(5).map((item) => {
                const isActive = location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} className={cn(isActive && "bg-sidebar-accent text-sidebar-primary font-medium")}>
                        <item.icon className="h-4 w-4 mr-2 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
