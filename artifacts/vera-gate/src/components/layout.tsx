import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Link2,
  FileText,
  Wrench,
  Users,
  Store,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payment-link", label: "Payment Link", icon: Link2 },
  { href: "/report", label: "Report", icon: FileText },
];

const adminNav = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/merchant", label: "Merchant", icon: Store },
  { href: "/provider", label: "Pengaturan Provider", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));

  return (
    <Link href={href} onClick={onClick}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          size={17}
          className={cn(
            "flex-shrink-0 transition-opacity",
            isActive ? "opacity-100" : "opacity-65 group-hover:opacity-100"
          )}
        />
        <span className="flex-1">{label}</span>
        {isActive && <ChevronRight size={14} className="opacity-50" />}
      </span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, logout: clearAuth } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const [dark, setDark] = useState(
    () =>
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
  );
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => { clearAuth(); setLocation("/login"); },
      onError: () => { clearAuth(); setLocation("/login"); },
    });
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("vg-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("vg-theme", "light");
    }
  };

  const closeSide = () => setSideOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      {sideOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeSide}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-transform duration-200 lg:translate-x-0",
          sideOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="VERA GATE" className="h-10 w-auto object-contain" />
          </div>
        </div>

        {/* User pill */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/40">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold uppercase">
                {(user?.username ?? "?").charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.username ?? "User"}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role ?? "operator"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">Menu</p>
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} onClick={closeSide} />
          ))}
          {user?.role === "admin" && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-4 mb-1">Admin</p>
              {adminNav.map((item) => (
                <NavItem key={item.href} {...item} onClick={closeSide} />
              ))}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={toggleDark}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-sm">{dark ? "Light Mode" : "Dark Mode"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span className="text-sm">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSideOpen(!sideOpen)}
            aria-label="Toggle menu"
          >
            {sideOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1 lg:hidden flex items-center gap-2">
            <img src="/logo.png" alt="VERA GATE" className="h-7 w-auto object-contain" />
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.username}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize border border-primary/20">
              {user?.role}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
