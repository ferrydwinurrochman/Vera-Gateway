import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Receipt,
  CheckCircle2,
  QrCode,
  Store,
  Users,
  Cog,
  LogOut,
  Menu,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Semua Transaksi", icon: Receipt },
  { href: "/sukses", label: "Transaksi Sukses", icon: CheckCircle2 },
  { href: "/topup", label: "Generate QRIS", icon: QrCode },
];

const adminItems = [
  { href: "/merchants", label: "Merchant", icon: Store },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/settings", label: "Pengaturan Provider", icon: Cog },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transaksi": "Semua Transaksi",
  "/sukses": "Transaksi Sukses",
  "/topup": "Generate QRIS",
  "/merchants": "Merchant",
  "/users": "User Management",
  "/settings": "Pengaturan Provider",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout: clearAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => clearAuth(),
    });
  };

  const pageTitle = pageTitles[location] || "Dashboard";
  const allItems = user?.role === "admin" ? [...navItems, ...adminItems] : navItems;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? "256px" : "72px",
          backgroundColor: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-4 py-5"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                VERA GATE
              </h1>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                PAYMENT GATEWAY
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.backgroundColor = "var(--muted)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.backgroundColor = "transparent")
            }
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Merchant badge */}
        {sidebarOpen && (
          <div
            className="mx-3 my-3 px-3 py-2.5 rounded-lg"
            style={{
              backgroundColor: "rgba(0, 102, 204, 0.1)",
              border: "1px solid rgba(0, 102, 204, 0.3)",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Merchant
            </p>
            <p className="font-bold text-sm" style={{ color: "var(--primary)" }}>
              VERA GATE
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href}>
                <span
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium"
                  style={{
                    backgroundColor: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--muted)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </span>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <>
              {sidebarOpen && (
                <div
                  className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Admin
                </div>
              )}
              {adminItems.map(({ href, label, icon: Icon }) => {
                const isActive = location === href || location.startsWith(href + "/");
                return (
                  <Link key={href} href={href}>
                    <span
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium"
                      style={{
                        backgroundColor: isActive ? "var(--primary)" : "transparent",
                        color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--muted)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && <span>{label}</span>}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div
          className="p-3 space-y-2"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          {sidebarOpen && (
            <div className="px-2 mb-2">
              <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                {user?.username}
              </p>
              <p className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
                {user?.role} • Asia/Jakarta
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            style={{ color: "var(--destructive)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                "rgba(239, 68, 68, 0.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
            }
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? "256px" : "72px" }}
      >
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{
            backgroundColor: "var(--card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {pageTitle}
          </h2>
          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Bell className="w-5 h-5" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--destructive)" }}
              />
            </button>
            <span
              className="px-3 py-1 text-xs font-bold rounded-full"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
