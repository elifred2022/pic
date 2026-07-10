"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPanolEmail } from "@/lib/panol-access";

type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  nota_solicitante?: string | null;
  sector: string;
  controlado: string;
  supervisor: string;
  aprueba: string;
  notas_aprobador?: string;
  nota_aprobador?: string;
  estado: string;
  observ: string;
  numero_oc: string | null;
  proveedor_seleccionado: string | null;
  comprador?: string | null;
  nota_comprador?: string | null;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string | null;
  rto: number | null;
  fac: number | null;
  articulos: {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    observacion: string;
    cant: number;
    provsug: string;
    codprovsug?: string;
    presentacion?: string;
  }[];
};

export default function ListaPedidosProductivos() {
   const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
    const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
    const [formData, setFormData] = useState<Partial<Pedido>>({});

    const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
    const [ocultarAprobados, setOcultarAprobados] = useState(false);
    const [ocultarAnulados, setOcultarAnulados] = useState(false);
    const [ocultarStandBy, setOcultarStandBy] = useState(false);
    const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
    const supabase = createClient();

    const enriquecerPedidosConCodProvSug = async (pedidos: Pedido[]): Promise<Pedido[]> => {
      const codints = [
        ...new Set(
          pedidos.flatMap((p) => (p.articulos ?? []).map((a) => a.codint).filter(Boolean))
        ),
      ];
      if (codints.length === 0) return pedidos;

      const { data } = await supabase
        .from("articulos")
        .select("codint, codprovsug, presentacion")
        .in("codint", codints);

      const datosPorCodint = new Map(
        (data ?? []).map((a) => [a.codint, a])
      );

      return pedidos.map((p) => ({
        ...p,
        articulos: (p.articulos ?? []).map((art) => {
          const desdeBd = datosPorCodint.get(art.codint);
          return {
            ...art,
            codprovsug: art.codprovsug ?? desdeBd?.codprovsug ?? "",
            presentacion: art.presentacion ?? desdeBd?.presentacion ?? "",
          };
        }),
      }));
    };
  
    /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
    useEffect(() => {
    const savedCumplidos = localStorage.getItem("ocultarCumplidos");
    const savedAprobados = localStorage.getItem("ocultarAprobados");
    const savedAnulados = localStorage.getItem("ocultarAnulados");
    const savedStandBy = localStorage.getItem("ocultarStandBy");
    const savedConfirmado = localStorage.getItem("ocultarConfirmado");
  
    if (savedCumplidos !== null) setOcultarCumplidos(savedCumplidos === "true");
    if (savedAprobados !== null) setOcultarAprobados(savedAprobados === "true");
    if (savedAnulados !== null) setOcultarAnulados(savedAnulados === "true");
    if (savedStandBy !== null) setOcultarStandBy(savedStandBy === "true");
    if (savedConfirmado !== null) setOcultarConfirmado(savedConfirmado === "true");
  }, []);
  
  
    /* Cada vez que cambia, actualizá localStorage */
   useEffect(() => {
    localStorage.setItem("ocultarCumplidos", String(ocultarCumplidos));
  }, [ocultarCumplidos]);
  
  useEffect(() => {
    localStorage.setItem("ocultarAprobados", String(ocultarAprobados));
  }, [ocultarAprobados]);
  
  useEffect(() => {
    localStorage.setItem("ocultarAnulados", String(ocultarAnulados));
  }, [ocultarAnulados]);
  
  useEffect(() => {
    localStorage.setItem("ocultarStandBy", String(ocultarStandBy));
  }, [ocultarStandBy]);
  
  useEffect(() => {
    localStorage.setItem("ocultarConfirmado", String(ocultarConfirmado));
  }, [ocultarConfirmado]);
  
  
  // Cargar datos
    useEffect(() => {
    const fetchPedidos = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
  
  
      if (userError) {
        console.error("Error obteniendo el usuario:", userError);
        return;
      }
  
      if (!user) {
        console.warn("No hay usuario logueado");
        return;
      }

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("uuid", user.id)
        .maybeSingle();
      const rol = perfil?.rol ?? null;

      setCurrentUserEmail(user.email ?? null);
      setCurrentUserRol(rol);
  
      let query = supabase.from("pedidos_productivos").select("*");
      if (!isPanolEmail(user.email, rol)) {
        query = query.eq("uuid", user.id); // 👈 Filtra por usuario logueado
      }

      const { data, error } = await query;
  
      if (error) console.error("Error cargando pedidos:", error);
      else if (data) {
        const pedidosEnriquecidos = await enriquecerPedidosConCodProvSug(data);
        setPedidos(pedidosEnriquecidos);
      }
    };
  
    fetchPedidos();
  }, [supabase]);


  
   
  
    // funcion para formatear las fechas
   function formatDate(dateString: string | null): string {
    if (!dateString) return "-";
  
    // Evitar que el navegador aplique zona horaria
    const parts = dateString.split("T")[0].split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // meses en JS van de 0 a 11
    const day = parseInt(parts[2]);
  
    const date = new Date(year, month, day); // Esto crea la fecha en hora local
    return date.toLocaleDateString("es-AR");
  }
  
  //Campos de tabla que son fecha para funcion filtrar
  const dateFields: (keyof Pedido)[] = [
    "created_at",
    "necesidad",
    "fecha_conf",
    "fecha_prom",
    "fecha_ent",
  ];
  
  //Filtro que también contempla las fechas
  const filteredPedidos = pedidos
    .filter((pedido) => {
      const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
      if (!s) return true;                     // si el input está vacío, no filtra nada
  
      // Buscar en campos principales del pedido
      const mainFieldsMatch = Object.entries(pedido).some(([key, value]) => {
        if (value === null || value === undefined) return false;
  
        // A) Comparar contra la versión texto “tal cual viene”
        if (String(value).toLowerCase().includes(s)) return true;
  
        // B) Si el campo es fecha, probar otras representaciones
        if (dateFields.includes(key as keyof Pedido)) {
          const isoDate = String(value).split("T")[0];          // YYYY-MM-DD
          const niceDate = formatDate(value as string);         // DD/MM/YYYY
  
          return (
            isoDate.toLowerCase().includes(s) ||
            niceDate.toLowerCase().includes(s)
          );
        }
        return false;
      });

      // Si ya encontró en campos principales, retornar true
      if (mainFieldsMatch) return true;

      // Buscar dentro del array de artículos
      if (pedido.articulos && Array.isArray(pedido.articulos)) {
        return pedido.articulos.some(articulo => {
          // Buscar en todos los campos del artículo
          return Object.values(articulo).some(value => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(s);
          });
        });
      }

      return false;
    })
   .filter((pedido) => {
    if (ocultarCumplidos && pedido.estado === "cumplido") return false;
    if (ocultarAprobados && pedido.estado === "aprobado") return false;
    if (ocultarAnulados && pedido.estado === "anulado") return false;
    if (ocultarStandBy && pedido.estado === "stand by") return false;
    if (ocultarConfirmado && pedido.estado === "confirmado") return false;
    return true;
  });
  
  
  
  function renderValue(value: unknown): string {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      value === ""
    ) {
      return "-";
    }
  
    return String(value);
  }

  function toDateInputValue(dateString: string | null | undefined): string {
    if (!dateString) return "";
    return dateString.split("T")[0];
  }

  const isPanolUser = isPanolEmail(currentUserEmail, currentUserRol);

  const handleSaveEdit = async () => {
    if (!editingPedido) return;

    const payload: Pick<
      Pedido,
      "fecha_ent" | "rto" | "fac" | "observ" | "nota_solicitante"
    > = {
      fecha_ent: formData.fecha_ent || null,
      rto: formData.rto ?? null,
      fac: formData.fac ?? null,
      observ: formData.observ || "",
      nota_solicitante: formData.nota_solicitante?.trim() || null,
    };

    const { error } = await supabase
      .from("pedidos_productivos")
      .update(payload)
      .eq("id", editingPedido.id);

    if (error) {
      console.error("Error actualizando datos de entrega:", error);
      return;
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === editingPedido.id
          ? {
              ...p,
              fecha_ent: (payload.fecha_ent as string) || p.fecha_ent,
              rto: payload.rto,
              fac: payload.fac,
              observ: payload.observ,
              nota_solicitante: payload.nota_solicitante,
            }
          : p,
      ),
    );

    setEditingPedido(null);
    setFormData({});
  };

