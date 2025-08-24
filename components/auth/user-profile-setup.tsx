"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface UserProfile {
  nombre: string;
}

export function UserProfileSetup() {
  const [profile, setProfile] = useState<UserProfile>({
    nombre: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/auth/login");
        return;
      }

      // Verificar si el usuario ya existe en la tabla usuarios
      const { data: existingUser, error: fetchError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("uuid", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows returned, lo cual es esperado para usuarios nuevos
        console.error("Error checking user profile:", fetchError);
      }

      if (existingUser) {
        setUserExists(true);
        // Usuario ya existe, redirigir al dashboard
        router.push("/protected");
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError("Error de autenticación");
        return;
      }

      // Insertar perfil del usuario en la tabla usuarios
      const { error: insertError } = await supabase
        .from("usuarios")
        .insert([
          {
            uuid: user.id,
            email: user.email,
            nombre: profile.nombre,
          },
        ]);

      if (insertError) {
        console.error("Error inserting user profile:", insertError);
        setError("Error al guardar el perfil. Inténtalo de nuevo.");
        return;
      }

      // Perfil guardado exitosamente, redirigir al dashboard
      router.push("/protected");
    } catch (error) {
      console.error("Error saving user profile:", error);
      setError("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  if (userExists) {
    return null; // Ya se redirigirá en useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            👋 ¡Bienvenido al Sistema PIC!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Para completar tu registro, necesitamos algunos datos adicionales
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                Nombre *
              </Label>
              <Input
                id="nombre"
                type="text"
                value={profile.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </div>
                ) : (
                  "Completar Registro"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Al completar este formulario, aceptas nuestros términos y condiciones</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
