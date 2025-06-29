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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient(); // crea el cliente conectado

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase
      .from("pic") // 🔁 CAMBIA ESTO con el nombre real de tu tabla
      .insert([
        {
         
          necesidad: necesidad,
          categoria,
          solicita,
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
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  type="text"
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
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
