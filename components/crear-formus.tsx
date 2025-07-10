"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client"; // debe devolver un cliente ya autenticado
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

export function CrearFormUs({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [necesidad, setNecesidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [solicita, setSolicita] = useState("");
  const [sector, setSector] = useState("");
  const [cc, setCc] = useState("");
 const [cant, setCant] = useState("");
 const [cant_exist, setCant_exist] = useState("");
 const [articulo, setArticulo] = useState("");
 const [descripcion, setDescripcion] = useState("");
 const [aprueba, setAprueba] = useState("");
 
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient(); // crea el cliente conectado

function parseNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}



  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const {
  data: { user },
} = await supabase.auth.getUser();

    const { error } = await supabase
      .from("pic") // 🔁 CAMBIA ESTO con el nombre real de tu tabla
      .insert([
        {
         
          necesidad: necesidad,
          categoria,
          solicita,
          sector,
          cc: parseNumber(cc),
          cant: parseNumber(cant),
          cant_exist: parseNumber(cant_exist),
          articulo,
          descripcion,
          aprueba,
          uuid: user?.id,
  
        },
      ]);

    setIsLoading(false);

    if (error) {
      console.error("Error al insertar:", error);
      setError("Hubo un error al crear el pedido.");
    } else {
      // redirecciona o resetea formulario
      router.push("/protected"); // 🔁 O la ruta que prefieras después de crear
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cargue su pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCrear}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="necesidad">Fecha de necesidad</Label>
                <Input
                  id="necesidad"
                  type="date"
                  required
                  value={necesidad}
                  onChange={(e) => setNecesidad(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <select
                      id="categoria"
                      required
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
                    >
                      <option value="">Seleccione categoria</option>
                      <option value="Programado">Programado</option>
                      <option value="Urgente">Urgente</option>
                     
                    </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="solicita">Solicita</Label>
                <Input
                  id="solicita"
                  type="text"
                  required
                  value={solicita}
                  onChange={(e) => setSolicita(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                    <Label htmlFor="sector">Sector</Label>
                    <select
                      id="sector"
                      required
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
                    >
                      <option value="">Seleccione un sector</option>
                      <option value="Pañol Cardales">Pañol Cardales</option>
                      <option value="Pañol Gascon">Pañol Gascon</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="RRHH">RRHH</option>
                      <option value="Seguridad e Higiene">Seguridad e Higiene</option>
                      <option value="Vidrio">Vidrio</option>
                      <option value="Pvc">Pvc</option>
                      <option value="Perf. Aluminio">Perf. Aluminio</option>
                      <option value="Administracion">Administración</option>
                      <option value="Colocaciones">Colocaciones</option>
                      <option value="Reparaciones">Reparaciones</option>
                      <option value="Reparaciones">Mediciones</option>
                      <option value="Edilicio">Maestranza</option>
                      <option value="Compras">Compras</option>
                    </select>
                  </div>

                <div className="grid gap-2">
                <Label htmlFor="cc">Cod cta</Label>
                <Input
                  id="cc"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cc}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) setCc(value); // solo dígitos
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cant">Cant Sol</Label>
                <Input
                  id="cant"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cant}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) setCant(value); // solo dígitos
                  }}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="cant_exist">Cant exist</Label>
                 <Input
                  id="cant_exist"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cant_exist}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) setCant_exist(value); // solo dígitos
                  }}
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
                    <Label htmlFor="aprueba">Aprueba</Label>
                    <select
                      id="aprueba"
                      required
                      value={aprueba}
                      onChange={(e) => setAprueba(e.target.value)}
                      className="border border-input bg-background px-3 py-2 rounded-md text-sm shadow-sm"
                    >
                      <option value="">Seleccione responsable de area</option>
                      <option value="Juan S.">Juan S.</option>
                      <option value="Julio A">Julio A.</option>
                      <option value="Luciana L.">Luciana L.</option>
                      <option value="Eduardo S.">Eduardo S.</option>
                      <option value="Pedro S.">Pedro S.</option>
                      <option value="Sofia S.">Sofia S.</option>
                      <option value="Carolina S.">Carolina S.</option>
                     
                    </select>
              </div>
              
               
              

       

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Cargando..." : "Crear"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
