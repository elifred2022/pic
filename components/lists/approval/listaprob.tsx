"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOcVolver } from "@/hooks/use-oc-volver";
import {
  useComparativaPresupuestoUrls,
  useOcFacturaAdjunto,
} from "@/hooks/use-adjuntos-compras-view";
import { canViewAdjuntosCompras, isAprobEmail } from "@/lib/panol-access";
import {
  appendHistoricoEstado,
  formatHistoricoEntry,
  parseHistoricoEstado,
  type HistoricoEstadoEntry,
} from "@/lib/historico-estado-pedidos-productivos";
import { ArticuloImagenesThumbs } from "@/components/pedidos/articulo-imagenes-thumbs";

const ESTADOS_APROBADOR = [
  { value: "aprobado", label: "Aprobado" },
  { value: "autorizado por finanza", label: "Autorizado por finanza" },
  { value: "no aprobado", label: "No aprobado" },
  { value: "stand by", label: "Stand By" },
] as const;

type ArticuloComparativa = {
  articulo: string;
  cant: number;
  precioUnitario: number | null;
  descuentoPorcentaje: number;
  subtotal: number;
};

type ProveedorComparativa = {
  nombreProveedor: string;
  articulos: ArticuloComparativa[];
  total: number;
  presupuesto_path?: string | null;
};

type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  nota_solicitante?: string | null;
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
    link?: string;
    imagenes?: string[];
  }>; // Array de artículos
 
  controlado: string;
  superviso: string;
  prov_uno: string;
  cost_prov_uno: number;
  subt_prov1: number;
  prov_dos: string;
  cost_prov_dos: number;
  subt_prov2: number;
  prov_tres: string;
  cost_prov_tres: number;
  subt_prov3: number;
  estado: string;
  historico_estado?: HistoricoEstadoEntry[] | null;
  aprueba: string;
  notas_aprobador: string;
  notas: string;
  oc: number;
  proveedor_selec: string;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  comparativa_prov?: ProveedorComparativa[] | null;
  notas_comprador?: string;
  comprador?: string | null;
};

