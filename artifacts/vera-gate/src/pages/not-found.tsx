import React from "react";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="vera-card w-full max-w-md p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AlertCircle className="h-8 w-8" style={{ color: "#f87171" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            404 — Halaman Tidak Ditemukan
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
      </div>
    </div>
  );
}
