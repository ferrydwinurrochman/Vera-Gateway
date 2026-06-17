import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { user, isLoading, isFetching } = useAuth();
  const queryClient = useQueryClient();

  const loginMutation = useLogin();

  useEffect(() => {
    if (!isLoading && !isFetching && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, isFetching, setLocation]);

  if (isLoading || isFetching) {
    return (
      <div className="center">
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "var(--blue)" }} />
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username dan password harus diisi");
      return;
    }

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/dashboard");
        },
        onError: (err) => {
          setError((err as any).error?.error || "Username atau password salah");
        },
      }
    );
  };

  return (
    <div className="center">
      <div className="card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: "8px" }}>
          <div className="chip">
            <span>VG</span>
          </div>
        </div>
        <h1>VERA GATE</h1>
        <p className="sub">Payment Gateway Dashboard</p>

        {error && <div className="flash err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 style={{ width: 17, height: 17, animation: "spin 1s linear infinite" }} />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p className="backlink">© {new Date().getFullYear()} VERA GATE</p>
      </div>
    </div>
  );
}