export default function ListAprob() {
  const searchParams = useSearchParams();
  const { resolveOcParaPedido } = useOcVolver();
  const comparativaAbiertaRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [comparativaOcId, setComparativaOcId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [userNombre, setUserNombre] = useState<string | null>(null);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarAprobados, setOcultarAprobados] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [ocultarStandBy, setOcultarStandBy] = useState(false);
  const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
  const [ocultarNoAprobados, setOcultarNoAprobados] = useState(false);
  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const supabase = createClient();

  const puedeVerAdjuntos = canViewAdjuntosCompras(userEmail, userRol);
  const presupuestoUrls = useComparativaPresupuestoUrls(
    puedeVerAdjuntos ? editingPedido?.comparativa_prov : null
  );
  const { facturaViewUrl, facturaFc } = useOcFacturaAdjunto(
    puedeVerAdjuntos ? comparativaOcId : null
  );

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserEmail(user?.email ?? null);
      if (user) {
        const { data: perfil } = await supabase
          .from("usuarios")
          .select("rol, nombre")
          .eq("uuid", user.id)
          .maybeSingle();
        setUserRol(perfil?.rol ?? null);
        setUserNombre(perfil?.nombre?.trim() || user.email || null);
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!editingPedido) {
      setComparativaOcId(null);
      return;
    }
    let cancelled = false;
    void resolveOcParaPedido({
      id: editingPedido.id,
      numero_oc: editingPedido.oc,
    }).then((oc) => {
      if (!cancelled) setComparativaOcId(oc?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [editingPedido?.id, editingPedido?.oc, resolveOcParaPedido]);

  useEffect(() => {
    const comparativaId = searchParams.get("comparativa");
    if (!comparativaId || pedidos.length === 0) return;
    if (comparativaAbiertaRef.current === comparativaId) return;

    const pedido = pedidos.find((p) => String(p.id) === comparativaId);
    if (!pedido) return;

    comparativaAbiertaRef.current = comparativaId;
    setEditingPedido(pedido);
    setFormData(pedido);
  }, [searchParams, pedidos]);

  // Para que no desactive checkbox al reset página - Al montar, leé localStorage
  useEffect(() => {
    const savedCumplidos = localStorage.getItem("ocultarCumplidos");
    const savedAprobados = localStorage.getItem("ocultarAprobados");
    const savedAnulados = localStorage.getItem("ocultarAnulados");
    const savedStandBy = localStorage.getItem("ocultarStandBy");
    const savedConfirmado = localStorage.getItem("ocultarConfirmado");
    const savedNoAprobados = localStorage.getItem("ocultarNoAprobados");
   
    if (savedCumplidos !== null) setOcultarCumplidos(savedCumplidos === "true");
    if (savedAprobados !== null) setOcultarAprobados(savedAprobados === "true");
    if (savedAnulados !== null) setOcultarAnulados(savedAnulados === "true");
    if (savedStandBy !== null) setOcultarStandBy(savedStandBy === "true");
    if (savedConfirmado !== null) setOcultarConfirmado(savedConfirmado === "true");
    if (savedNoAprobados !== null) setOcultarNoAprobados(savedNoAprobados === "true");
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

  useEffect(() => {
    localStorage.setItem("ocultarNoAprobados", String(ocultarNoAprobados));
  }, [ocultarNoAprobados]);

  // Cargar datos
  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("pic").select("*")
  
      if (error) console.error("Error cargando pedidos:", error);
      else setPedidos(data);
    };
    fetchPedidos();
  }, [supabase]);

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
      if (ocultarNoAprobados && pedido.estado === "no aprobado") return false;
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
    if (estado === "anulado" || estado === "no aprobado") return `${base} bg-red-100 text-red-800`;
    if (
      estado === "aprobado" ||
      estado === "confirmado" ||
      estado === "autorizado por finanza"
    ) {
      return `${base} bg-green-100 text-green-800`;
    }
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
          Crear pedido general
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Pedidos generales aprobación</h1>
              <p className="text-blue-100 text-xs mt-0.5">
                Revisión y aprobación de pedidos generales
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

              <label className={filterLabelClass}>
                <input
                  type="checkbox"
                  checked={ocultarNoAprobados}
                  onChange={() => setOcultarNoAprobados((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">Ocultar no aprobados</span>
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
                <th className={thClass}>Artículos solicitados</th>
                <th className={thClass}>Notas</th>
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
                        onClick={() => {
                          setEditingPedido(pedido);
                          setFormData({
                            created_at: pedido.created_at,
                            necesidad: pedido.necesidad,
                            categoria: pedido.categoria,
                            solicita: pedido.solicita,
                            nota_solicitante: pedido.nota_solicitante,
                            sector: pedido.sector,
                            cc: pedido.cc,
                            cant: pedido.cant,
                            existencia: pedido.existencia,
                            articulos: pedido.articulos,
                            notas: pedido.notas,
                            controlado: pedido.controlado,
                            superviso: pedido.superviso,
                            estado: pedido.estado,
                            aprueba: pedido.aprueba,
                            notas_aprobador: pedido.notas_aprobador,
                            oc: pedido.oc,
                            proveedor_selec: pedido.proveedor_selec,
                            fecha_conf: pedido.fecha_conf,
                            fecha_prom: pedido.fecha_prom,
                            fecha_ent: pedido.fecha_ent,
                            rto: pedido.rto,
                            fac: pedido.fac,
                            notas_comprador: pedido.notas_comprador,
                            comprador: pedido.comprador,
                          });
                        }}
                      >
                        Aprobar/Edit
                      </button>
                    </div>
                  </td>
                  <td className={`${tdClass} min-w-[14rem]`}>
                    <div className="flex flex-col gap-0.5">
                      <span className={estadoBadgeClass(pedido.estado)}>
                        {renderValue(pedido.estado)}
                      </span>
                      {parseHistoricoEstado(pedido.historico_estado).map((h, index) => (
                        <span
                          key={`${h.estado}-${h.fecha}-${index}`}
                          className="text-[10px] leading-tight text-slate-500 tabular-nums whitespace-nowrap"
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
                              <th className="px-1 py-0.5 text-left text-slate-500 font-semibold">Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pedido.articulos.map((a, idx: number) => (
                              <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-1 py-0.5 font-medium">
                                  {a.articulo}
                                  <ArticuloImagenesThumbs paths={a.imagenes} />
                                </td>
                                <td className="px-1 py-0.5 text-slate-600 max-w-32 break-words leading-tight">
                                  {a.descripcion && a.descripcion.length > 30
                                    ? `${a.descripcion.substring(0, 30)}...`
                                    : a.descripcion || "-"}
                                </td>
                                <td className="px-1 py-0.5 text-center font-semibold">{a.cant}</td>
                                <td className="px-1 py-0.5 text-center">{a.cant_exist}</td>
                                <td className="px-1 py-0.5">
                                  {a.link ? (
                                    <a
                                      href={a.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline break-all"
                                    >
                                      Ver
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <span className="text-slate-400">Sin artículos</span>
                      )}
                    </div>
                  </td>
                  <td className={`${tdClass} text-red-600 max-w-[8rem] break-words`}>{renderValue(pedido.notas)}</td>
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
                      <span className="text-[10px] text-red-600 break-words">
                        {pedido.notas_aprobador || "-"}
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
          <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1900px] max-h-[95vh] overflow-y-auto overflow-x-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido general</p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(editingPedido.necesidad)}</p>
                    <p><span className="font-medium">Sector:</span> {editingPedido.sector}</p>
                    <p><span className="font-medium">Solicitante:</span> {editingPedido.solicita}</p>
                    {editingPedido.nota_solicitante?.trim() ? (
                      <p className="text-sm text-blue-700 font-bold whitespace-pre-wrap">
                        <span className="font-medium text-gray-800">Notas solicitante:</span>{" "}
                        {editingPedido.nota_solicitante}
                      </p>
                    ) : null}
                    <p><span className="font-medium">Aprueba:</span> {editingPedido.aprueba}</p>
                  </div>
                </div>

                                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos</h3>
                   <div className="space-y-2 text-sm">
                     <p><span className="font-medium">Cantidad Total:</span> {editingPedido.cant}</p>
                     <p><span className="font-medium">Cantidad de Artículos:</span> {Array.isArray(editingPedido.articulos) ? editingPedido.articulos.length : 0}</p>
                    
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
                           <th className="px-3 py-2 text-left text-gray-600 font-semibold">Link Ref</th>
                         </tr>
                       </thead>
                       <tbody>
                         {editingPedido.articulos.map((a, idx: number) => (
                           <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                             <td className="px-3 py-2 font-medium text-gray-800">
                               {a.articulo}
                               <ArticuloImagenesThumbs paths={a.imagenes} />
                             </td>
                             <td className="px-3 py-2 text-gray-700 max-w-32 break-words text-xs leading-tight">
                               {a.descripcion && a.descripcion.length > 30 
                                 ? `${a.descripcion.substring(0, 30)}...` 
                                 : a.descripcion || "-"}
                             </td>
                             <td className="px-3 py-2 text-center font-semibold text-gray-800">{a.cant}</td>
                             <td className="px-3 py-2 text-center text-gray-700">{a.cant_exist}</td>
                             <td className="px-3 py-2">
                               {a.link ? (
                                 <a
                                   href={a.link}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                                 >
                                   🌐 Ver
                                 </a>
                               ) : (
                                 <span className="text-gray-400 text-xs">-</span>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* Comparativa de proveedores */}
               <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💰</span>
                  Cotizaciones de Proveedores
                </h3>
                
                {/* Mostrar comparativa nueva si existe */}
                {editingPedido.comparativa_prov && Array.isArray(editingPedido.comparativa_prov) && editingPedido.comparativa_prov.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editingPedido.comparativa_prov.map((prov, provIndex) => (
                      <div key={provIndex} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm min-w-0">
                        <h4 className="font-medium text-gray-700 mb-3 text-center">
                          {prov.nombreProveedor || `Proveedor ${provIndex + 1}`}
                        </h4>
                        
                        {prov.articulos && prov.articulos.length > 0 && (
                          <div className="space-y-2 text-sm">
                            {prov.articulos.map((art, artIndex) => (
                              <div key={artIndex} className="bg-white p-2 rounded border">
                                <div className="font-medium text-gray-800 text-xs">{art.articulo}</div>
                                <div className="text-gray-600 text-xs">Cant: {art.cant}</div>
                                <div className="text-gray-600 text-xs">Precio: ${(art.precioUnitario || 0).toLocaleString("es-AR")}</div>
                                <div className="text-gray-600 text-xs">Desc.: {(art.descuentoPorcentaje || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</div>
                                <div className="text-gray-600 text-xs font-semibold">Subtotal: ${(art.subtotal || 0).toLocaleString("es-AR")}</div>
                              </div>
                            ))}
                            <div className="mt-3 text-center font-bold text-gray-800 bg-gray-50 p-2 rounded border text-sm">
                              Total: ${(prov.total || 0).toLocaleString("es-AR")}
                            </div>
                            {puedeVerAdjuntos && prov.presupuesto_path && (
                              <p className="mt-2 text-center text-sm">
                                {presupuestoUrls[provIndex] ? (
                                  <a
                                    href={presupuestoUrls[provIndex]!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline font-medium"
                                  >
                                    Ver presupuesto
                                  </a>
                                ) : (
                                  <span className="text-gray-500 text-xs">Cargando presupuesto...</span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Mostrar proveedores antiguos si no hay comparativa nueva */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-3">Proveedor 1</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Nombre:</span> {editingPedido.prov_uno}</p>
                        <p><span className="font-medium">Costo unitario:</span> ${Number(editingPedido.cost_prov_uno).toLocaleString("es-AR")}</p>
                        <p><span className="font-medium">Subtotal:</span> ${Number(editingPedido.subt_prov1).toLocaleString("es-AR")}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-3">Proveedor 2</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Nombre:</span> {editingPedido.prov_dos}</p>
                        <p><span className="font-medium">Costo unitario:</span> ${Number(editingPedido.cost_prov_dos).toLocaleString("es-AR")}</p>
                        <p><span className="font-medium">Subtotal:</span> ${Number(editingPedido.subt_prov2).toLocaleString("es-AR")}</p>
                      </div>
                    </div>
                     
                    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium text-gray-700 mb-3">Proveedor 3</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Nombre:</span> {editingPedido.prov_tres}</p>
                        <p><span className="font-medium">Costo unitario:</span> ${Number(editingPedido.cost_prov_tres).toLocaleString("es-AR")}</p>
                        <p><span className="font-medium">Subtotal:</span> ${Number(editingPedido.subt_prov3).toLocaleString("es-AR")}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Notas del comprador</p>
                  <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                    {renderValue(editingPedido.notas_comprador)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Notas del aprobador</p>
                  <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                    {renderValue(editingPedido.notas_aprobador)}
                  </div>
                </div>
                </div>
              </div>

              {puedeVerAdjuntos && comparativaOcId && facturaViewUrl && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Factura — Orden de compra</p>
                  <a
                    href={facturaViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline font-medium text-sm"
                  >
                    Ver factura{facturaFc.trim() ? ` (${facturaFc})` : ""}
                  </a>
                </div>
              )}

              <hr className="my-6" />

              {/* Campos de edición */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado:</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.estado ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value })
                    }
                  >
                    {isAprobEmail(userEmail, userRol) ? (
                      <>
                        {formData.estado &&
                          !ESTADOS_APROBADOR.some((e) => e.value === formData.estado) && (
                            <option value={formData.estado}>
                              {formData.estado}
                            </option>
                          )}
                        {ESTADOS_APROBADOR.map((estado) => (
                          <option key={estado.value} value={estado.value}>
                            {estado.label}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="">Seleccionar estado</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="stand by">Stand By</option>
                        <option value="anulado">Anulado</option>
                        <option value="Presentar presencial">Presentar presencial</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor Seleccionado:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.proveedor_selec ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, proveedor_selec: e.target.value})
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observación/notas:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.notas ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notas: e.target.value})
                    }
                  />
                </div>
               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aprueba:</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.aprueba ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, aprueba: e.target.value })
                    }
                  >
                    <option value="">Seleccionar responsable de área</option>
                    <option value="Juan S.">Juan S.</option>
                    <option value="Luciana L.">Luciana L.</option>
                    <option value="Eduardo S.">Eduardo S.</option>
                    <option value="Pedro S.">Pedro S.</option>
                    <option value="Sofia S.">Sofia S.</option>
                    <option value="Carolina S.">Carolina S.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nota del aprobador:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.notas_aprobador ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notas_aprobador: e.target.value })
                    }
                    placeholder="Escribí una nota para este pedido"
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
                    const cleanFormData = {
                      ...formData,
                    } as Partial<Pedido> & { notas_aporbador?: string };
                    delete cleanFormData.notas_aporbador;

                    const historicoNuevo = appendHistoricoEstado(
                      editingPedido.historico_estado,
                      editingPedido.estado,
                      cleanFormData.estado,
                      userNombre
                    );
                    if (historicoNuevo) {
                      cleanFormData.historico_estado = historicoNuevo;
                    }

                    const { error } = await supabase
                      .from("pic")
                      .update(cleanFormData)
                      .eq("id", editingPedido.id);

                    if (error) {
                      alert("Error actualizando");
                      console.error(error);
                    } else {
                      alert("Actualizado correctamente");
                      setEditingPedido(null);
                      setFormData({});
                      const { data } = await supabase.from("pic").select("*");
                      if (data) setPedidos(data);
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
