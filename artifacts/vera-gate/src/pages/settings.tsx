import React, { useState, useEffect } from "react";
import { 
  useGetSettings, 
  getGetSettingsQueryKey,
  useUpdateSettings
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings2, Loader2, Save, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    flypayAppId: "",
    flypaySecret: "",
    flypayMode: "sandbox" as any,
    callbackBaseUrl: "",
    cooldownMinutes: 20
  });

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const updateMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) {
      setFormData({
        flypayAppId: settings.flypayAppId || "",
        flypaySecret: "", // Never exposed
        flypayMode: settings.flypayMode || "sandbox",
        callbackBaseUrl: settings.callbackBaseUrl || "",
        cooldownMinutes: settings.cooldownMinutes || 20
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      flypayAppId: formData.flypayAppId,
      flypayMode: formData.flypayMode,
      callbackBaseUrl: formData.callbackBaseUrl,
      cooldownMinutes: Number(formData.cooldownMinutes)
    };
    
    if (formData.flypaySecret) {
      payload.flypaySecret = formData.flypaySecret;
    }

    updateMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: "Configuration Updated", description: "System settings have been successfully applied." });
          setFormData(prev => ({ ...prev, flypaySecret: "" }));
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: (err) => {
          toast({ 
            title: "Update Failed", 
            description: err.error?.error || "Could not save configuration", 
            variant: "destructive" 
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground text-sm">Core parameters for payment gateway integration</p>
      </div>

      <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Critical Infrastructure</AlertTitle>
        <AlertDescription>
          Modifying these values affects all live transactions. Ensure Flypay credentials match the correct environment.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Flypay Provider Configuration
              </CardTitle>
              <CardDescription>Upstream connection details for QRIS generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flypayMode">Operation Mode</Label>
                <Select 
                  value={formData.flypayMode} 
                  onValueChange={(val: any) => setFormData({...formData, flypayMode: val})}
                >
                  <SelectTrigger className={`font-bold uppercase tracking-wider ${formData.flypayMode === 'live' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'}`}>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">SANDBOX (TESTING)</SelectItem>
                    <SelectItem value="live" className="text-red-500 font-bold">LIVE (PRODUCTION)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="flypayAppId">Application ID / Identifier</Label>
                <Input 
                  id="flypayAppId" 
                  value={formData.flypayAppId}
                  onChange={e => setFormData({...formData, flypayAppId: e.target.value})}
                  className="font-mono bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flypaySecret">Secret Key (leave blank to keep current)</Label>
                <Input 
                  id="flypaySecret" 
                  type="password"
                  value={formData.flypaySecret}
                  onChange={e => setFormData({...formData, flypaySecret: e.target.value})}
                  className="font-mono bg-background/50"
                  placeholder="••••••••••••••••••••••••"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Platform Behavior</CardTitle>
              <CardDescription>Gateway routing and restriction parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="callbackBaseUrl">Base Callback URL</Label>
                <Input 
                  id="callbackBaseUrl" 
                  type="url"
                  value={formData.callbackBaseUrl}
                  onChange={e => setFormData({...formData, callbackBaseUrl: e.target.value})}
                  className="font-mono bg-background/50"
                  placeholder="https://your-domain.com"
                  required
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Target for incoming Flypay webhooks</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownMinutes">Anti-Spam Cooldown (Minutes)</Label>
                <Input 
                  id="cooldownMinutes" 
                  type="number"
                  min="1"
                  max="60"
                  value={formData.cooldownMinutes}
                  onChange={e => setFormData({...formData, cooldownMinutes: parseInt(e.target.value) || 20})}
                  className="font-mono bg-background/50"
                  required
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Time required before generating a new QRIS for same customer while MENUNGGU</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border mt-4 py-4 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto font-bold uppercase tracking-widest">
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Commit Configuration
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
