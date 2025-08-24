"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CrearFormProveedor({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [nombreprov, setNombreProv] = useState("");
  const [cuitprov, setCuitProv] = useState("");
  const [direccionprov, setDireccionProv] = useState("");
  const [emailprov, setEmailprov] = useState("");
  const [telefonoprov, setTelefonoProv] = useState("");
  const [contactoprov, setContactoProv] = useState("");
  const [activoprov, setActivoProv] = useState("");
  const [codintprov, setCodintprov] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const handleCrear = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Paso 1: Verificar si ya existe el cuit
  const { data: existing, error: fetchError } = await supabase
    .from("proveedor")
    .select("id")
    .eq("cuitprov", cuitprov)
    .maybeSingle(); // trae uno o null

  if (fetchError) {
    console.error("Error al verificar CUIT:", fetchError);
    setError("Error al verificar CUIT existente.");
    setIsLoading(false);
    return;
  }

  if (existing) {
    setError("Este CUIT ya está registrado.");
    setIsLoading(false);
    return;
  }

  // Paso 2: Insertar si no existe
  const { error: insertError } = await supabase
    .from("proveedor")
    .insert([
      {
        codintprov,
        nombreprov,
        cuitprov,
        direccionprov,
        emailprov,
        telefonoprov,
        contactoprov,
        activoprov,
        uuid: user?.id,
      },
    ]);

  setIsLoading(false);

  if (insertError) {
    console.error("Error al insertar:", insertError);
    setError("Hubo un error al crear el proveedor.");
  } else {
    router.push("/auth/listaproveedores");
  }
};


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registro de proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCrear} className="flex flex-col gap-6">

             <div className="grid gap-2">
              <Label htmlFor="codintprov">Codigo interno de proveedor</Label>
              <Input
                id="codintprov"
                type="text"
                required
                value={codintprov}
                onChange={(e) => setCodintprov(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nombreprov">Nombre de proveedor</Label>
              <Input
                id="nombreprov"
                type="text"
                required
                value={nombreprov}
                onChange={(e) => setNombreProv(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cuitprov">CUIT</Label>
              <Input
                id="cuitprov"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={cuitprov}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) setCuitProv(value);
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="direccionprov">Dirección</Label>
              <Input
                id="direccionprov"
                type="text"
                value={direccionprov}
                onChange={(e) => setDireccionProv(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emailprov">Email</Label>
              <Input
                id="emailprov"
                type="email"
                value={emailprov}
                onChange={(e) => setEmailprov(e.target.value)}
                placeholder="ejemplo@proveedor.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefonoprov">Teléfono</Label>
              <Input
                id="telefonoprov"
                type="text"
                value={telefonoprov}
                onChange={(e) => setTelefonoProv(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactoprov">Contacto</Label>
              <Input
                id="contactoprov"
                type="text"
                value={contactoprov}
                onChange={(e) => setContactoProv(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activoprov">Situación</Label>
              <select
                id="activoprov"
                required
                value={activoprov}
                onChange={(e) => setActivoProv(e.target.value)}
                className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
              >
                <option value="">Seleccione situación</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Cargando..." : "Crear"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
