import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";
import { PaymentLink } from "@/pages/payment-link";
import { Report } from "@/pages/report";
import { Tools } from "@/pages/tools";
import { Merchant } from "@/pages/merchant";
import { Users } from "@/pages/users";
import { Provider } from "@/pages/provider";
import { PublicTopup } from "@/pages/public-topup";

const queryClient = new QueryClient();

function DarkModeManager() {
  useEffect(() => {
    const saved = localStorage.getItem("vg-theme");
    if (saved === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, []);
  return null;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Login} />

      <Route path="/dashboard">
        <ProtectedLayout><Dashboard /></ProtectedLayout>
      </Route>

      <Route path="/payment-link">
        <ProtectedLayout><PaymentLink /></ProtectedLayout>
      </Route>

      <Route path="/report">
        <ProtectedLayout><Report /></ProtectedLayout>
      </Route>

      <Route path="/tools">
        <AdminLayout><Tools /></AdminLayout>
      </Route>

      <Route path="/users">
        <AdminLayout><Users /></AdminLayout>
      </Route>

      <Route path="/merchant">
        <AdminLayout><Merchant /></AdminLayout>
      </Route>

      <Route path="/merchants">
        <AdminLayout><Merchant /></AdminLayout>
      </Route>

      <Route path="/provider">
        <AdminLayout><Provider /></AdminLayout>
      </Route>

      <Route path="/settings">
        <AdminLayout><Provider /></AdminLayout>
      </Route>

      <Route path="/:merchantSlug" component={PublicTopup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <DarkModeManager />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