// Estilos para la tabla (comentados por ahora)
// const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
// const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";


  return (
    <div className="flex-1 w-full p-4 bg-gray-50 min-h-screen">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <Link
            href="/auth/modulo-compras"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            ← Atrás
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-800">🏭 Pedidos Productivos</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <Link
            href="/auth/rutaproductivos/crear-formpedidosproductivos"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
          >
            ➕ Crear Pedido Productivo
          </Link>
          
          <input
            type="text"
            placeholder="🔍 Buscar pedido productivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>
      </div>

      {/* Filtros con mejor diseño */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🎛️ Filtros de estado</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarCumplidos}
              onChange={() => setOcultarCumplidos((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar cumplidos</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarAprobados}
              onChange={() => setOcultarAprobados((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar aprobados</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarConfirmado}
              onChange={() => setOcultarConfirmado((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar confirmados</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarAnulados}
              onChange={() => setOcultarAnulados((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar anulados</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarStandBy}
              onChange={() => setOcultarStandBy((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar stand-by</span>
          </label>
        </div>
      </div>

      {/* Tabla con scroll horizontal y encabezado congelado */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
              <tr>
                {isPanolUser && (
                  <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Acciones</th>
                )}
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Nº PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Solicitante</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Artículos Solicitados</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Observaciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Controlado/Revisado</th>
                {isPanolUser && (
                  <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Comprador</th>
                )}
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Aprueba</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Proveedor Seleccionado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Confirmación</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Prometida</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Entrega</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">FAC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">RTO</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-200">
                  {isPanolUser && (
                    <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                      <button
                        onClick={() => {
                          setEditingPedido(p);
                          setFormData({
                            fecha_ent: toDateInputValue(p.fecha_ent),
                            rto: p.rto,
                            fac: p.fac,
                            observ: p.observ || "",
                            nota_solicitante: p.nota_solicitante ?? "",
                          });
                        }}
                        className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 text-sm"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <span
                      className={
                        p.estado === "anulado"
                          ? "px-3 py-2 bg-red-100 text-red-800 text-sm font-semibold rounded-full"
                          : p.estado === "aprobado"
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : p.estado === "cotizado"
                          ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                          : p.estado === "iniciado"
                          ? "px-3 py-2 bg-orange-50 text-orange-500 text-sm font-semibold rounded-full"
                          : p.estado === "visto/recibido" || p.estado === "Visto/recibido"
                          ? "px-3 py-2 bg-orange-50 text-orange-500 text-sm font-semibold rounded-full"
                          : p.estado === "stand by"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                          : p.estado === "Presentar presencial"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                          : p.estado === "cumplido"
                          ? "px-3 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-full"
                          : p.estado === "entrego parcial" || p.estado === "entrego_parcial"
                          ? "px-3 py-2 bg-orange-50 text-orange-500 text-sm font-semibold rounded-full"
                          : p.estado === "confirmado"
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : "px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full"
                      }
                    >
                      {renderValue(p.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium text-lg">{p.id}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.necesidad)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.categoria}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{p.solicita}</span>
                      {p.nota_solicitante?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {p.nota_solicitante}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.sector}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    {p.articulos && p.articulos.length > 0 ? (
                      <div className="space-y-2">
                        {p.articulos.map((art, index) => (
                          <div key={index} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="font-medium text-gray-800">{art.articulo}</div>
                            <div className="text-gray-600 text-xs">Desc: {renderValue(art.descripcion)}</div>
                            <div className="text-gray-600 text-xs">Presentacion: {art.presentacion?.trim() ? art.presentacion : "-"}</div>
                            <div className="text-gray-600">Cant: {art.cant}</div>
                            <div className="text-gray-600">Stock: {art.existencia ?? "-"}</div>
                            <div className="text-gray-600">Prov: {art.provsug || "-"}</div>
                            <div className="text-gray-600">Cod. prov. sug.: {art.codprovsug?.trim() ? art.codprovsug : "-"}</div>
                            <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">Código: {art.codint}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">- Sin artículos -</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="max-w-xs">
                      <span className="text-sm text-gray-700 bg-orange-50 px-2 py-1 rounded">{p.observ || "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                     <div className="flex flex-col gap-1">
                       <span className="text-sm font-medium text-gray-700">{p.controlado}</span>
                       <span className="text-sm text-gray-600">{p.supervisor || "-"}</span>
                     </div>
                   </td>
                  {isPanolUser && (
                    <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-gray-800">{renderValue(p.comprador)}</span>
                        {p.nota_comprador?.trim() ? (
                          <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                            {p.nota_comprador}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-orange-600 font-medium text-lg">{renderValue(p.aprueba)}</span>
                      <span
                        className={
                          (p.notas_aprobador || p.nota_aprobador)?.trim()
                            ? "text-xs text-blue-700 font-bold max-w-[180px] break-words whitespace-pre-wrap"
                            : "text-xs text-gray-400"
                        }
                      >
                        {(p.notas_aprobador || p.nota_aprobador)?.trim() ||
                          "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{p.numero_oc || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{p.proveedor_seleccionado || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_conf)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_prom)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_ent)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.fac || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.rto || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar entrega #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">
                Carga de fecha entrega, RTO, FAC y notas del solicitante
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Entrega:</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={toDateInputValue(formData.fecha_ent)}
                    onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.observ ?? ""}
                    onChange={(e) => setFormData({ ...formData, observ: e.target.value })}
                    placeholder="Agregá o modificá observaciones"
                  />
                </div>
                {isPanolUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas del solicitante:
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y min-h-[88px]"
                      value={formData.nota_solicitante ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nota_solicitante: e.target.value })
                      }
                      placeholder="Aclaraciones del solicitante sobre el pedido"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RTO:</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.rto ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rto: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">FAC:</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.fac ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fac: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingPedido(null);
                    setFormData({});
                  }}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  💾 Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
