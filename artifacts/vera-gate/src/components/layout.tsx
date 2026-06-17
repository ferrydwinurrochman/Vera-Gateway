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
  Sun,
  Moon,
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
  { href: "/settings", label: "Pengaturan", icon: Cog },
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
  const [location, setLocation] = useLocation();
  const { user, logout: clearAuth } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const [dark, setDark] = useState(() => document.body.classList.contains("dark"));
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
      document.body.classList.add("dark");
      localStorage.setItem("vg-theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("vg-theme", "light");
    }
  };

  const pageTitle = pageTitles[location] || "Dashboard";

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = location === href;
    return (
      <Link href={href} onClick={() => setSideOpen(false)}>
        <span className={`nav${isActive ? " on" : ""}`}>
          <Icon />
          {label}
        </span>
      </Link>
    );
  }

  return (
    <div className="shell">
      {/* Backdrop for mobile */}
      <div
        className={`side-backdrop${sideOpen ? " show" : ""}`}
        onClick={() => setSideOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`side${sideOpen ? " open" : ""}`}>
        {/* Brand */}
        <div className="brand" style={{ padding: "6px 8px 14px" }}>
          <div className="chip">
            <span>VG</span>
          </div>
          <div className="wm">
            VERA GATE
            <small>PAYMENT GATEWAY</small>
          </div>
        </div>

        {/* User badge */}
        <div className="merchant">
          <div className="l">Pengguna aktif</div>
          <div className="n">{user?.username}</div>
        </div>

        {/* Main nav */}
        <div className="grp">Menu</div>
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {/* Admin nav */}
        {user?.role === "admin" && (
          <>
            <div className="grp">Admin</div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Logout at bottom */}
        <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
          <button
            className="nav"
            onClick={handleLogout}
            style={{ width: "100%", color: "var(--red)", border: "none", background: "none" }}
          >
            <LogOut style={{ width: 18, height: 18 }} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="l">
            <button className="hb" onClick={() => setSideOpen(!sideOpen)}>
              <Menu style={{ width: 22, height: 22 }} />
            </button>
            <span>{pageTitle}</span>
          </div>
          <div className="r">
            <span className="pill">{user?.role?.toUpperCase()}</span>
            <span className="ava">{user?.username?.charAt(0).toUpperCase()}</span>
            <button className="tg" onClick={toggleDark} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              {dark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
