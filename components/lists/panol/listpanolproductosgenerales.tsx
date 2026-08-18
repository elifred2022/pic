"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PicRealtimeListener from "../../realtime/picrealtimelistener";
import { isPanolEmail } from "@/lib/panol-access";
import {
  appendHistoricoEstado,
  formatHistoricoEntry,
  parseHistoricoEstado,
  type HistoricoEstadoEntry,
} from "@/lib/historico-estado-pedidos-productivos";
import { ArticuloImagenesThumbs } from "@/components/pedidos/articulo-imagenes-thumbs";
import { fetchCurrentUserNombre } from "@/lib/user-rol";

type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  sector: string;
  cc: number;
  cant: number;
  existencia: number;
  articulos: Array<{
    articulo: string;
    descripcion?: string;
    cant: number;
    cant_exist?: number;
    observacion?: string;
    imagenes?: string[];
  }>; // Array de artículos
  descripcion: string;
  controlado: string;
  superviso: string;
  estado: string;
  historico_estado?: HistoricoEstadoEntry[] | null;
  aprueba: string;
  notas_aprobador?: string;
  nota_aprobador?: string;
  nota_solicitante?: string | null;
  comprador?: string | null;
  notas_comprador?: string | null;
  oc: number;
  proveedor_selec: string;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
};

