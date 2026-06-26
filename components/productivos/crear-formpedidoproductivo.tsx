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
  codprovsug?: string;
  presentacion?: string;
  aprueba: string;
  
};

export default function CrearFormPedidoProductivo() {
  const supabase = createClient();
 const router = useRouter();

  const [necesidad, setNecesidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [solicita, setSolicita] = useState("");
  const [sector, setSector] = useState("");
  const [estado, setEstado] = useState("iniciado");
  const [numeroOc, setNumeroOc] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
   const [aprueba, setAprueba] = useState("");

  const [codigoArticulo, setCodigoArticulo] = useState("");
  const [articuloEncontrado, setArticuloEncontrado] = useState<Articulo | null>(null);
  const [cant, setCant] = useState<number>(1);
  const [existenciaEditada, setExistenciaEditada] = useState<number>(0);
   const [observacion, setObservacion] = useState("");
  const [observ, setObserv] = useState("");

  

  const [articulosSeleccionados, setArticulosSeleccionados] = useState<
    (Articulo & { cant: number, observacion: string })[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingNombre, setLoadingNombre] = useState(true);

  // 🔄 Cargar nombre del usuario automáticamente
  useEffect(() => {
    const cargarNombreUsuario = async () => {
      try {
        setLoadingNombre(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Error al obtener usuario:", userError);
          setLoadingNombre(false);
          return;
        }

        // Obtener nombre del usuario desde la tabla usuarios
        const { data: userProfile, error: profileError } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("uuid", user.id)
          .single();

        if (profileError) {
          console.error("Error al obtener perfil:", profileError);
          setLoadingNombre(false);
          return;
        }

        if (userProfile?.nombre) {
          setSolicita(userProfile.nombre);
        }
      } catch (error) {
        console.error("Error al cargar nombre del usuario:", error);
      } finally {
        setLoadingNombre(false);
      }
    };

    cargarNombreUsuario();
  }, [supabase]);

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
        setExistenciaEditada(data.existencia);
      } else {
        setArticuloEncontrado(null);
        setExistenciaEditada(0);
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
              ? { ...a, cant: a.cant + cant, existencia: existenciaEditada }
              : a
          )
        );
      } else {
        setArticulosSeleccionados((prev) => [
          ...prev,
          { ...articuloEncontrado, cant, observacion, existencia: existenciaEditada },
        ]);
      }
      // Reset inputs para cargar otro artículo
      setCodigoArticulo("");
      setArticuloEncontrado(null);
      setCant(1);
      setExistenciaEditada(0);
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

    if (loadingNombre) {
      setMessage("❌ Espere a que se cargue el nombre del usuario");
      setLoading(false);
      return;
    }

    if (!solicita.trim()) {
      setMessage("❌ El nombre del solicitante es obligatorio");
      setLoading(false);
      return;
    }

    if (articulosSeleccionados.length === 0) {
      setMessage("❌ Debes agregar al menos un artículo al pedido");
      setLoading(false);
      return;
    }

    const nuevoPedido = {
    
      necesidad: necesidad,
      categoria,
      solicita,
      sector,
      estado,
      observ,
      aprueba,
      numero_oc: numeroOc || null,
      proveedor_seleccionado: proveedorSeleccionado || null,
      articulos: articulosSeleccionados.map((a) => ({
        codint: a.codint,
        articulo: a.articulo,
        descripcion: a.descripcion,
        presentacion: a.presentacion?.trim() || null,
        existencia: a.existencia,
        costo_compra: a.costo_compra,
        provsug: a.provsug,
        codprovsug: a.codprovsug?.trim() || null,
        cc: a.cc,
        cant: a.cant,
        observacion: a.observacion,
      })),
      
    };

    const { data: pedidoCreado, error } = await supabase
      .from("pedidos_productivos")
      .insert([nuevoPedido])
      .select("id, sector")
      .single();

    if (error) {
      console.error(error);
      setMessage("❌ Error al crear el pedido");
    } else {
      // Actualizar existencia en la tabla articulos
      try {
        for (const articulo of articulosSeleccionados) {
          const { error: updateError } = await supabase
            .from("articulos")
            .update({ existencia: articulo.existencia })
            .eq("codint", articulo.codint);

          if (updateError) {
            console.error("Error al actualizar existencia:", updateError);
            setMessage("⚠️ Pedido creado pero error al actualizar existencia");
            setLoading(false);
            return;
          }
        }
        setMessage("✅ Pedido creado con éxito y existencia actualizada");
        if (pedidoCreado?.id) {
          alert(
            `✅ Se creó tu PIC productivo #${pedidoCreado.id} del sector ${pedidoCreado.sector || "—"}.`
          );
        }
      } catch (updateError) {
        console.error("Error al actualizar existencia:", updateError);
        setMessage("⚠️ Pedido creado pero error al actualizar existencia");
      }

      // Reset form
      setNecesidad("");
      setCategoria("");
      setSolicita("");
      setSector("");
      setEstado("iniciado");
      setNumeroOc("");
      setProveedorSeleccionado("");
      setCodigoArticulo("");
      setArticuloEncontrado(null);
      setCant(1);
      setExistenciaEditada(0);
      setObservacion("")
      setArticulosSeleccionados([]);
      setObserv("");
      setAprueba("")

      setTimeout(()=> {
        router.push("/protected");
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
                            <div className="relative">
                              <input
                                id="solicita"
                                type="text"
                                value={solicita}
                                readOnly
                                className={`border p-2 w-full rounded text-black ${
                                  loadingNombre 
                                    ? 'bg-gray-50 cursor-wait' 
                                    : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                placeholder={loadingNombre ? "Cargando nombre..." : "Nombre del usuario"}
                              />
                              {loadingNombre && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              💡 El nombre se carga automáticamente desde tu perfil de usuario
                            </p>
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
                      <option value="Panol Cardales">Panol Cardales</option>
                      <option value="Panol Gascon">Panol Gascon</option>
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
                      <option value="Luciana L.">Luciana L.</option>
                      <option value="Eduardo S.">Eduardo S.</option>
                      <option value="Pedro S.">Pedro S.</option>
                      <option value="Sofia S.">Sofia S.</option>
                      <option value="Carolina S.">Carolina S.</option>
                     
                    </select>
              </div>

              <div>
                <label className="text-black">Observación General</label>
                <input
                  type="text"
                  value={observ}
                  onChange={(e) => setObserv(e.target.value)}
                  className="border p-2 w-full rounded text-black bg-white"
                  placeholder="Observación general del pedido"
                />
              </div>

              <div>
                <label className="text-black">Número de OC</label>
                <input
                  type="text"
                  value={numeroOc}
                  onChange={(e) => setNumeroOc(e.target.value)}
                  className="border p-2 w-full rounded text-black bg-white"
                  placeholder="Número de orden de compra (opcional)"
                />
              </div>

              <div>
                <label className="text-black">Proveedor Seleccionado</label>
                <input
                  type="text"
                  value={proveedorSeleccionado}
                  onChange={(e) => setProveedorSeleccionado(e.target.value)}
                  className="border p-2 w-full rounded text-black bg-white"
                  placeholder="Proveedor seleccionado (opcional)"
                />
              </div>

          
        </div>
        {/* 🔍 Búsqueda por código */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Agregar Artículo</h3>
          <input
            type="text"
            value={codigoArticulo}
            onChange={(e) => setCodigoArticulo(e.target.value)}
            className="border p-2 w-full rounded text-black bg-white"
            placeholder="Código interno (Ej: A123)"
          />

          {articuloEncontrado && (
            <div className="mt-2 p-3 border rounded bg-gray-50">
              <p><strong>Código:</strong> {articuloEncontrado.codint}</p>
              <p><strong>Artículo:</strong> {articuloEncontrado.articulo}</p>
              <p><strong>Descripción:</strong> {articuloEncontrado.descripcion}</p>
              <p className="font-bold text-red-600">
                Presentacion: {articuloEncontrado.presentacion?.trim() ? articuloEncontrado.presentacion : "-"}
              </p>
              <p><strong>Proveedor sugerido:</strong> {articuloEncontrado.provsug}</p>
              <p><strong>Cod. prov. sug.:</strong> {articuloEncontrado.codprovsug?.trim() ? articuloEncontrado.codprovsug : "-"}</p>

            <div className="mt-2 flex flex-col gap-2">
  {/* Existencia */}
  <div className="flex flex-col">
    <label className="text-black mb-1">Existencia:</label>
    <input
      type="number"
      min={0}
      value={existenciaEditada}
      onChange={(e) => setExistenciaEditada(parseInt(e.target.value) || 0)}
      className="border p-2 rounded text-black bg-white"
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

  {/* Observación */}
  <div className="flex flex-col">
    <label className="text-black mb-1">Observ:</label>
    <input
      type="text"
      value={observacion}
      onChange={(e) => setObservacion(e.target.value)}
      className="border p-2 rounded text-black bg-white"
    />
  </div>

  {/* Botón */}
  <button
    type="button"
    onClick={handleAgregarArticulo}
    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 mt-2"
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
                  <th className="border p-2">Descripción</th>
                  <th className="border p-2">Presentacion</th>
                  <th className="border p-2">Cod. prov. sug.</th>
                  <th className="border p-2">Existencia</th>
                  <th className="border p-2">Observ</th>
                  <th className="border p-2">Cantidad</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.map((a) => (
                  <tr key={a.codint}>
                    <td className="border p-2">{a.codint}</td>
                    <td className="border p-2">{a.articulo}</td>
                    <td className="border p-2">{a.descripcion?.trim() ? a.descripcion : "-"}</td>
                    <td className="border p-2 font-bold text-red-600">
                      {a.presentacion?.trim() ? a.presentacion : "-"}
                    </td>
                    <td className="border p-2">{a.codprovsug?.trim() ? a.codprovsug : "-"}</td>
                    <td className="border p-2">{a.existencia}</td>
                    <td className="border p-2">{a.observacion}</td>
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
