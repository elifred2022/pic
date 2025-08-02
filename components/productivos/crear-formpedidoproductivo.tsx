"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";


type Articulo = {
  id: string;
  cc: string;
  codint: string;
  articulo: string;
  descripcion: string;
  existencia: number;
  costo_compra: number;
  provsug: string;
  
};

export default function CrearFormPedidoProductivo() {
  const supabase = createClient();
 const router = useRouter();

  const [fechaNecesidad, setFechaNecesidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [solicita, setSolicita] = useState("");
  const [sector, setSector] = useState("");
  const [estado, setEstado] = useState("iniciado");
  const [numeroOc, setNumeroOc] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");

  const [codigoArticulo, setCodigoArticulo] = useState("");
  const [articuloEncontrado, setArticuloEncontrado] = useState<Articulo | null>(null);
  const [cant, setCant] = useState<number>(1);
  const [observ, setObserv] = useState("");

  

  const [articulosSeleccionados, setArticulosSeleccionados] = useState<
    (Articulo & { cant: number })[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔍 Buscar artículo por código interno
  useEffect(() => {
    const fetchArticulo = async () => {
      if (codigoArticulo.trim() === "") {
        setArticuloEncontrado(null);
        return;
      }

      const { data, error } = await supabase
        .from("articulos")
        .select("*")
        .eq("codint", codigoArticulo.trim())
        .single();

      if (!error && data) {
        setArticuloEncontrado(data as Articulo);
      } else {
        setArticuloEncontrado(null);
      }
    };

    fetchArticulo();
  }, [codigoArticulo, supabase]);

  // ➕ Agregar artículo a la lista temporal
  const handleAgregarArticulo = () => {
    if (articuloEncontrado && cant > 0) {
      const yaExiste = articulosSeleccionados.find(
        (a) => a.codint === articuloEncontrado.codint
      );
      if (yaExiste) {
        setArticulosSeleccionados((prev) =>
          prev.map((a) =>
            a.codint === articuloEncontrado.codint
              ? { ...a, cant: a.cant + cant }
              : a
          )
        );
      } else {
        setArticulosSeleccionados((prev) => [
          ...prev,
          { ...articuloEncontrado, cant },
        ]);
      }
      // Reset inputs para cargar otro artículo
      setCodigoArticulo("");
      setArticuloEncontrado(null);
      setCant(1);
    }
  };

  // 🗑 Eliminar artículo de la lista
  const handleEliminarArticulo = (codint: string) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.codint !== codint)
    );
  };

  // 📤 Enviar todo el pedido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (articulosSeleccionados.length === 0) {
      setMessage("❌ Debes agregar al menos un artículo al pedido");
      setLoading(false);
      return;
    }

    const nuevoPedido = {
    
      fecha_necesidad: fechaNecesidad,
      categoria,
      solicita,
      sector,
      estado,
      observ,
      numero_oc: numeroOc || null,
      proveedor_seleccionado: proveedorSeleccionado || null,
      articulos: articulosSeleccionados.map((a) => ({
        codint: a.codint,
        articulo: a.articulo,
        descripcion: a.descripcion,
        existencia: a.existencia,
        costo_compra: a.costo_compra,
        provsug: a.provsug,
        cc: a.cc,
        cant: a.cant,
      })),
      
    };

    const { error } = await supabase
      .from("pedidos_productivos")
      .insert([nuevoPedido]);

    if (error) {
      console.error(error);
      setMessage("❌ Error al crear el pedido");
    } else {
      setMessage("✅ Pedido creado con éxito");
      // Reset form
      setFechaNecesidad("");
      setCategoria("");
      setSolicita("");
      setSector("");
      setEstado("iniciado");
      setNumeroOc("");
      setProveedorSeleccionado("");
      setCodigoArticulo("");
      setArticuloEncontrado(null);
      setCant(1);
      setArticulosSeleccionados([]);
      setObserv("");

      setTimeout(()=> {
        router.push("/auth/rutaproductivos/lista-pedidosproductivos");
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded text-black">
      <h2 className="text-2xl font-bold mb-4">Crear Pedido Productivo</h2>
      {message && <div className="mb-4 text-center">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campos generales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-black">Fecha de Necesidad</label>
            <input
              type="date"
              value={fechaNecesidad}
              onChange={(e) => setFechaNecesidad(e.target.value)}
              className="border p-2 w-full rounded text-white"
              required
            />
          </div>
          
                      <div className="grid gap-2">
                            <Label htmlFor="categoria">Categoria</Label>
                            <select
                              id="categoria"
                              required
                              value={categoria}
                              onChange={(e) => setCategoria(e.target.value)}
                              className="border p-2 w-full rounded text-white"
                            >
                              <option value="">Seleccione categoria</option>
                              <option value="Programado">Programado</option>
                              <option value="Urgente">Urgente</option>
                             
                            </select>
                      </div>

           <div className="grid gap-2">
                            <Label htmlFor="solicita">Solicita</Label>
                            <select
                              id="solicita"
                              required
                              value={solicita}
                              onChange={(e) => setSolicita(e.target.value)}
                              className="border p-2 w-full rounded text-white"
                            >
                              <option value="">Seleccione</option>
                              <option value="Adrian">Adrian</option>
                              <option value="Sergio">Sergio</option>
                             <option value="Victor">Victor</option>
                             <option value="Agustin">Agustin</option>
                             <option value="Eliezer">Eliezer</option>
                            </select>
            </div>
                      

        

          <div className="grid gap-2">
                    <Label htmlFor="sector">Sector</Label>
                    <select
                      id="sector"
                      required
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="border p-2 w-full rounded text-white"
                    >
                      <option value="">Seleccione un sector</option>
                      <option value="Pañol Cardales">Pañol Cardales</option>
                      <option value="Pañol Gascon">Pañol Gascon</option>
                      <option value="Vidrio">Vidrio</option>
                      <option value="Pvc">Pvc</option>
                      <option value="Perf. Aluminio">Perf. Aluminio</option>
                      <option value="Administracion">Administración</option>
                      <option value="Compras">Compras</option>
                       
                    </select>
                  </div>

          
        </div>
        {/* 🔍 Búsqueda por código */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Agregar Artículo</h3>
          <input
            type="text"
            value={codigoArticulo}
            onChange={(e) => setCodigoArticulo(e.target.value)}
            className="border p-2 w-full rounded mb-2 text-white"
            placeholder="Código interno (Ej: A123)"
          />

          {articuloEncontrado && (
            <div className="mt-2 p-3 border rounded bg-gray-50">
              <p><strong>Código:</strong> {articuloEncontrado.codint}</p>
              <p><strong>Artículo:</strong> {articuloEncontrado.articulo}</p>
              <p><strong>Descripción:</strong> {articuloEncontrado.descripcion}</p>
              <p><strong>Existencia:</strong> {articuloEncontrado.existencia}</p>
              <p><strong>Proveedor sugerido:</strong> {articuloEncontrado.provsug}</p>

              <div className="mt-2 flex items-center">
                <label className="text-black mr-2">Cantidad:</label>
                <input
                  type="number"
                  min={1}
                  value={cant}
                  onChange={(e) => setCant(parseInt(e.target.value))}
                  className="border p-2 w-24 rounded text-white"
                />
                <button
                  type="button"
                  onClick={handleAgregarArticulo}
                  className="ml-4 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  ➕ Agregar Artículo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de artículos agregados */}
        {articulosSeleccionados.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Artículos seleccionados:</h4>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Código</th>
                  <th className="border p-2">Artículo</th>
                  <th className="border p-2">Cantidad</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.map((a) => (
                  <tr key={a.codint}>
                    <td className="border p-2">{a.codint}</td>
                    <td className="border p-2">{a.articulo}</td>
                    <td className="border p-2">{a.cant}</td>
                    <td className="border p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEliminarArticulo(a.codint)}
                        className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      >
                        ❌ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

       <div className="flex justify-center gap-4 mt-6">
            
              <Button type="submit"  disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" >
                {loading ? "Cargando..." : "Crear pedido"}
              </Button>
    </div>
       
      </form>
    </div>
  );
}