export default function ListPanolProductosGenerales() {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarAprobados, setOcultarAprobados] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [ocultarStandBy, setOcultarStandBy] = useState(false);
  const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editarAbiertoRef = useRef<string | null>(null);

  const openEditPedido = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setFormData({
      created_at: pedido.created_at,
      necesidad: pedido.necesidad,
      categoria: pedido.categoria,
      solicita: pedido.solicita,
      sector: pedido.sector,
      cc: pedido.cc,
      articulos: pedido.articulos,
      descripcion: pedido.descripcion,
      controlado: pedido.controlado,
      superviso: pedido.superviso,
      estado:
        pedido.estado === "entrego_parcial"
          ? "entrego parcial"
          : pedido.estado,
      oc: pedido.oc,
      proveedor_selec: pedido.proveedor_selec,
      fecha_conf: pedido.fecha_conf,
      fecha_prom: pedido.fecha_prom,
      fecha_ent: pedido.fecha_ent,
      rto: pedido.rto,
      fac: pedido.fac,
      nota_solicitante: pedido.nota_solicitante ?? "",
    });
  };

  // Para que no desactive checkbox al reset página - Al montar, leé localStorage
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
       
  // Cada vez que cambia, actualizá localStorage
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

    let query = supabase.from("pic").select("*");
    if (!isPanolEmail(user.email, perfil?.rol)) {
      query = query.eq("uuid", user.id);
    }
    const { data, error } = await query;

    if (error) console.error("Error cargando pedidos:", error);
    else setPedidos(data);
  };

  fetchPedidos();
}, [supabase]);

  useEffect(() => {
    const editarId = searchParams.get("editar");
    if (!editarId || pedidos.length === 0) return;
    if (editarAbiertoRef.current === editarId) return;

    const pedido = pedidos.find((p) => String(p.id) === editarId);
    if (!pedido) return;

    editarAbiertoRef.current = editarId;
    openEditPedido(pedido);
  }, [searchParams, pedidos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Función para formatear las fechas
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

  // Campos de tabla que son fecha para función filtrar
const dateFields: (keyof Pedido)[] = [
  "created_at",
  "necesidad",
  "fecha_conf",
  "fecha_prom",
  "fecha_ent",
];

  // Filtro que también contempla las fechas
const filteredPedidos = pedidos
  .filter((pedido) => {
    const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
    if (!s) return true;                     // si el input está vacío, no filtra nada

    return Object.entries(pedido).some(([key, value]) => {
      if (value === null || value === undefined) return false;

        // A) Comparar contra la versión texto "tal cual viene"
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

  const thClass =
    "whitespace-nowrap px-2 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 sticky top-0 z-10 text-left";
  const tdClass = "px-2 py-1.5 align-top text-xs text-slate-700 border-t-2 border-slate-200";
  const filterLabelClass =
    "flex items-center gap-2 cursor-pointer hover:bg-white/80 px-1.5 py-1 rounded transition-colors";

  const estadoBadgeClass = (estado: string) => {
    const base = "inline-block px-1.5 py-0 text-[10px] leading-tight font-semibold rounded";
    if (estado === "anulado") return `${base} bg-red-100 text-red-800`;
    if (estado === "aprobado" || estado === "confirmado") return `${base} bg-green-100 text-green-800`;
    if (estado === "cotizado") return `${base} bg-yellow-100 text-yellow-800`;
    if (estado === "iniciado" || estado === "visto/recibido" || estado === "Visto/recibido") {
      return `${base} bg-orange-50 text-orange-500`;
    }
    if (estado === "stand by" || estado === "Presentar presencial") {
      return `${base} bg-orange-100 text-orange-800`;
    }
    if (estado === "cumplido") return `${base} bg-blue-50 text-blue-600`;
    if (estado === "entrego parcial" || estado === "entrego_parcial") {
      return `${base} bg-orange-50 text-orange-500`;
    }
    return `${base} bg-gray-100 text-gray-600`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/auth/modulo-compras"
          className="inline-block px-4 sm:px-5 py-2 bg-slate-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 touch-manipulation"
        >
          Volver
        </Link>
        <Link
          href="/auth/crear-formus"
          className="inline-block px-4 sm:px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 touch-manipulation"
        >
          Crear nuevo pedido
        </Link>
      </div>

      <PicRealtimeListener />

      <div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Pedidos generales pañol</h1>
              <p className="text-blue-100 text-xs mt-0.5">
                Seguimiento de pedidos generales y entregas
              </p>
            </div>
            <input
              type="search"
              placeholder="Buscar pedido general..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full sm:max-w-xs rounded-md border border-white/30 bg-white/95 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Filtros de estado</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarCumplidos}
                  onChange={() => setOcultarCumplidos((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar cumplidos</span>
              </label>

              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarAprobados}
                  onChange={() => setOcultarAprobados((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar aprobados</span>
              </label>

              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarConfirmado}
                  onChange={() => setOcultarConfirmado((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar confirmados</span>
              </label>

              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarAnulados}
                  onChange={() => setOcultarAnulados((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar anulados</span>
              </label>

              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarStandBy}
                  onChange={() => setOcultarStandBy((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar stand by</span>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
              <table className="w-full table-auto border-collapse text-[11px] leading-snug sm:text-xs">
                <thead className="bg-slate-100">
              <tr>
                <th className={thClass}>Acciones</th>
                <th className={thClass}>Estado</th>
                <th className={thClass}>Nº PIC</th>
                <th className={thClass}>Fecha Sol</th>
                <th className={thClass}>Fecha Nec</th>
                <th className={thClass}>Categoría</th>
                <th className={thClass}>Solicita</th>
                <th className={thClass}>Sector</th>
                <th className={thClass}>Cod Cta</th>
                <th className={thClass}>Artículos solicitados</th>
                <th className={thClass}>Controlado/Revisado</th>
                <th className={thClass}>Comprador</th>
                <th className={thClass}>Aprueba</th>
                <th className={thClass}>OC</th>
                <th className={thClass}>Proveedor selec.</th>
                <th className={thClass}>Fecha confirm.</th>
                <th className={thClass}>Fecha prometida</th>
                <th className={thClass}>Fecha entrega</th>
                <th className={thClass}>Rto</th>
                <th className={thClass}>Fact</th>
          </tr>
        </thead>
       <tbody>
  {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="even:bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                  <td className={tdClass}>
                    <div className="flex flex-col gap-1">
          <button
                        className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-medium rounded hover:bg-blue-100 transition-colors text-[10px] whitespace-nowrap"
            onClick={() => openEditPedido(pedido)}
          >
                        Editar
          </button>
        </div>
      </td>
                  <td className={tdClass}>
       <div className="flex min-w-[7rem] flex-col gap-0.5">
                <span className={estadoBadgeClass(pedido.estado)}>
                   {renderValue(pedido.estado)}
                </span>
                {parseHistoricoEstado(pedido.historico_estado).map((h, index) => (
                  <span
                    key={`${h.estado}-${h.fecha}-${index}`}
                    className="text-[10px] leading-tight text-slate-500 tabular-nums"
                  >
                    {formatHistoricoEntry(h)}
                  </span>
                ))}
       </div>
      </td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums font-medium`}>{pedido.id}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(pedido.created_at) || "-"}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(pedido.necesidad)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{pedido.categoria}</td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-0.5 max-w-[9rem]">
                      <span className="font-medium text-slate-800">{pedido.solicita}</span>
                      {pedido.nota_solicitante?.trim() ? (
                        <span className="text-[10px] text-blue-700 font-semibold whitespace-pre-wrap break-words">
                          {pedido.nota_solicitante}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{pedido.sector}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{pedido.cc}</td>
                  <td className={tdClass}>
                     <div className="min-w-[14rem] max-w-[20rem]">
                       {Array.isArray(pedido.articulos) ? (
                         <table className="w-full text-[10px]">
                           <thead>
                             <tr className="border-b border-gray-200">
                               <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Artículo</th>
                               <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Descripción</th>
                               <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Cant.</th>
                               <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Stock</th>
                               <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Observ.</th>
                             </tr>
                           </thead>
                           <tbody>
                             {pedido.articulos.map((a, idx: number) => (
                               <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                                 <td className="px-1 py-0.5 font-medium">
                                   {a.articulo}
                                   <ArticuloImagenesThumbs paths={a.imagenes} />
                                 </td>
                                 <td className="px-1 py-0.5 text-slate-600">{a.descripcion}</td>
                                 <td className="px-1 py-0.5 text-center font-semibold">{a.cant}</td>
                                 <td className="px-1 py-0.5 text-center">{a.cant_exist}</td>
                                 <td className="px-1 py-0.5 text-slate-500">{a.observacion}</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       ) : (
                         <span className="text-slate-400">Sin artículos</span>
                       )}
                     </div>
                   </td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                      <span className="font-medium">{pedido.controlado}</span>
                      <span className="text-slate-500">{pedido.superviso}</span>
                </div>
              </td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-0.5 max-w-[9rem]">
                      <span className="font-medium text-slate-800">{renderValue(pedido.comprador)}</span>
                      {pedido.notas_comprador?.trim() ? (
                        <span className="text-[10px] text-blue-700 font-semibold whitespace-pre-wrap break-words">
                          {pedido.notas_comprador}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-0.5 max-w-[8rem]">
                      <span className="font-medium">{renderValue(pedido.aprueba)}</span>
                      <span
                        className={
                          (pedido.notas_aprobador || pedido.nota_aprobador)?.trim()
                            ? "text-[10px] text-blue-700 font-semibold break-words whitespace-pre-wrap"
                            : "text-[10px] text-slate-400"
                        }
                      >
                        {(pedido.notas_aprobador || pedido.nota_aprobador)?.trim() ||
                          "-"}
                      </span>
                    </div>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-orange-600 font-medium tabular-nums`}>{pedido.oc}</td>
                  <td className={`${tdClass} max-w-[9rem] truncate text-orange-600 font-medium`} title={renderValue(pedido.proveedor_selec)}>{renderValue(pedido.proveedor_selec)}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(pedido.fecha_conf)}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(pedido.fecha_prom)}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(pedido.fecha_ent)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{pedido.rto || ""}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{pedido.fac || ""}</td>
    </tr>
  ))}
</tbody>
      </table>
        </div>
      </div>
        </div>
      </div>

      {/* Modal de edición */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">
                Modifica fechas de entrega, RTO, FAC y notas del solicitante
              </p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Cantidad Total:</span> {editingPedido.cant}</p>
                    <p><span className="font-medium">Artículos:</span> {Array.isArray(editingPedido.articulos) ? editingPedido.articulos.length : 0}</p>
                    <p><span className="font-medium">Estado:</span> {editingPedido.estado}</p>
                    <p><span className="font-medium">Estado:</span> {editingPedido.estado}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📅 Fechas</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(editingPedido.necesidad)}</p>
                    <p><span className="font-medium">Fecha confirmación:</span> {formatDate(editingPedido.fecha_conf)}</p>
                    <p><span className="font-medium">Fecha prometida:</span> {formatDate(editingPedido.fecha_prom)}</p>
                  </div>
                </div>
              </div>

              {/* Lista detallada de artículos */}
              {Array.isArray(editingPedido.articulos) && editingPedido.articulos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📋</span>
                    Lista de Artículos del Pedido
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left text-gray-600 font-semibold">Artículo</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-semibold">Descripción</th>
                          <th className="px-3 py-2 text-center text-gray-600 font-semibold">Cantidad</th>
                          <th className="px-3 py-2 text-center text-gray-600 font-semibold">Stock</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-semibold">Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingPedido.articulos.map((a, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2 font-medium text-gray-800">{a.articulo}</td>
                            <td className="px-3 py-2 text-gray-700">{a.descripcion}</td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-800">{a.cant}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{a.cant_exist}</td>
                            <td className="px-3 py-2 text-gray-600">{a.observacion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <hr className="my-6" />

                             {/* Campos de edición */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Estado:
                   </label>
                   <select
                     className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                     value={
                       formData.estado === "entrego_parcial"
                         ? "entrego parcial"
                         : formData.estado || ""
                     }
                     onChange={(e) =>
                       setFormData({ ...formData, estado: e.target.value })
                     }
                   >
                     {formData.estado &&
                       formData.estado !== "cumplido" &&
                       formData.estado !== "entrego parcial" &&
                       formData.estado !== "entrego_parcial" && (
                         <option value={formData.estado}>
                           {formData.estado}
                         </option>
                       )}
                     <option value="cumplido">Cumplido</option>
                     <option value="entrego parcial">Entrego parcial</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Entrega:</label>
               <input
                 type="date"
                     className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                 value={formData.fecha_ent ?? ""}
                 onChange={(e) =>
                   setFormData({ ...formData, fecha_ent: e.target.value })
                 }
               />
                 </div>
            
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">RTO:</label>
               <input
                     type="number"
                     className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                     value={formData.rto ?? ""}
                 onChange={(e) =>
                       setFormData({ ...formData, rto: Number(e.target.value) })
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
                       setFormData({ ...formData, fac: Number(e.target.value) })
                 }
               />
                 </div>

                 <div className="md:col-span-2">
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
               </div>
          
              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingPedido(null)}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                  ❌ Cancelar
              </button>
              <button
                onClick={async () => {
                  const payload = { ...formData };
                  const rawNs = payload.nota_solicitante;
                  payload.nota_solicitante =
                    typeof rawNs === "string" && rawNs.trim() ? rawNs.trim() : null;
                  if (payload.estado === "entrego_parcial") {
                    payload.estado = "entrego parcial";
                  }

                  const historicoNuevo = appendHistoricoEstado(
                    editingPedido.historico_estado,
                    editingPedido.estado,
                    payload.estado,
                    await fetchCurrentUserNombre(supabase)
                  );
                  if (historicoNuevo) {
                    payload.historico_estado = historicoNuevo;
                  }

                  const { error } = await supabase
                    .from("pic")
                    .update(payload)
                    .eq("id", editingPedido.id);

                  if (error) {
                    alert("Error actualizando");
                    console.error(error);
                  } else {
                    alert("Actualizado correctamente");
                    setEditingPedido(null);
                    setFormData({});
                    const {
                          data: { user },
                        } = await supabase.auth.getUser();

                        if (user) {
                          const { data: perfil } = await supabase
                            .from("usuarios")
                            .select("rol")
                            .eq("uuid", user.id)
                            .maybeSingle();
                          let q = supabase.from("pic").select("*");
                          if (!isPanolEmail(user.email, perfil?.rol)) {
                            q = q.eq("uuid", user.id);
                          }
                          const { data } = await q;
                          if (data) setPedidos(data);
                        }

                      // Redirigir a la página de pedidos generales
                      router.push("/auth/list-panolpedidosgenerales");
                  }
                }}
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
