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
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // Verificar sesión al cargar el componente
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log("🔍 Checking session for password reset:", { user: !!user, error: error?.message });
        
        if (error) {
          console.error("❌ Session check error:", error);
          setError("Sesión inválida. Por favor, solicita un nuevo enlace de recuperación.");
          setIsValidSession(false);
        } else if (user) {
          console.log("✅ Valid session found for user:", user.email);
          setIsValidSession(true);
          setUserEmail(user.email || null);
        } else {
          console.log("❌ No user session found");
          setError("Sesión inválida. Por favor, solicita un nuevo enlace de recuperación.");
          setIsValidSession(false);
        }
      } catch (error) {
        console.error("❌ Session check error:", error);
        setError("Error al verificar la sesión.");
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Resetting password...");
      const { error } = await supabase.auth.updateUser({ password });
      
      console.log("🔍 Password reset result:", { error: error?.message });
      
      if (error) throw error;
      
      console.log("✅ Password reset successfully");
      // Cerrar sesión y redirigir al login
      await supabase.auth.signOut();
      router.push("/auth/login?message=password-reset-success");
    } catch (error: unknown) {
      console.error("❌ Password reset error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Verificando sesión...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">Sesión Inválida</CardTitle>
            <CardDescription>
              No se pudo verificar tu sesión. Por favor, solicita un nuevo enlace de recuperación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
            <Button onClick={() => router.push("/auth/forgot-password")} className="w-full">
              Solicitar nuevo enlace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>
            {userEmail && `Para: ${userEmail}`}
            <br />
            Ingresa tu nueva contraseña a continuación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nueva contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmar contraseña"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Restableciendo..." : "Restablecer contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
