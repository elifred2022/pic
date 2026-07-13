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
import { getVerOrdenCompraUrl } from "@/lib/pic-links";
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
  return <Badge className={estadoInfo.color}>{estadoInfo.text}</Badge>;
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
      <div className="bg-slate-50 px-6 py-4 sm:px-8 border-b border-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 text-white">
              <ShoppingCart className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Órdenes de compra
              </h2>
              <p className="text-sm text-slate-500">
                OC, proveedor, fechas y cantidades por artículo
              </p>
            </div>
          </div>
          <Input
            type="search"
            placeholder="Buscar OC, proveedor o artículo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="sm:max-w-xs bg-white"
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">Filtros</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="consulta-oc-fecha-desde" className="text-sm text-gray-600">
                Desde
              </Label>
              <Input
                id="consulta-oc-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-10 w-[11.5rem] min-w-[11.5rem] border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="consulta-oc-fecha-hasta" className="text-sm text-gray-600">
                Hasta
              </Label>
              <Input
                id="consulta-oc-fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-10 w-[11.5rem] min-w-[11.5rem] border-gray-300 bg-white text-gray-900"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                className="border-gray-300"
              >
                Limpiar fechas
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Filtros de estado
            </h4>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white/80 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarCumplidos}
                  onChange={() => setOcultarCumplidos((v) => !v)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-sm">
                  Ocultar cumplidas
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white/80 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarPendientes}
                  onChange={() => setOcultarPendientes((v) => !v)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-sm">
                  Ocultar pendientes
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white/80 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarEntregoParcial}
                  onChange={() => setOcultarEntregoParcial((v) => !v)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-sm">
                  Ocultar entregó parcial
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white/80 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={ocultarAnulados}
                  onChange={() => setOcultarAnulados((v) => !v)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium text-sm">
                  Ocultar anulados
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={descargarExcel}
              disabled={exportando || loading || filtrados.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              {exportando ? "Exportando..." : "Descargar Excel"}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No hay órdenes para mostrar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">OC</th>
                  <th className="px-4 py-3 font-semibold">Proveedor</th>
                  <th className="px-4 py-3 font-semibold">Fecha creación</th>
                  <th className="px-4 py-3 font-semibold">Fecha prometida</th>
                  <th className="px-4 py-3 font-semibold">Fecha entrega</th>
                  <th className="px-4 py-3 font-semibold">Artículo</th>
                  <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Cant. entregada
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
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
                    <td className="px-4 py-3">
                      {getEstadoBadge(row.estado)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
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
                    <td className="px-4 py-3 text-slate-800">
                      {row.proveedor || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {row.fechaCreacion}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {row.fechaPrometida}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {row.fechaEntrega}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{row.articulo}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {formatCantidad(row.cantidad)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      {formatCantidad(row.cantidadEntregada)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                      {formatCantidad(row.cantidadPendiente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <td className="px-4 py-3" colSpan={7}>
                    Totales ({filtrados.length} filas)
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCantidad(totales.cantidad)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {formatCantidad(totales.entregada)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">
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
