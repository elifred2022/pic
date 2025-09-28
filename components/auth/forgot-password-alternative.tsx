"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordAlternative({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Sending password reset email to:", email);
      
      // Usar el método correcto de Supabase para recuperación de contraseña
      // con URL absoluta para evitar redirecciones incorrectas
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      console.log("🔍 Using redirect URL:", redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      console.log("🔍 Password reset result:", { error: error?.message });
      
      if (error) {
        // Si hay error, intentar con método alternativo
        console.log("🔄 Trying alternative method...");
        const { error: altError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: redirectUrl,
          }
        });
        
        if (altError) throw altError;
      }
      
      setSuccess(true);
      console.log("✅ Password reset email sent successfully");
    } catch (error: unknown) {
      console.error("❌ Password reset error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Email Enviado</CardTitle>
            <CardDescription>
              Te hemos enviado un enlace de recuperación a tu email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
            <div className="mt-4">
              <Button 
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                variant="outline"
                className="w-full"
              >
                Enviar otro email
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu email para recibir un enlace de recuperación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  required
                />
              </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              ¿Recordaste tu contraseña?{" "}
              <Link href="/auth/login" className="underline">
                Iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
