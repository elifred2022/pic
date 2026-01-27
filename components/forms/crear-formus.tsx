"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ArticuloManual = {
  id: string;
  articulo: string;
  descripcion: string;
  cant: number;
  observacion: string;
  cc: string;
  existencia: number;
  provsug: string;
  link: string;
};

export default function CrearFormUs() {
  const supabase = createClient();
  const router = useRouter();

  const [necesidad, setNecesidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [solicita, setSolicita] = useState("");
  const [sector, setSector] = useState("");
  const [estado, setEstado] = useState("iniciado");
  const [aprueba, setAprueba] = useState("");
  
  const [notas, setNotas] = useState("");
  // Campos para agregar artículo manualmente
  const [articulo, setArticulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cant, setCant] = useState<number>(1);
  const [observacion, setObservacion] = useState("");
  const [cc, setCc] = useState("");
  const [existencia, setExistencia] = useState<number>(0);
  const [provsug, setProvsug] = useState("");
  const [link, setLink] = useState("");

  const [articulosSeleccionados, setArticulosSeleccionados] = useState<ArticuloManual[]>([]);
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

  // ➕ Agregar artículo a la lista temporal
  const handleAgregarArticulo = () => {
    if (articulo.trim() === "" || cant <= 0) {
      setMessage("❌ El artículo y la cantidad son obligatorios");
      return;
    }

    const nuevoArticulo: ArticuloManual = {
      id: Date.now().toString(), // ID temporal único
      articulo: articulo.trim(),
      descripcion: descripcion.trim(),
      cant,
      observacion: observacion.trim(),
      cc: cc.trim(),
      existencia,
      provsug: provsug.trim(),
      link: link.trim(),
    };

    setArticulosSeleccionados((prev) => [...prev, nuevoArticulo]);

    // Reset inputs para cargar otro artículo
    setArticulo("");
    setDescripcion("");
    setCant(1);
    setObservacion("");
    setCc("");
    setExistencia(0);
    setProvsug("");
    setLink("");
    setMessage("✅ Artículo agregado correctamente");
  };

  // ❌ Eliminar artículo de la lista
  const handleEliminarArticulo = (id: string) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id !== id)
    );
  };

  // 📝 Crear pedido
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
      setMessage("❌ Debe agregar al menos un artículo");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("❌ Usuario no autenticado");
        setLoading(false);
        return;
      }

      // Crear pedido principal con artículos incluidos
      const { data: pedidoCreado, error: pedidoError } = await supabase
        .from("pic")
        .insert([
          {
            necesidad,
            categoria,
            solicita,
            sector,
            estado,
            aprueba,
            notas,
            uuid: user.id,
            articulos: articulosSeleccionados.map((art) => ({
              articulo: art.articulo,
              descripcion: art.descripcion,
              cant: art.cant,
              observacion: art.observacion,
              cc: art.cc || null,
              existencia: art.existencia || 0,
              provsug: art.provsug || null,
              link: art.link || null,
            })),
          },
        ])
        .select("id, sector")
        .single();

             if (pedidoError) {
         console.error("Error al crear pedido:", pedidoError);
         console.error("Detalles del error:", {
           message: pedidoError.message,
           details: pedidoError.details,
           hint: pedidoError.hint,
           code: pedidoError.code
         });
         setMessage(`❌ Error al crear el pedido: ${pedidoError.message || 'Error desconocido'}`);
         setLoading(false);
         return;
       }

      

      let idCreado = pedidoCreado?.id;
      let sectorCreado = pedidoCreado?.sector;

      if (!idCreado) {
        const { data: ultimoPedido, error: ultimoError } = await supabase
          .from("pic")
          .select("id, sector")
          .eq("uuid", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!ultimoError && ultimoPedido?.id) {
          idCreado = ultimoPedido.id;
          sectorCreado = ultimoPedido.sector;
        }
      }

      if (idCreado) {
        setMessage(
          `✅ Pedido creado con éxito. PIC #${idCreado} del sector ${sectorCreado || "—"}.`
        );
        alert(
          `✅ Se creó tu PIC #${idCreado} del sector ${sectorCreado || "—"}.`
        );
      } else {
        setMessage("✅ Pedido creado con éxito.");
      }
      // Reset form
      setNecesidad("");
      setCategoria("");
      setSolicita("");
      setSector("");
      setEstado("iniciado");
      setArticulosSeleccionados([]);
   
      setAprueba("");

      setTimeout(() => {
        router.push("/protected");
      }, 500);
    } catch (error) {
      console.error(error);
      setMessage("❌ Error al crear el pedido");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded text-black">
      <h2 className="text-2xl font-bold mb-4">Crear Pedido General</h2>
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
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="RRHH">RRHH</option>
              <option value="Seguridad e Higiene">Seguridad e Higiene</option>
              <option value="Vidrio">Vidrio</option>
              <option value="Pvc">Pvc</option>
              <option value="Perf. Aluminio">Perf. Aluminio</option>
              <option value="Administracion">Administración</option>
              <option value="Colocaciones">Colocaciones</option>
              <option value="Reparaciones">Reparaciones</option>
              <option value="Mediciones">Mediciones</option>
              <option value="Maestranza">Maestranza</option>
              <option value="Compras">Compras</option>
              <option value="Calidad">Calidad</option>
              <option value="Flota">Flota</option>
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
              <option value="Julio A">Julio A.</option>
              <option value="Luciana L.">Luciana L.</option>
              <option value="Eduardo S.">Eduardo S.</option>
              <option value="Pedro S.">Pedro S.</option>
              <option value="Sofia S.">Sofia S.</option>
              <option value="Carolina S.">Carolina S.</option>
            </select>
          </div>

          <div>
            <label className="text-black">Notas</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="border p-2 w-full rounded text-black bg-white"
              placeholder="Observación general del pedido"
            />
          </div>

         
        </div>

        {/* 🔍 Agregar Artículo Manualmente */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Agregar Artículo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-black">Artículo *</label>
              <input
                type="text"
                value={articulo}
                onChange={(e) => setArticulo(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Nombre del artículo"
                required={articulosSeleccionados.length === 0}
              />
            </div>

            <div>
              <label className="text-black">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Descripción del artículo"
              />
            </div>

            <div>
              <label className="text-black">Cantidad *</label>
              <input
                type="number"
                min={1}
                value={cant}
                onChange={(e) => setCant(parseInt(e.target.value) || 1)}
                className="border p-2 w-full rounded text-black bg-white"
                required={articulosSeleccionados.length === 0}
              />
            </div>

            <div>
              <label className="text-black">Observación</label>
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Observación del artículo"
              />
            </div>

            <div>
              <label className="text-black">Código de Cuenta</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Código de cuenta"
              />
            </div>

            <div>
              <label className="text-black">Existencia</label>
              <input
                type="number"
                min={0}
                value={existencia}
                onChange={(e) => setExistencia(parseInt(e.target.value) || 0)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Stock actual"
              />
            </div>

            <div>
              <label className="text-black">Proveedor Sugerido</label>
              <input
                type="text"
                value={provsug}
                onChange={(e) => setProvsug(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="Proveedor sugerido"
              />
            </div>

            <div>
              <label className="text-black">Link de Ref</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="border p-2 w-full rounded text-black bg-white"
                placeholder="https://ejemplo.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 URL completa de la página web del artículo
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAgregarArticulo}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                ➕ Agregar Artículo
              </button>
            </div>
          </div>
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
                  <th className="border p-2">Observación</th>
                  <th className="border p-2">Código Cuenta</th>
                  <th className="border p-2">Existencia</th>
                  <th className="border p-2">Proveedor</th>
                  <th className="border p-2">Link Web</th>
                  <th className="border p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.map((art) => (
                  <tr key={art.id}>
                    <td className="border p-2">{art.articulo}</td>
                    <td className="border p-2">{art.descripcion}</td>
                    <td className="border p-2">{art.cant}</td>
                    <td className="border p-2">{art.observacion}</td>
                    <td className="border p-2">{art.cc}</td>
                    <td className="border p-2">{art.existencia}</td>
                    <td className="border p-2">{art.provsug}</td>
                    <td className="border p-2">
                      {art.link ? (
                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          🌐 Ver Web
                        </a>
                      ) : (
                        <span className="text-gray-400">Sin link</span>
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEliminarArticulo(art.id)}
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
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {loading ? "Cargando..." : "Crear pedido"}
          </Button>
        </div>
      </form>
    </div>
  );
}
