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

export function CrearFormAdmin({
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
 const [estado, setEstado] = useState("");
 const [prov_uno, setProv_uno] = useState("");
 const [cost_prov_uno, setCost_prov_uno] = useState("");
 const [prov_dos, setProv_dos] = useState("");
 const [cost_prov_dos, setCost_prov_dos] = useState("");
 const [prov_tres, setProv_tres] = useState("");
 const [cost_prov_tres, setCost_prov_tres] = useState("");
 const [aprueba, setAprueba] = useState("");
 const [oc, setOc] = useState("");
 const [proveedor_selec, setProveedor_selec] = useState("");
 const [usd, setUsd] = useState("");
 const [eur, setEur] = useState("");
 const [tc, setTc] = useState("");
 const [ars, setArs] = useState("");
 const [porcent, setPorcent] = useState("");
 const [ars_desc, setArs_desc] = useState("");
 const [total_simp, setTotal_simp] = useState("");
 const [fecha_conf, setFecha_conf] = useState("");
 const [fecha_prom, setFecha_prom] = useState("");
 const [fecha_ent, setFecha_ent] = useState("");
 const [rto, setRto] = useState("");
 const [fac, setFac] = useState("");
 const [mod_pago, setMod_pago] = useState("");
 const [proceso, setProceso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient(); // crea el cliente conectado

function parseNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function parseDate(value: string) {
  return value.trim() === "" ? null : value;
}


  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

     // 1️⃣ Convierte una sola vez los campos numéricos que necesitas reutilizar
  const cantNum         = parseNumber(cant);          // number | null
  const costProvUnoNum  = parseNumber(cost_prov_uno); // number | null
  const costProvDosNum  = parseNumber(cost_prov_dos); // number | null
  const costProvTresNum  = parseNumber(cost_prov_tres); // number | null

  // 2️⃣ Calcula el subtotal solo si ambos valores son válidos
  const subtProv1 =
    cantNum !== null && costProvUnoNum !== null
      ? cantNum * costProvUnoNum
      : null;

  const subtProv2 =
    cantNum !== null && costProvDosNum !== null
      ? cantNum * costProvDosNum
      : null;

  const subtProv3 =
    cantNum !== null && costProvTresNum !== null
      ? cantNum * costProvTresNum
      : null;


    const { data: pedidoCreado, error } = await supabase
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
          estado,
          aprueba,
          prov_uno,
          cost_prov_uno: parseNumber(cost_prov_uno),
          subt_prov1: subtProv1,
          prov_dos,
          cost_prov_dos: parseNumber(cost_prov_dos),
          subt_prov2: subtProv2,
          prov_tres,
          cost_prov_tres: parseNumber(cost_prov_tres),
          subt_prov3: subtProv3,
          oc: parseNumber(oc),
          proveedor_selec,
          usd: parseNumber(usd),
          eur: parseNumber(eur),
          tc: parseNumber(tc),
          porcent: parseNumber(porcent),
          ars_desc: parseNumber(ars_desc),
          ars: parseNumber(ars),
          total_simp: parseNumber(total_simp),
          fecha_conf: parseDate(fecha_conf),
          fecha_prom: parseDate(fecha_prom),
          fecha_ent: parseDate(fecha_ent),
          rto: parseNumber(rto),
          fac: parseNumber(fac),
          mod_pago,
          proceso,
        },
      ])
      .select("id, sector")
      .single();

    setIsLoading(false);

    if (error) {
      console.error("Error al insertar:", error);
      setError("Hubo un error al crear el pedido.");
    } else {
      if (pedidoCreado?.id) {
        alert(
          `✅ Se creó tu PIC #${pedidoCreado.id} del sector ${pedidoCreado.sector || "—"}.`
        );
      }
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
                      <option value="Panol Cardales">Panol Cardales</option>
                      <option value="Panol Gascon">Panol Gascon</option>
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
                      <option value="Maestranza">Maestranza</option>
                      <option value="Compras">Compras</option>
                    </select>
                  </div>

                <div className="grid gap-2">
                <Label htmlFor="cc">Cod cta</Label>
                <Input
                  id="cc"
                  type="number"
                  
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cant">Cant</Label>
                <Input
                  id="cant"
                  type="number"
                  required
                  value={cant}
                  onChange={(e) => setCant(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="cant_exist">Cant exist</Label>
                <Input
                  id="cant_exist"
                  type="number"
                  required
                  value={cant_exist}
                  onChange={(e) => setCant_exist(e.target.value)}
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
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  type="text"
               
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
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
              <div className="grid gap-2">
                <Label htmlFor="prov_uno">Prov 1</Label>
                <Input
                  id="prov_uno"
                  type="text"
               
                  value={prov_uno}
                  onChange={(e) => setProv_uno(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost_prov_uno">Costo Prov 1</Label>
                <Input
                  id="cost_prov_uno"
                  type="number"
               
                  value={cost_prov_uno}
                  onChange={(e) => setCost_prov_uno(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prov_dos">Prov 2</Label>
                <Input
                  id="prov_dos"
                  type="text"
               
                  value={prov_dos}
                  onChange={(e) => setProv_dos(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost_prov_dos">Cost Prov 2</Label>
                <Input
                  id="cost_prov_dos"
                  type="number"
               
                  value={cost_prov_dos}
                  onChange={(e) => setCost_prov_dos(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prov_tres">Prov 3</Label>
                <Input
                  id="prov_tres"
                  type="text"
               
                  value={prov_tres}
                  onChange={(e) => setProv_tres(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost_prov_tres">Cost Prov 3</Label>
                <Input
                  id="cost_prov_tres"
                  type="number"
               
                  value={cost_prov_tres}
                  onChange={(e) => setCost_prov_tres(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="oc">O.C.</Label>
                <Input
                  id="oc"
                  type="number"
                
                  value={oc}
                  onChange={(e) => setOc(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="proveedor_selec">Proveedor selecc</Label>
                <Input
                  id="proveedor_selec"
                  type="text"
             
                  value={proveedor_selec}
                  onChange={(e) => setProveedor_selec(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="usd">Usd</Label>
                <Input
                  id="usd"
                  type="number"
             
                  value={usd}
                  onChange={(e) =>setUsd(e.target.value)}
                />
              </div>  
           <div className="grid gap-2">
                <Label htmlFor="eur">Eur</Label>
                <Input
                  id="eur"
                  type="number"
             
                  value={eur}
                  onChange={(e) =>setEur(e.target.value)}
                />
              </div>  
           <div className="grid gap-2">
                <Label htmlFor="tc">T.C.</Label>
                <Input
                  id="tc"
                  type="number"
             
                  value={tc}
                  onChange={(e) =>setTc(e.target.value)}
                />
              </div>  

               <div className="grid gap-2">
                <Label htmlFor="porcent">% desc.</Label>
                <Input
                  id="porcent"
                  type="number"
             
                  value={porcent}
                  onChange={(e) =>setPorcent(e.target.value)}
                />
              </div>  
              <div className="grid gap-2">
                <Label htmlFor="ars_desc">Ars c/desc.</Label>
                <Input
                  id="ars_desc"
                  type="number"
             
                  value={ars_desc}
                  onChange={(e) =>setArs_desc(e.target.value)}
                />
              </div>  
           <div className="grid gap-2">
                <Label htmlFor="ars">Ars</Label>
                <Input
                  id="ars"
                  type="number"
             
                  value={ars}
                  onChange={(e) =>setArs(e.target.value)}
                />
              </div>  
            <div className="grid gap-2">
                <Label htmlFor="total_simp">Total s/imp</Label>
                <Input
                  id="total_simp"
                  type="number"
             
                  value={total_simp}
                  onChange={(e) =>setTotal_simp(e.target.value)}
                />
              </div>  
          

              <div className="grid gap-2">
                <Label htmlFor="fecha_conf">fecha_conf</Label>
                <Input
                  id="fecha_conf"
                  type="date"
                
                  value={fecha_conf}
                  onChange={(e) => setFecha_conf(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha_prom">fecha prom ent</Label>
                <Input
                  id="fecha_prom"
                  type="date"
              
                  value={fecha_prom}
                  onChange={(e) => setFecha_prom(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="fecha_ent">fecha ent</Label>
                <Input
                  id="fecha_ent"
                  type="date"
            
                  value={fecha_ent}
                  onChange={(e) => setFecha_ent(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rto">Remito</Label>
                <Input
                  id="rto"
                  type="number"
             
                  value={rto}
                  onChange={(e) => setRto(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="fac">Factura</Label>
                <Input
                  id="fac"
                  type="number"
               
                  value={fac}
                  onChange={(e) => setFac(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="mod_pago">Modo de pago</Label>
                <Input
                  id="mod_pago"
                  type="text"
               
                  value={mod_pago}
                  onChange={(e) => setMod_pago(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="proceso">Proceso</Label>
                <Input
                  id="proceso"
                  type="text"
           
                  value={proceso}
                  onChange={(e) => setProceso(e.target.value)}
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
