"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, ShoppingCart } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVerOrdenCompraUrl, getComparativaPedidoUrl } from "@/lib/pic-links";
import {
  aplanarConsultaOrdenesCompra,
  filtrarOrdenesConsultaOcPorFecha,
  type ConsultaOrdenCompraFila,
  type OrdenCompraConsultaOc,
} from "@/lib/consultas-ordenes-compra";

function formatCantidad(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getEstadoBadge(estado: string) {
  const estados = {
    pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
    aprobada: { color: "bg-green-100 text-green-800", text: "Aprobada" },
    rechazada: { color: "bg-red-100 text-red-800", text: "Rechazada" },
    cumplida: { color: "bg-blue-100 text-blue-800", text: "Cumplida" },
    entrego_parcial: {
      color: "bg-orange-100 text-orange-800",
      text: "Entregó Parcial",
    },
    anulado: { color: "bg-red-100 text-red-800", text: "Anulado" },
  };

  const estadoInfo =
    estados[estado as keyof typeof estados] || estados.pendiente;
  return (
    <Badge className={`${estadoInfo.color} px-1.5 py-0 text-[10px] leading-tight`}>
      {estadoInfo.text}
    </Badge>
  );
}

export function ConsultaOrdenesCompra() {
  const supabase = useMemo(() => createClient(), []);
  const [ordenes, setOrdenes] = useState<OrdenCompraConsultaOc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [exportando, setExportando] = useState(false);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarPendientes, setOcultarPendientes] = useState(false);
  const [ocultarEntregoParcial, setOcultarEntregoParcial] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    const savedCumplidos = localStorage.getItem("consultaOcOcultarCumplidos");
    const savedPendientes = localStorage.getItem("consultaOcOcultarPendientes");
    const savedEntregoParcial = localStorage.getItem(
      "consultaOcOcultarEntregoParcial"
    );
    const savedAnulados = localStorage.getItem("consultaOcOcultarAnulados");
    const savedFechaDesde = localStorage.getItem("consultaOcFechaDesde");
    const savedFechaHasta = localStorage.getItem("consultaOcFechaHasta");
    const savedBusqueda = localStorage.getItem("consultaOcBusqueda");

    if (savedCumplidos !== null) setOcultarCumplidos(savedCumplidos === "true");
    if (savedPendientes !== null)
      setOcultarPendientes(savedPendientes === "true");
    if (savedEntregoParcial !== null)
      setOcultarEntregoParcial(savedEntregoParcial === "true");
    if (savedAnulados !== null) setOcultarAnulados(savedAnulados === "true");
    if (savedFechaDesde !== null) setFechaDesde(savedFechaDesde);
    if (savedFechaHasta !== null) setFechaHasta(savedFechaHasta);
    if (savedBusqueda !== null) setBusqueda(savedBusqueda);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("consultaOcOcultarCumplidos", String(ocultarCumplidos));
  }, [ocultarCumplidos, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem(
      "consultaOcOcultarPendientes",
      String(ocultarPendientes)
    );
  }, [ocultarPendientes, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem(
      "consultaOcOcultarEntregoParcial",
      String(ocultarEntregoParcial)
    );
  }, [ocultarEntregoParcial, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("consultaOcOcultarAnulados", String(ocultarAnulados));
  }, [ocultarAnulados, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("consultaOcFechaDesde", fechaDesde);
  }, [fechaDesde, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("consultaOcFechaHasta", fechaHasta);
  }, [fechaHasta, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("consultaOcBusqueda", busqueda);
  }, [busqueda, hasMounted]);


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pageSize = 1000;
      let from = 0;
      const all: OrdenCompraConsultaOc[] = [];

      while (true) {
        const { data, error: fetchError } = await supabase
          .from("ordenes_compra")
          .select(
            "id, noc, estado, proveedor, fecha, fecha_prometida, fecha_entrega, articulos, entregas"
          )
          .order("fecha", { ascending: false })
          .range(from, from + pageSize - 1);

        if (fetchError) throw fetchError;

        const batch = (data as OrdenCompraConsultaOc[]) || [];
        all.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      setOrdenes(all);
    } catch (err) {
      console.error("Error cargando consulta de órdenes:", err);
      setError("No se pudieron cargar las órdenes de compra.");
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = useMemo(() => {
    const filtradas = filtrarOrdenesConsultaOcPorFecha(
      ordenes,
      fechaDesde,
      fechaHasta
    );
    return aplanarConsultaOrdenesCompra(filtradas);
  }, [ordenes, fechaDesde, fechaHasta]);

  const filtrados = useMemo(() => {
    let result = rows.filter((row) => {
      if (ocultarCumplidos && row.estado === "cumplida") return false;
      if (ocultarPendientes && row.estado === "pendiente") return false;
      if (ocultarEntregoParcial && row.estado === "entrego_parcial") return false;
      if (ocultarAnulados && row.estado === "anulado") return false;
      return true;
    });

    const q = busqueda.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (row) =>
        row.noc.toLowerCase().includes(q) ||
        row.pic.toLowerCase().includes(q) ||
        row.estado.toLowerCase().includes(q) ||
        row.proveedor.toLowerCase().includes(q) ||
        row.articulo.toLowerCase().includes(q)
    );
  }, [
    rows,
    busqueda,
    ocultarCumplidos,
    ocultarPendientes,
    ocultarEntregoParcial,
    ocultarAnulados,
  ]);

  const totales = useMemo(
    () =>
      filtrados.reduce(
        (acc, row) => {
          acc.cantidad += row.cantidad;
          acc.entregada += row.cantidadEntregada;
          acc.pendiente += row.cantidadPendiente;
          return acc;
        },
        { cantidad: 0, entregada: 0, pendiente: 0 }
      ),
    [filtrados]
  );

  const descargarExcel = useCallback(() => {
    if (filtrados.length === 0) return;

    try {
      setExportando(true);

      const headers = [
        "estado",
        "noc",
        "pic",
        "proveedor",
        "fecha_creacion",
        "fecha_prometida",
        "fecha_entrega",
        "articulo",
        "cantidad",
        "cantidad_entregada",
        "cantidad_pendiente",
      ] as const;

      const headerLabels = [
        "Estado",
        "OC",
        "PIC",
        "Proveedor",
        "Fecha creación",
        "Fecha prometida",
        "Fecha entrega",
        "Artículo",
        "Cantidad",
        "Cant. entregada",
        "Cant. pendiente",
      ];

      const excelRows = filtrados.map((row) => ({
        estado: row.estado || "",
        noc: row.noc || "",
        pic: row.pic === "—" ? "" : row.pic,
        proveedor: row.proveedor || "",
        fecha_creacion: row.fechaCreacion,
        fecha_prometida: row.fechaPrometida,
        fecha_entrega: row.fechaEntrega,
        articulo: row.articulo,
        cantidad: row.cantidad,
        cantidad_entregada: row.cantidadEntregada,
        cantidad_pendiente: row.cantidadPendiente,
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows, { header: [...headers] });
      XLSX.utils.sheet_add_aoa(ws, [headerLabels], { origin: "A1" });
      XLSX.utils.sheet_add_json(ws, excelRows, {
        header: [...headers],
        skipHeader: true,
        origin: "A2",
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consulta OC");
      XLSX.writeFile(
        wb,
        `consulta-ordenes-compra-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error("Error al exportar Excel:", err);
    } finally {
      setExportando(false);
    }
  }, [filtrados]);

  return (
    <section className="border-t border-gray-200">
      <div className="bg-slate-50 px-3 py-3 sm:px-4 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
              <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Órdenes de compra
              </h2>
              <p className="text-xs text-slate-500">
                OC, proveedor, fechas y cantidades por artículo
              </p>
            </div>
          </div>
          <Input
            type="search"
            placeholder="Buscar OC, PIC, proveedor o artículo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 sm:max-w-xs bg-white text-xs"
          />
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm space-y-3">
          <h3 className="text-xs font-semibold text-gray-800">Filtros</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consulta-oc-fecha-desde" className="text-xs text-gray-600">
                Desde
              </Label>
              <Input
                id="consulta-oc-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-8 w-[10.5rem] min-w-[10.5rem] border-gray-300 bg-white text-xs text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consulta-oc-fecha-hasta" className="text-xs text-gray-600">
                Hasta
              </Label>
              <Input
                id="consulta-oc-fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-8 w-[10.5rem] min-w-[10.5rem] border-gray-300 bg-white text-xs text-gray-900"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                className="h-8 border-gray-300 text-xs"
              >
                Limpiar fechas
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">
              Filtros de estado
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/80 px-1.5 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarCumplidos}
                  onChange={() => setOcultarCumplidos((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">
                  Ocultar cumplidas
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/80 px-1.5 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarPendientes}
                  onChange={() => setOcultarPendientes((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">
                  Ocultar pendientes
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/80 px-1.5 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarEntregoParcial}
                  onChange={() => setOcultarEntregoParcial((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">
                  Ocultar entregó parcial
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/80 px-1.5 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarAnulados}
                  onChange={() => setOcultarAnulados((v) => !v)}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-xs">
                  Ocultar anulados
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={descargarExcel}
              disabled={exportando || loading || filtrados.length === 0}
              className="h-8 bg-green-600 text-xs hover:bg-green-700"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {exportando ? "Exportando..." : "Descargar Excel"}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Cargando…</p>
        ) : error ? (
          <p className="text-xs text-red-600 py-6 text-center">{error}</p>
        ) : filtrados.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No hay órdenes para mostrar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full table-auto text-[11px] leading-snug sm:text-xs">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Estado</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">OC</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">PIC</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Proveedor</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">F. creación</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">F. prometida</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">F. entrega</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Artículo</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">Cantidad</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                    Cant. entregada
                  </th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                    Cant. pendiente
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((row: ConsultaOrdenCompraFila) => (
                  <tr
                    key={row.key}
                    className="border-t border-gray-100 hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-2 py-1">
                      {getEstadoBadge(row.estado)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-700">
                      {row.ordenId && row.noc ? (
                        <Link
                          href={getVerOrdenCompraUrl(row.ordenId)}
                          className="font-medium text-rose-700 underline underline-offset-2 hover:text-rose-900"
                        >
                          {row.noc}
                        </Link>
                      ) : (
                        row.noc || "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-700">
                      {(() => {
                        const picUrl = row.articuloId
                          ? getComparativaPedidoUrl(row.articuloId, {
                              ordenCompraId: row.ordenId || undefined,
                              ordenCompraNoc: row.noc || undefined,
                            })
                          : null;
                        if (picUrl && row.pic && row.pic !== "—") {
                          return (
                            <Link
                              href={picUrl}
                              className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                            >
                              {row.pic}
                            </Link>
                          );
                        }
                        return row.pic || "—";
                      })()}
                    </td>
                    <td
                      className="max-w-[10rem] truncate px-2 py-1 text-slate-800"
                      title={row.proveedor || undefined}
                    >
                      {row.proveedor || "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-600">
                      {row.fechaCreacion}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-600">
                      {row.fechaPrometida}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-600">
                      {row.fechaEntrega}
                    </td>
                    <td
                      className="max-w-[14rem] truncate px-2 py-1 text-slate-800"
                      title={row.articulo}
                    >
                      {row.articulo}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-slate-800">
                      {formatCantidad(row.cantidad)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-emerald-700">
                      {formatCantidad(row.cantidadEntregada)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-amber-700">
                      {formatCantidad(row.cantidadPendiente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <td className="px-2 py-1.5" colSpan={8}>
                    Totales ({filtrados.length} filas)
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                    {formatCantidad(totales.cantidad)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-emerald-700">
                    {formatCantidad(totales.entregada)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-amber-700">
                    {formatCantidad(totales.pendiente)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
