import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Receipt,
  CheckCircle2,
  QrCode,
  Store,
  Users,
  Settings,
  LogOut,
  Menu,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout: clearAuth } = useAuth();
  const logoutMutation = useLogout();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const { data: health } = useHealthCheck({
    query: {
      refetchInterval: 30000,
      queryKey: getHealthCheckQueryKey()
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/transaksi", label: "Semua Transaksi", icon: Receipt },
    { href: "/sukses", label: "Transaksi Sukses", icon: CheckCircle2 },
    { href: "/topup", label: "Generate QRIS", icon: QrCode },
    ...(user?.role === "admin" ? [
      { href: "/merchants", label: "Merchants", icon: Store },
      { href: "/users", label: "Users", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings },
    ] : []),
  ];

  const NavLinks = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact 
          ? location === item.href 
          : location.startsWith(item.href);
          
        return (
          <Link key={item.href} href={item.href}>
            <span className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              isActive 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row dark">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="font-bold text-primary-foreground text-lg">V</span>
          </div>
          <span className="font-bold tracking-tight">VERA GATE</span>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="font-bold text-primary-foreground text-lg">V</span>
              </div>
              <span className="font-bold tracking-tight">VERA GATE</span>
            </div>
            <div className="flex-1">
              <NavLinks />
            </div>
            <div className="pt-6 border-t border-border mt-auto">
              <div className="flex items-center gap-3 px-3 py-2 mb-4">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold uppercase">
                  {user?.username?.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.username}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
              </div>
              <Button 
                variant="destructive" 
                className="w-full justify-start" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center shadow-md">
              <span className="font-bold text-primary-foreground text-lg">V</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-widest text-lg leading-none">VERA GATE</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Terminal</span>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-2 px-2 uppercase">Menu</div>
          <NavLinks />
        </div>
        
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-2">
              <Activity className={cn("h-3 w-3", health?.status === "ok" ? "text-green-500" : "text-red-500")} />
              <span className="text-xs text-muted-foreground">System Status</span>
            </div>
            <span className="text-xs font-mono">{health?.status === "ok" ? "ONLINE" : "OFFLINE"}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary border border-secondary-border rounded flex items-center justify-center text-xs font-bold uppercase">
                {user?.username?.substring(0, 2)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none text-sidebar-foreground">{user?.username}</span>
                <span className="text-xs text-muted-foreground capitalize mt-1">{user?.role}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden min-h-0 flex flex-col bg-background">
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
