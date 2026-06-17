import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

// Pages
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";
import { Transaksi } from "@/pages/transaksi";
import { Sukses } from "@/pages/sukses";
import { Topup } from "@/pages/topup";
import { Merchants } from "@/pages/merchants";
import { Users } from "@/pages/users";
import { Settings } from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Login} />
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/transaksi">
        <ProtectedRoute>
          <Layout>
            <Transaksi />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/sukses">
        <ProtectedRoute>
          <Layout>
            <Sukses />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/topup">
        <ProtectedRoute>
          <Layout>
            <Topup />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/merchants">
        <ProtectedRoute requireAdmin>
          <Layout>
            <Merchants />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute requireAdmin>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute requireAdmin>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      </Route>
      
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
            <div className="dark text-foreground bg-background min-h-screen">
              <Router />
            </div>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
