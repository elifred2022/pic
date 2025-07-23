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

export function CrearFormArticulo({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [articulo, setArticulo] = useState("");
  const [codint, setCodint] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [existencia, setExistencia] = useState("");
  const [provsug, setProvsug] = useState("");
  const [codprovsug, setCodprovsug] = useState("");
  const [familia, setFamilia] = useState("");
  const [situacion, setSituacion] = useState("");
   const [cc, setCc] = useState("");
   const [costunit, setCostUnit] = useState("");
   const [divisa, setDivisa] = useState("");

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

  // Paso 1: Verificar si ya existe el codigo interno para cuidar no repeticion
  const { data: existing, error: fetchError } = await supabase
    .from("articulos")
    .select("id")
    .eq("codint", codint)
    .maybeSingle(); // trae uno o null

  if (fetchError) {
    console.error("Error al verificar Codigo interno:", fetchError);
    setError("Error al verificar Codigo interno existente.");
    setIsLoading(false);
    return;
  }

  if (existing) {
    setError("Este Cod. int. ya está registrado.");
    setIsLoading(false);
    return;
  }

  // Paso 2: Insertar si no existe
  const { error: insertError } = await supabase
    .from("articulos")
    .insert([
      {
        codint,
        articulo,
        descripcion,
        cc,
        existencia,
        costunit,
        divisa,
        provsug,
        codprovsug,
        familia,
        situacion,
        uuid: user?.id,
      },
    ]);

  setIsLoading(false);

  if (insertError) {
    console.error("Error al insertar:", insertError);
    setError("Hubo un error al crear el articulo.");
  } else {
    router.push("/auth/lista-articulos");
  }
};


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear articulo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCrear} className="flex flex-col gap-6">

              <div className="grid gap-2">
              <Label htmlFor="codint">Codigo interno</Label>
              <Input
                id="codint"
                type="text"
                required
                value={codint}
                onChange={(e) => setCodint(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="articulo">Articulo</Label>
              <Input
                id="articulo"
                type="text"
                required
                value={articulo}
                onChange={(e) => setArticulo(e.target.value)}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Input
                id="descripcion"
                type="text"
              
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="cc">Cod. cta.</Label>
              <Input
                id="cc"
                type="text"
             
                inputMode="numeric"
                pattern="[0-9]*"
                value={cc}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) setCc(value);
                }}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="existencia">Existencia</Label>
              <Input
                id="existencia"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={existencia}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) setExistencia(value);
                }}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="costunit">Costo unit</Label>
              <Input
                id="costunit"
                type="text"
             
                inputMode="numeric"
                pattern="[0-9]*"
                value={costunit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) setCostUnit(value);
                }}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="divisa">Divisa</Label>
              <select
                id="divisa"
               
                value={divisa}
                onChange={(e) => setDivisa(e.target.value)}
                className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
              >
                <option value="">Seleccione divisa</option>
                <option value="Ars">Ars</option>
                <option value="Usd">Usd</option>
                <option value="Eur">Eur</option>
              </select>
            </div>

             

             <div className="grid gap-2">
              <Label htmlFor="provsug">Prov. sugerido</Label>
              <Input
                id="provsug"
                type="text"
            
                value={provsug}
                onChange={(e) => setProvsug(e.target.value)}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="codprovsug">Cod. Prov. sugerido</Label>
              <Input
                id="codprovsug"
                type="text"
              
                value={codprovsug}
                onChange={(e) => setCodprovsug(e.target.value)}
              />
            </div>
           
            <div className="grid gap-2">
              <Label htmlFor="familia">Familia</Label>
              <Input
                id="familia"
                type="text"
                required
                value={familia}
                onChange={(e) => setFamilia(e.target.value)}
              />
            </div>

             <div className="grid gap-2">
              <Label htmlFor="situacion">Situación</Label>
              <select
                id="situacion"
                required
                value={situacion}
                onChange={(e) => setSituacion(e.target.value)}
                className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
              >
                <option value="">Seleccione situación</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
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
