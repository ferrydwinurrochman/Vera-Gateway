import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Redirect if already logged in
  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter username and password",
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
            title: "Login Failed",
            description: error.error?.error || "Invalid credentials",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark relative overflow-hidden">
      {/* Terminal grid background effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary mx-auto rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(0,120,255,0.3)] mb-4">
            <span className="font-bold text-primary-foreground text-3xl">V</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">VERA GATE</h1>
          <p className="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">Precision Payment Terminal</p>
        </div>
        
        <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Enter your credentials to access the terminal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Operator ID</Label>
                <Input 
                  id="username" 
                  placeholder="admin" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="font-mono bg-background/50 border-input"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passkey</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono bg-background/50 border-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full font-bold tracking-wider uppercase mt-6" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginMutation.isPending ? "Authenticating..." : "Initialize Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-8 font-mono">
          UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED
        </p>
      </div>
    </div>
  );
}
