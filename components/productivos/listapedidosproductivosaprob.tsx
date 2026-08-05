"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

const ESTADOS_APROBADOR = [
  { value: "aprobado", label: "Aprobado" },
  { value: "autorizado por finanza", label: "Autorizado por finanza" },
  { value: "no aprobado", label: "No aprobado" },
  { value: "stand by", label: "Stand By" },
] as const;

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
  precioUnitario: number;
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
  comparativa_prov: ProveedorComparativa[] | null;
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
  nota_aprobador: string;
  notas_aprobador?: string;
  nota_comprador?: string;
  comprador?: string | null;
  estado: string;
  historico_estado?: HistoricoEstadoEntry[] | null;
  observ: string;
  numero_oc: string | null;
  proveedor_seleccionado: string | null;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  
  
  articulos: {
    codint: string;
    articulo: string;
    descripcion: string;
    presentacion?: string;
    observacion: string;
    existencia: number;
    cant: number;
    provsug: string;
  }[];
};

export default function ListaPedidosProductivosAprob() {
   const searchParams = useSearchParams();
   const { resolveOcParaPedido } = useOcVolver();
   const comparativaAbiertaRef = useRef<string | null>(null);
   const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [editingPedido, setEditingPedido] = useState<Pedido | null>(null); //modal edicion
    const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
    const [ocultarAprobados, setOcultarAprobados] = useState(false);
    const [ocultarAnulados, setOcultarAnulados] = useState(false);
    const [ocultarStandBy, setOcultarStandBy] = useState(false);
    const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
    const [ocultarNoAprobados, setOcultarNoAprobados] = useState(false);
    const [comparativaPedido, setComparativaPedido] = useState<Pedido | null>(null); //modal comparativa
    

    const [comparativaForm, setComparativaForm] = useState<ProveedorComparativa[] | null>(null);
    const [comparativaOcId, setComparativaOcId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRol, setUserRol] = useState<string | null>(null);
    const [userNombre, setUserNombre] = useState<string | null>(null);
  
    const [formData, setFormData] = useState<Partial<Pedido>>({});
    const supabase = createClient();

    const enriquecerPedidosConArticulos = async (pedidos: Pedido[]): Promise<Pedido[]> => {
      const codints = [
        ...new Set(
          pedidos.flatMap((p) => (p.articulos ?? []).map((a) => a.codint).filter(Boolean))
        ),
      ];
      if (codints.length === 0) return pedidos;

      const { data } = await supabase
        .from("articulos")
        .select("codint, presentacion")
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
            presentacion: art.presentacion ?? desdeBd?.presentacion ?? "",
          };
        }),
      }));
    };

    const puedeVerAdjuntos = canViewAdjuntosCompras(userEmail, userRol);
    const presupuestoUrls = useComparativaPresupuestoUrls(
      puedeVerAdjuntos ? comparativaPedido?.comparativa_prov : null
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

    const abrirComparativaPedido = async (p: Pedido) => {
      setComparativaPedido(p);
      setFormData(p);
      const oc = await resolveOcParaPedido({ id: p.id, numero_oc: p.numero_oc });
      setComparativaOcId(oc?.id ?? null);
    };

    useEffect(() => {
      const comparativaId = searchParams.get("comparativa");
      if (!comparativaId || pedidos.length === 0) return;
      if (comparativaAbiertaRef.current === comparativaId) return;

      const pedido = pedidos.find((p) => String(p.id) === comparativaId);
      if (!pedido) return;

      comparativaAbiertaRef.current = comparativaId;
      void abrirComparativaPedido(pedido);
    }, [searchParams, pedidos]); // eslint-disable-line react-hooks/exhaustive-deps
  
    /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
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

  useEffect(() => {
    localStorage.setItem("ocultarNoAprobados", String(ocultarNoAprobados));
  }, [ocultarNoAprobados]);
  
  
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
  
      const { data, error } = await supabase
        .from("pedidos_productivos")
        .select("*")
        //.eq("uuid", user.id); // 👈 Filtra por usuario logueado
  
      if (error) console.error("Error cargando pedidos:", error);
      else if (data) {
        const pedidosEnriquecidos = await enriquecerPedidosConArticulos(data);
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
  
      return Object.entries(pedido).some(([key, value]) => {
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

  // ✅ Función para actualizar pedido
 // ✅ Función para actualizar pedido
const handleUpdatePedido = async () => {
    // Si no hay modal abierto, no hace nada
    if (!editingPedido && !comparativaPedido) return;

    // Define qué pedido se va a actualizar
    const pedidoToUpdate = editingPedido || comparativaPedido;
    if (!pedidoToUpdate) return;
    
    // Objeto con los datos que se van a actualizar
    const dataToUpdate: Partial<Pedido> = {
        estado: formData.estado,
        observ: formData.observ,
        numero_oc: formData.numero_oc,
        proveedor_seleccionado: formData.proveedor_seleccionado,
        nota_aprobador: formData.nota_aprobador,
    };

    const historicoNuevo = appendHistoricoEstado(
      pedidoToUpdate.historico_estado,
      pedidoToUpdate.estado,
      formData.estado,
      userNombre
    );
    if (historicoNuevo) {
      dataToUpdate.historico_estado = historicoNuevo;
    }

    // Solo actualiza la comparativa si estamos en el modal de edición completa
    // donde el usuario tiene la capacidad de cambiar los precios.
    if (editingPedido) {
        dataToUpdate.comparativa_prov = comparativaForm; 
    }

    const { error } = await supabase
        .from("pedidos_productivos")
        .update(dataToUpdate)
        .eq("id", pedidoToUpdate.id);

    if (error) {
        console.error("Error actualizando pedido:", error);
        return;
    }

    // Actualiza la lista en memoria sin sobreescribir la comparativa si no es necesario
    setPedidos((prev) =>
        prev.map((p) =>
            p.id === pedidoToUpdate.id ? { ...p, ...dataToUpdate } as Pedido : p
        )
    );

    // Cierra los modales y resetea el estado
    setEditingPedido(null);
    setComparativaPedido(null);
    setComparativaForm(null);
};

// Estilos para la tabla (comentados por ahora)
// const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
// const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";


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
          href="/auth/rutaproductivos/crear-formpedidosproductivos"
          className="inline-block px-4 sm:px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 touch-manipulation"
        >
          Crear pedido productivo
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Pedidos productivos aprobación</h1>
              <p className="text-blue-100 text-xs mt-0.5">
                Revisión y aprobación de pedidos productivos
              </p>
            </div>
            <input
              type="search"
              placeholder="Buscar pedido productivo..."
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
                <th className={thClass}>PIC</th>
                <th className={thClass}>Fecha Sol</th>
                <th className={thClass}>Fecha Nec</th>
                <th className={thClass}>Categoría</th>
                <th className={thClass}>Solicitante</th>
                <th className={thClass}>Sector</th>
                <th className={thClass}>Artículo solicitado</th>
                <th className={thClass}>Observ/Mensaje</th>
                <th className={thClass}>Supervisado</th>
                <th className={thClass}>Comprador</th>
                <th className={thClass}>Aprueba</th>
                <th className={thClass}>OC</th>
                <th className={thClass}>Prov. Selecc.</th>
                <th className={thClass}>Confirmado</th>
                <th className={thClass}>Promesa</th>
                <th className={thClass}>Entregó</th>
                <th className={thClass}>Fac</th>
                <th className={thClass}>Rto</th>
              </tr>
            </thead>
                         <tbody>
               {filteredPedidos.map((p) => (
                 <tr key={p.id} className="even:bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                    <td className={tdClass}>
                     <div className="flex flex-col gap-1">
                      <button
                           className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded hover:bg-emerald-100 transition-colors text-[10px] whitespace-nowrap"
                           onClick={() => void abrirComparativaPedido(p)}
                       >
                           Comparativa
                       </button>
                     </div>
                   </td>
                   <td className={`${tdClass} min-w-[14rem]`}>
                     <div className="flex flex-col gap-0.5">
                       <span className={estadoBadgeClass(p.estado)}>
                          {renderValue(p.estado)}
                       </span>
                       {parseHistoricoEstado(p.historico_estado).map((h, index) => (
                         <span
                           key={`${h.estado}-${h.fecha}-${index}`}
                           className="text-[10px] leading-tight text-slate-500 tabular-nums whitespace-nowrap"
                         >
                           {formatHistoricoEntry(h)}
                         </span>
                       ))}
                     </div>
                 </td>
                 
                   <td className={`${tdClass} whitespace-nowrap tabular-nums font-medium`}>{p.id}</td>
                   <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(p.created_at)}</td>
                   <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(p.necesidad)}</td>
                   <td className={`${tdClass} whitespace-nowrap`}>{p.categoria}</td>
                   <td className={tdClass}>
                     <div className="flex flex-col gap-0.5 max-w-[9rem]">
                       <span className="font-medium text-slate-800">{p.solicita}</span>
                       {p.nota_solicitante?.trim() ? (
                         <span className="text-[10px] text-blue-700 font-semibold whitespace-pre-wrap break-words">
                           {p.nota_solicitante}
                         </span>
                       ) : null}
                     </div>
                   </td>
                   <td className={`${tdClass} whitespace-nowrap`}>{p.sector}</td>
                   <td className={tdClass}>
                     {p.articulos && p.articulos.length > 0 ? (
                       <div className="space-y-1 min-w-[14rem] max-w-[18rem]">
                         {p.articulos.map((a, idx) => (
                           <div key={idx} className="bg-slate-50 px-1.5 py-1 rounded border border-gray-100">
                             <div className="font-medium text-slate-800 truncate" title={a.articulo}>{a.articulo}</div>
                             <div className="text-[10px] text-slate-500 truncate">{a.descripcion || "-"}</div>
                             <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-2">
                               <span>Cant: {a.cant}</span>
                               <span>Stock: {a.existencia}</span>
                               <span className="font-mono">{a.codint}</span>
                             </div>
                             {a.presentacion?.trim() ? (
                               <div className="text-[10px] text-slate-500 truncate">{a.presentacion}</div>
                             ) : null}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <span className="text-slate-400">—</span>
                     )}
                   </td>
                   <td className={tdClass}>
                     <div className="max-w-[10rem] text-slate-600 whitespace-pre-wrap break-words">
                       {p.observ || "-"}
                     </div>
                   </td>
                   <td className={tdClass}>
                     <div className="flex flex-col gap-0.5 whitespace-nowrap">
                       <span className="font-medium">{p.controlado}</span>
                       <span className="text-slate-500">{p.supervisor || "-"}</span>
                     </div>
                   </td>
                   <td className={tdClass}>
                     <div className="flex flex-col gap-0.5 max-w-[9rem]">
                       <span className="font-medium text-slate-800">{renderValue(p.comprador)}</span>
                       {p.nota_comprador?.trim() ? (
                         <span className="text-[10px] text-blue-700 font-semibold whitespace-pre-wrap break-words">
                           {p.nota_comprador}
                         </span>
                       ) : null}
                     </div>
                   </td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-0.5 max-w-[8rem]">
                      <span className="text-orange-600 font-medium">{renderValue(p.aprueba)}</span>
                      <span className="text-[10px] text-red-600 break-words">
                        {p.nota_aprobador || "-"}
                      </span>
                    </div>
                  </td>
                   <td className={`${tdClass} whitespace-nowrap text-orange-600 font-medium tabular-nums`}>{p.numero_oc || "-"}</td>
                   <td className={`${tdClass} max-w-[9rem] truncate text-orange-600 font-medium`} title={p.proveedor_seleccionado || undefined}>{p.proveedor_seleccionado || "-"}</td>
                   <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(p.fecha_conf)}</td>
                   <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(p.fecha_prom)}</td>
                   <td className={`${tdClass} whitespace-nowrap tabular-nums text-slate-600`}>{formatDate(p.fecha_ent)}</td>
                   <td className={`${tdClass} whitespace-nowrap`}>{p.fac || "-"}</td>
                   <td className={`${tdClass} whitespace-nowrap`}>{p.rto || "-"}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
        </div>
      </div>

  

      {/* ✅ Modal comparativa */}
      
  
      {/* Modal de comparativa */}
      {comparativaPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1900px] max-h-[95vh] overflow-y-auto overflow-x-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">📊 Comparativa de Proveedores #{formData.id}</h2>
              <p className="text-green-100 mt-2">Vista de comparativa y edición de estado</p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(comparativaPedido.necesidad)}</p>
                    <p><span className="font-medium">Fecha confirmada:</span> {formatDate(comparativaPedido.fecha_conf)}</p>
                    <p><span className="font-medium">Fecha promesa:</span> {formatDate(comparativaPedido.fecha_prom)}</p>
                    <p><span className="font-medium">Sector:</span> {formData.sector}</p>
                    <p><span className="font-medium">Solicitante:</span> {formData.solicita}</p>
                    {formData.nota_solicitante?.trim() ? (
                      <p className="text-sm text-blue-700 font-bold whitespace-pre-wrap">
                        <span className="font-medium text-gray-800">Notas solicitante:</span>{" "}
                        {formData.nota_solicitante}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos</h3>
                  {formData.articulos && formData.articulos.length > 0 ? (
                    <div className="space-y-2">
                      {formData.articulos.map((art, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                          <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                          <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2">Código: {art.codint}</div>
                          <div className="text-gray-600 text-xs">Cant: {art.cant}</div>
                          <div className="text-gray-600 text-xs">Stock: {art.existencia}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">- Sin artículos -</p>
                  )}
                </div>
              </div>
              
              {/* Sección de Comparativa de Proveedores (Solo lectura) */}
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">💰</span>
                    Cotizaciones de Proveedores
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparativaPedido.comparativa_prov?.map((prov, provIndex) => (
                    <div key={provIndex} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm min-w-0">
                      <label className="block mb-3 text-sm font-medium text-gray-700">Proveedor:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 font-semibold bg-white text-center text-sm"
                        value={prov.nombreProveedor}
                        readOnly
                      />

                      <table className="w-full text-gray-700 text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-medium">Artículo</th>
                            <th className="px-2 py-2 text-center font-medium">Cant.</th>
                            <th className="px-2 py-2 text-center font-medium">Precio</th>
                            <th className="px-2 py-2 text-center font-medium">Desc. %</th>
                            <th className="px-2 py-2 text-center font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prov.articulos.map((art, artIndex) => (
                            <tr key={artIndex} className="border-b border-gray-100">
                              <td className="px-2 py-2 text-sm truncate" title={art.articulo}>
                                {art.articulo}
                              </td>
                              <td className="px-2 py-2 text-center text-sm">{art.cant}</td>
                              <td className="px-2 py-2 text-center text-sm">
                                ${(art.precioUnitario || 0).toFixed(0)}
                              </td>
                              <td className="px-2 py-2 text-center text-sm">
                                {(art.descuentoPorcentaje || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                              </td>
                              <td className="px-2 py-2 text-center text-sm">
                                ${(art.subtotal || 0).toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-gray-50 p-3 rounded border text-sm">
                        Total: ${(prov.total || 0).toFixed(0)}
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
                  ))}
                  </div>

                  {puedeVerAdjuntos && comparativaOcId && facturaViewUrl && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
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

                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Nota del comprador</p>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                      {renderValue(comparativaPedido.nota_comprador)}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Notas del aprobador</p>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                      {renderValue(comparativaPedido.notas_aprobador || comparativaPedido.nota_aprobador)}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="my-6" />

              {/* Campos de edición */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado:</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.estado || ""}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
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
                        <option value="iniciado">Iniciado</option>
                        <option value="visto/recibido">Visto/Recibido</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="cotizado">Cotizado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="cumplido">Cumplido</option>
                        <option value="anulado">Anulado</option>
                        <option value="stand by">Stand By</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor Seleccionado:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.proveedor_seleccionado || ""}
                    onChange={(e) => setFormData({ ...formData, proveedor_seleccionado: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nota del aprobador:</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={formData.nota_aprobador || ""}
                  onChange={(e) => setFormData({ ...formData, nota_aprobador: e.target.value })}
                  placeholder="Escribí una nota para este pedido"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setComparativaPedido(null);
                    setComparativaOcId(null);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  ❌ Cerrar
                </button>
                <button
                  onClick={handleUpdatePedido}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200"
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
