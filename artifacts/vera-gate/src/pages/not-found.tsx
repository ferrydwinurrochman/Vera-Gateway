import React from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm shadow-sm text-center">
        <CardContent className="pt-8 pb-8">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
          <p className="text-base font-semibold mb-1">Halaman Tidak Ditemukan</p>
          <p className="text-sm text-muted-foreground mb-6">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-2" />
              Kembali ke Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
