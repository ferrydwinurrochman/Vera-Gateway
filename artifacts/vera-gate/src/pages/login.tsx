import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useLogin();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Username dan password harus diisi",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Login Gagal",
            description: (error as any).error?.error || "Username atau password salah",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <span
              className="font-bold text-3xl"
              style={{ color: "var(--primary-foreground)" }}
            >
              V
            </span>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            VERA GATE
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Payment Gateway Dashboard
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-6 shadow-2xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Masuk ke Akun
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--muted-foreground)" }}
          >
            Masukkan kredensial Anda untuk melanjutkan
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="vera-label">Username</label>
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="vera-input"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="vera-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vera-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          © {new Date().getFullYear()} VERA GATE. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
