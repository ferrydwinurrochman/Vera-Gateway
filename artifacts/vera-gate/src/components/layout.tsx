import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";

function NavIcon({ paths }: { paths: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ width: 18, height: 18, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

const IC: Record<string, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  "payment-link": '<path d="M9 12a4 4 0 014-4h2a4 4 0 010 8h-1M15 12a4 4 0 01-4 4H9a4 4 0 010-8h1"/>',
  report: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 13v3M12 11v5M15 9v7"/>',
  tools: '<path d="M14 7a4 4 0 01-5 5l-5 5 2 2 5-5a4 4 0 005-5z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 7a3 3 0 010 6M21 20c0-2.4-1.6-4.2-4-4.8"/>',
  merchant: '<path d="M4 9l1-5h14l1 5M4 9h16v2a4 4 0 01-8 0 4 4 0 01-8 0V9z"/><path d="M5 13v7h14v-7"/>',
  provider: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.8 7.8 0 000-2l2-1.5-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1L14.8 3h-3.6l-.5 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 000 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 001.7 1l.5 2.6h3.6l.5-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.4-2-1.5z"/>',
};

const mainNav = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/payment-link", label: "Payment Link", key: "payment-link" },
  { href: "/report", label: "Report", key: "report" },
];

const adminNav = [
  { href: "/tools", label: "Tools", key: "tools" },
  { href: "/users", label: "User Management", key: "users" },
  { href: "/merchant", label: "Merchant", key: "merchant" },
  { href: "/provider", label: "Pengaturan Provider", key: "provider" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/payment-link": "Payment Link",
  "/report": "Report",
  "/tools": "Tools",
  "/users": "User Management",
  "/merchant": "Merchant",
  "/provider": "Pengaturan Provider",
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

  function NavLink({ href, label, navKey }: { href: string; label: string; navKey: string }) {
    const isActive = location === href;
    return (
      <Link href={href} onClick={() => setSideOpen(false)}>
        <span className={`nav${isActive ? " on" : ""}`}>
          <NavIcon paths={IC[navKey]} />
          <span>{label}</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="shell">
      <div className={`side-backdrop${sideOpen ? " show" : ""}`} onClick={() => setSideOpen(false)} />

      <aside className={`side${sideOpen ? " open" : ""}`} id="sideNav">
        <div className="brand">
          <span className="chip"><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.5px", color: "#fff" }}>VG</span></span>
          <span className="wm">VERA GATE<small>PAYMENT GATEWAY</small></span>
        </div>

        <div className="merchant">
          <div className="l">Merchant</div>
          <div className="n">VERA GATE</div>
        </div>

        {mainNav.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} navKey={item.key} />
        ))}

        {user?.role === "admin" && (
          <>
            <div className="grp">Admin</div>
            {adminNav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} navKey={item.key} />
            ))}
          </>
        )}

        <div style={{ marginTop: "auto", fontSize: 11, color: "var(--muted)", padding: "12px" }}>
          Version 1.0 · Asia/Jakarta<br />VERA GATE © {new Date().getFullYear()}
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="hb" id="hbBtn" aria-label="Menu" onClick={() => setSideOpen(!sideOpen)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="brand">
            <span className="chip"><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.5px", color: "#fff" }}>VG</span></span>
            <span className="wm" style={{ color: "#fff" }}>VERA GATE<small style={{ color: "rgba(255,255,255,.7)" }}>PRODUCTION</small></span>
          </div>
          <div className="r">
            <span className="pill">PRODUCTION</span>
            <span className="tg" id="themeBtn" title="Mode malam" onClick={toggleDark} style={{ cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
              </svg>
            </span>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{user?.username ?? "Admin"}</span>
            <span className="pill" style={{ textTransform: "capitalize" }}>{user?.role}</span>
            <span className="ava">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
              </svg>
            </span>
            <button
              onClick={handleLogout}
              style={{ color: "#fff", opacity: 0.85, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
            >
              Keluar
            </button>
          </div>
        </div>

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
