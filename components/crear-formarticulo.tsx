"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";



export default function CrearFormArticulo() {
  const supabase = createClient();
  const router = useRouter();

  const [necesidad, setNecesidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [solicita, setSolicita] = useState("");
  const [sector, setSector] = useState("");
  const [estado, setEstado] = useState("iniciado");
  const [oc, setOc] = useState("");
  const [proveedor_selec, setProveedorSelec] = useState("");
  const [aprueba, setAprueba] = useState("");


    const [articulo, setArticulo] = useState("");
  const [cant, setCant] = useState<number>(1);
  const [cant_exist, setCantExist] = useState<number>(0);
  const [observacion, setObservacion] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [articulosSeleccionados, setArticulosSeleccionados] = useState<
    { articulo: string; cant: number; cant_exist: number; observacion: string; descripcion: string }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");



  // ➕ Agregar artículo a la lista temporal
  const handleAgregarArticulo = () => {
    if (articulo.trim() && cant > 0) {
      const yaExiste = articulosSeleccionados.find(
        (a) => a.articulo.toLowerCase() === articulo.toLowerCase()
      );
      if (yaExiste) {
        setArticulosSeleccionados((prev) =>
          prev.map((a) =>
            a.articulo.toLowerCase() === articulo.toLowerCase()
              ? { ...a, cant: a.cant + cant }
              : a
          )
        );
      } else {
        setArticulosSeleccionados((prev) => [
          ...prev,
          { 
            articulo, 
            cant, 
            cant_exist,
            observacion, 
            descripcion 
          },
        ]);
      }
      // Reset inputs para cargar otro artículo
      setArticulo("");
      setCant(1);
      setCantExist(0);
      setObservacion("");
      setDescripcion("");
    }
  };

  // 🗑 Eliminar artículo de la lista
  const handleEliminarArticulo = (articulo: string) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.articulo !== articulo)
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

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setMessage("❌ Error: Usuario no autenticado");
      setLoading(false);
      return;
    }

    const nuevoPedido = {
      uuid: user.id,
      necesidad: necesidad,
      categoria,
      solicita,
      sector,
      estado,
      
      aprueba,
      oc: oc || null,
      proveedor_selec: proveedor_selec || null,
      // Convertir el array de artículos a JSONB en el nuevo campo 'articulos'
      articulos: articulosSeleccionados.map((a) => ({
        articulo: a.articulo,
        descripcion: a.descripcion,
        cant: a.cant,
        cant_exist: a.cant_exist,
        observacion: a.observacion,
      })),
    };

    const { error } = await supabase
      .from("pic")
      .insert([nuevoPedido]);

    if (error) {
      console.error(error);
      setMessage("❌ Error al crear el pedido: " + error.message);
    } else {
      setMessage("✅ Pedido creado con éxito");
      // Reset form
      setNecesidad("");
      setCategoria("");
      setSolicita("");
      setSector("");
      setEstado("iniciado");
      setOc("");
      setProveedorSelec("");
      
      setAprueba("");
      setArticulo("");
      setCant(1);
      setCantExist(0);
      setObservacion("");
      setDescripcion("");
      setArticulosSeleccionados([]);

      setTimeout(() => {
        router.push("/protected");
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded text-black">
      <h2 className="text-2xl font-bold mb-4">Crear Pedido No Productivo</h2>
      {message && <div className="mb-4 text-center">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campos generales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-black">Fecha de Necesidad</label>
            <input
              type="date"
              value={necesidad}
              onChange={(e) => setNecesidad(e.target.value)}
              className="border p-2 w-full rounded text-black bg-white"
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
              className="border p-2 w-full rounded text-black bg-white"
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
              className="border p-2 w-full rounded text-black bg-white"
            >
              <option value="">Seleccione</option>
              <option value="Adrian">Adrian</option>
              <option value="Sergio">Sergio</option>
              <option value="Victor">Victor</option>
              <option value="Agustin">Agustin</option>
              <option value="Eliezer">Eliezer</option>
              <option value="Tamara">Tamara</option>
              <option value="Roberto">Roberto</option>
              <option value="Luciana T">Luciana T</option>
              <option value="Brian P">Brian P</option>
              <option value="Coria">Coria</option>
              <option value="Arron">Arron</option>
              <option value="Sergio V">Sergio V</option>
              <option value="Carla D">Carla D</option>
              <option value="Valentina">Valentina</option>
              <option value="Carlos">Carlos</option>
              <option value="Lucas M">Lucas M</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sector">Sector</Label>
            <select
              id="sector"
              required
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="border p-2 w-full rounded text-black bg-white"
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



          <div className="grid gap-2">
            <Label htmlFor="aprueba">Aprueba</Label>
            <select
              id="aprueba"
              required
              value={aprueba}
              onChange={(e) => setAprueba(e.target.value)}
              className="border p-2 w-full rounded text-black bg-white"
            >
              <option value="">Seleccione responsable de area</option>
              <option value="Juan S.">Juan S.</option>
              <option value="Julio A.">Julio A.</option>
              <option value="Luciana L.">Luciana L.</option>
              <option value="Eduardo S.">Eduardo S.</option>
              <option value="Pedro S.">Pedro S.</option>
              <option value="Sofia S.">Sofia S.</option>
              <option value="Carolina S.">Carolina S.</option>
            </select>
          </div>
        </div>

        {/* ➕ Agregar Artículo */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Agregar Artículo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Nombre del artículo */}
            <div className="flex flex-col">
              <label className="text-black mb-1">Nombre del Artículo:</label>
              <input
                type="text"
                value={articulo}
                onChange={(e) => setArticulo(e.target.value)}
                className="border p-2 rounded text-black bg-white"
                placeholder="Ej: Tornillos M8"
              />
            </div>

            {/* Cantidad */}
            <div className="flex flex-col">
              <label className="text-black mb-1">Cantidad:</label>
              <input
                type="number"
                min={1}
                value={cant}
                onChange={(e) => setCant(parseInt(e.target.value))}
                className="border p-2 rounded text-black bg-white"
              />
            </div>

            {/* Cantidad existente */}
            <div className="flex flex-col">
              <label className="text-black mb-1">Cantidad Existente:</label>
              <input
                type="number"
                min={0}
                value={cant_exist}
                onChange={(e) => setCantExist(parseInt(e.target.value))}
                className="border p-2 rounded text-black bg-white"
              />
            </div>

            {/* Descripción */}
            <div className="flex flex-col">
              <label className="text-black mb-1">Descripción:</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="border p-2 rounded text-black bg-white"
                placeholder="Descripción del artículo"
              />
            </div>

            {/* Observación */}
            <div className="flex flex-col">
              <label className="text-black mb-1">Observación:</label>
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="border p-2 rounded text-black bg-white"
                placeholder="Observaciones específicas"
              />
            </div>
          </div>

          {/* Botón para agregar */}
          <button
            type="button"
            onClick={handleAgregarArticulo}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
          >
            ➕ Agregar Artículo al Pedido
          </button>
        </div>

        {/* Lista de artículos agregados */}
        {articulosSeleccionados.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Artículos seleccionados:</h4>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Artículo</th>
                  <th className="border p-2">Descripción</th>
                  <th className="border p-2">Cantidad</th>
                  <th className="border p-2">Existencia</th>
                  <th className="border p-2">Observación</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.map((a, index) => (
                  <tr key={index}>
                    <td className="border p-2">{a.articulo}</td>
                    <td className="border p-2">{a.descripcion}</td>
                    <td className="border p-2">{a.cant}</td>
                    <td className="border p-2">{a.cant_exist}</td>
                    <td className="border p-2">{a.observacion}</td>
                    <td className="border p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEliminarArticulo(a.articulo)}
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
          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Cargando..." : "Crear pedido"}
          </Button>
        </div>
      </form>
    </div>
  );
}
