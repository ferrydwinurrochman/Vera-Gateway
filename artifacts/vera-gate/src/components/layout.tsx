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
  X,
  ChevronRight,
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
    clearAuth();
    logoutMutation.mutate(undefined);
  };

  const pageTitle = pageTitles[location] || "Dashboard";

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = location === href || (href !== "/dashboard" && location.startsWith(href + "/"));
    return (
      <Link href={href}>
        <span
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium group"
          style={{
            background: isActive
              ? "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(29,78,216,0.2) 100%)"
              : "transparent",
            color: isActive ? "#93c5fd" : "rgba(232,237,243,0.5)",
            borderLeft: isActive ? "2px solid rgba(96,165,250,0.8)" : "2px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "rgba(232,237,243,0.8)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(232,237,243,0.5)";
            }
          }}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span className="flex-1">{label}</span>}
          {sidebarOpen && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
        </span>
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? "260px" : "68px",
          background: "linear-gradient(180deg, #080f1d 0%, #0a1628 50%, #0b1a30 100%)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center px-4 py-5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            minHeight: "68px",
            gap: sidebarOpen ? "0" : "0",
            justifyContent: sidebarOpen ? "space-between" : "center",
          }}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.4)",
                }}
              >
                <span className="text-white font-black text-xs">VG</span>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wide" style={{ color: "#e8edf3" }}>
                  VERA GATE
                </h1>
                <p className="text-xs" style={{ color: "rgba(232,237,243,0.35)", letterSpacing: "0.1em" }}>
                  PAYMENT GATEWAY
                </p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 12px rgba(59,130,246,0.4)",
              }}
            >
              <span className="text-white font-black text-xs">VG</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "rgba(232,237,243,0.4)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(232,237,243,0.8)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(232,237,243,0.4)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* User badge */}
        {sidebarOpen && (
          <div
            className="mx-3 my-3 px-3 py-3 rounded-xl"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(29,78,216,0.4) 100%)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#e8edf3" }}>
                  {user?.username}
                </p>
                <p className="text-xs capitalize" style={{ color: "rgba(232,237,243,0.45)" }}>
                  {user?.role} · Jakarta
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {user?.role === "admin" && (
            <>
              {sidebarOpen && (
                <div
                  className="px-3 pt-5 pb-2 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "rgba(232,237,243,0.25)" }}
                >
                  Admin
                </div>
              )}
              {!sidebarOpen && <div className="my-2 mx-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />}
              {adminItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
            style={{
              color: "rgba(248,113,113,0.7)",
              background: "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.7)";
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 flex flex-col transition-all duration-300 min-h-screen"
        style={{ marginLeft: sidebarOpen ? "260px" : "68px" }}
      >
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 px-6 flex items-center justify-between"
          style={{
            height: "68px",
            background: "rgba(13,27,42,0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold leading-none" style={{ color: "#e8edf3" }}>
                {pageTitle}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(232,237,243,0.35)" }}>
                Vera Gate · Payment Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 text-xs font-bold rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.2) 100%)",
                color: "#93c5fd",
                border: "1px solid rgba(59,130,246,0.3)",
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
