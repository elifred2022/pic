"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Package } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseTipoCambio, DIVISA_LABELS, type FiltroDivisaIndicador } from "@/lib/indicadores-compras";
import { getVerOrdenCompraUrl, getComparativaPedidoUrl } from "@/lib/pic-links";
import {
  convertirArticulosCompradosAArs,
  filtrarArticulosPorDivisa,
  filtrarOrdenesConsultaPorFecha,
  resumirArticulosComprados,
  type ArticuloCompradoResumen,
  type OrdenCompraConsulta,
} from "@/lib/consultas-articulos-comprados";

function formatCantidad(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatImporte(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ConsultaArticulosComprados() {
  const supabase = useMemo(() => createClient(), []);
  const [ordenes, setOrdenes] = useState<OrdenCompraConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroDivisa, setFiltroDivisa] = useState<FiltroDivisaIndicador>("todas");
  const [totalizarEnArs, setTotalizarEnArs] = useState(false);
  const [tcUsd, setTcUsd] = useState("");
  const [tcEur, setTcEur] = useState("");
  const [exportando, setExportando] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pageSize = 1000;
      let from = 0;
      const all: OrdenCompraConsulta[] = [];

      while (true) {
        const { data, error: fetchError } = await supabase
          .from("ordenes_compra")
          .select(
            "id, noc, fecha, estado, total, importe_competencia, divisa, cod_cta, proveedor, articulos, entregas"
          )
          .order("fecha", { ascending: false })
          .range(from, from + pageSize - 1);

        if (fetchError) throw fetchError;

        const batch = (data as OrdenCompraConsulta[]) || [];
        all.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      setOrdenes(all);
    } catch (err) {
      console.error("Error cargando artículos comprados:", err);
      setError("No se pudieron cargar los artículos comprados.");
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tipoCambioUsd = useMemo(() => parseTipoCambio(tcUsd), [tcUsd]);
  const tipoCambioEur = useMemo(() => parseTipoCambio(tcEur), [tcEur]);
  const tiposCambioValidos =
    totalizarEnArs && tipoCambioUsd !== null && tipoCambioEur !== null;

  const rows = useMemo(() => {
    const filtradas = filtrarOrdenesConsultaPorFecha(
      ordenes,
      fechaDesde,
      fechaHasta
    );
    const resumen = filtrarArticulosPorDivisa(
      resumirArticulosComprados(filtradas),
      totalizarEnArs ? "todas" : filtroDivisa
    );

    if (!tiposCambioValidos || tipoCambioUsd === null || tipoCambioEur === null) {
      return resumen;
    }

    return convertirArticulosCompradosAArs(resumen, {
      usd: tipoCambioUsd,
      eur: tipoCambioEur,
    });
  }, [
    ordenes,
    fechaDesde,
    fechaHasta,
    filtroDivisa,
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
  ]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.articulo.toLowerCase().includes(q) ||
        row.codint.toLowerCase().includes(q) ||
        row.codCta.toLowerCase().includes(q) ||
        row.noc.toLowerCase().includes(q) ||
        row.pic.toLowerCase().includes(q) ||
        row.proveedor.toLowerCase().includes(q) ||
        row.divisa.toLowerCase().includes(q)
    );
  }, [rows, busqueda]);

  const totales = useMemo(
    () =>
      filtrados.reduce(
        (acc, row) => {
          acc.comprada += row.cantidadComprada;
          acc.entregada += row.cantidadEntregada;
          acc.pendiente += row.cantidadPendiente;
          acc.total += row.total;
          return acc;
        },
        { comprada: 0, entregada: 0, pendiente: 0, total: 0 }
      ),
    [filtrados]
  );

  const costoUnitarioPromedio =
    totales.comprada > 0 ? totales.total / totales.comprada : 0;

  const mostrarTabla = !totalizarEnArs || tiposCambioValidos;

  const descargarExcel = useCallback(() => {
    if (filtrados.length === 0) return;

    try {
      setExportando(true);

      const headers = [
        "articulo",
        "codigo",
        "fecha_orden",
        "noc",
        "pic",
        "proveedor",
        "cant_comprada",
        "cant_entregada",
        "cant_pendiente",
        "costo_unitario",
        "total",
        "divisa",
        "codigo_cuenta",
      ] as const;

      const headerLabels = [
        "Artículo",
        "Código",
        "Fecha orden",
        "N° OC",
        "PIC",
        "Proveedor",
        "Cant. comprada",
        "Cant. entregada",
        "Cant. pendiente",
        "Costo unitario",
        "Total",
        "Divisa",
        "Código cuenta",
      ];

      const rows = filtrados.map((row) => ({
        articulo: row.articulo,
        codigo: row.codint || "",
        fecha_orden: row.fechaOrden,
        noc: row.noc || "",
        pic: row.pic === "—" ? "" : row.pic,
        proveedor: row.proveedor || "",
        cant_comprada: row.cantidadComprada,
        cant_entregada: row.cantidadEntregada,
        cant_pendiente: row.cantidadPendiente,
        costo_unitario: row.costoUnitario,
        total: row.total,
        divisa: row.divisa,
        codigo_cuenta: row.codCta || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
      XLSX.utils.sheet_add_aoa(ws, [headerLabels], { origin: "A1" });
      XLSX.utils.sheet_add_json(ws, rows, {
        header: [...headers],
        skipHeader: true,
        origin: "A2",
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Artículos comprados");
      XLSX.writeFile(
        wb,
        `articulos-comprados-${new Date().toISOString().slice(0, 10)}.xlsx`
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600 text-white">
              <Package className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Artículos comprados
              </h2>
              <p className="text-xs text-slate-500">
                Cantidades compradas, entregadas y pendientes
              </p>
            </div>
          </div>
          <Input
            type="search"
            placeholder="Buscar artículo, código, OC, PIC o proveedor..."
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
              <Label htmlFor="consulta-fecha-desde" className="text-xs text-gray-600">
                Desde
              </Label>
              <Input
                id="consulta-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-8 w-[10.5rem] min-w-[10.5rem] border-gray-300 bg-white text-xs text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consulta-fecha-hasta" className="text-xs text-gray-600">
                Hasta
              </Label>
              <Input
                id="consulta-fecha-hasta"
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consulta-filtro-divisa" className="text-xs text-gray-600">
                Divisa
              </Label>
              <select
                id="consulta-filtro-divisa"
                value={filtroDivisa}
                onChange={(e) =>
                  setFiltroDivisa(e.target.value as FiltroDivisaIndicador)
                }
                disabled={totalizarEnArs}
                className="h-8 w-[10.5rem] min-w-[10.5rem] rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="todas">Todas las divisas</option>
                <option value="USD">{DIVISA_LABELS.USD}</option>
                <option value="EUR">{DIVISA_LABELS.EUR}</option>
                <option value="ARS">{DIVISA_LABELS.ARS}</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="consulta-totalizar-ars"
                checked={totalizarEnArs}
                onCheckedChange={(checked) => setTotalizarEnArs(checked === true)}
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="consulta-totalizar-ars"
                  className="cursor-pointer text-xs font-medium text-gray-800"
                >
                  Totalizar en moneda local (ARS)
                </Label>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Convierte USD y EUR al tipo de cambio del día y muestra costo
                  unitario y total en pesos.
                </p>
              </div>
            </div>

            {totalizarEnArs && (
              <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-200 pt-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="consulta-tc-usd" className="text-xs text-gray-600">
                    TC del día USD → ARS
                  </Label>
                  <Input
                    id="consulta-tc-usd"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1050,50"
                    value={tcUsd}
                    onChange={(e) => setTcUsd(e.target.value)}
                    className="h-8 w-40 bg-white text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="consulta-tc-eur" className="text-xs text-gray-600">
                    TC del día EUR → ARS
                  </Label>
                  <Input
                    id="consulta-tc-eur"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1150,00"
                    value={tcEur}
                    onChange={(e) => setTcEur(e.target.value)}
                    className="h-8 w-40 bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {totalizarEnArs && tiposCambioValidos && (
            <p className="text-xs text-gray-500">
              Conversión aplicada: 1 USD ={" "}
              {tipoCambioUsd!.toLocaleString("es-AR")} ARS, 1 EUR ={" "}
              {tipoCambioEur!.toLocaleString("es-AR")} ARS.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={descargarExcel}
              disabled={
                exportando ||
                loading ||
                !mostrarTabla ||
                filtrados.length === 0
              }
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
        ) : totalizarEnArs && !tiposCambioValidos ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Ingresá el tipo de cambio del día en USD y EUR para ver los valores
            en ARS.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No hay artículos para mostrar.
          </p>
        ) : (
          mostrarTabla && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full table-auto text-[11px] leading-snug sm:text-xs">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Artículo</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Código</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Fecha</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">N° OC</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">PIC</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Proveedor</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                      Cant. comprada
                    </th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                      Cant. entregada
                    </th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                      Cant. pendiente
                    </th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">
                      Costo unit.
                    </th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-right">Total</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Divisa</th>
                    <th className="whitespace-nowrap px-2 py-1.5 font-semibold">Cód. cuenta</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((row: ArticuloCompradoResumen) => (
                    <tr
                      key={row.key}
                      className="border-t border-gray-100 hover:bg-slate-50/80"
                    >
                      <td className="max-w-[14rem] truncate px-2 py-1 text-slate-800" title={row.articulo}>
                        {row.articulo}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-slate-500">
                        {row.codint || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-600">
                        {row.fechaOrden}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 tabular-nums text-slate-700">
                        {row.ordenId && row.noc ? (
                          <Link
                            href={getVerOrdenCompraUrl(row.ordenId)}
                            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
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
                      <td className="max-w-[10rem] truncate px-2 py-1 text-slate-700" title={row.proveedor || undefined}>
                        {row.proveedor || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-slate-800">
                        {formatCantidad(row.cantidadComprada)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-emerald-700">
                        {formatCantidad(row.cantidadEntregada)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-amber-700">
                        {formatCantidad(row.cantidadPendiente)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-slate-800">
                        {formatImporte(row.costoUnitario)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-slate-800">
                        {formatImporte(row.total)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-slate-600">{row.divisa}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-slate-600">
                        {row.codCta || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                    <td className="px-2 py-1.5" colSpan={6}>
                      Totales ({filtrados.length} artículos)
                      {tiposCambioValidos ? " en ARS" : ""}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {formatCantidad(totales.comprada)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-emerald-700">
                      {formatCantidad(totales.entregada)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-amber-700">
                      {formatCantidad(totales.pendiente)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {formatImporte(costoUnitarioPromedio)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {formatImporte(totales.total)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {tiposCambioValidos ? "ARS" : ""}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>
    </section>
  );
}
