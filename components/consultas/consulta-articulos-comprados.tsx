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
import { getVerOrdenCompraUrl } from "@/lib/pic-links";
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
            "id, noc, fecha, estado, total, importe_competencia, divisa, cod_cta, articulos, entregas"
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
        "codigo_cuenta",
        "fecha_orden",
        "noc",
        "cant_comprada",
        "cant_entregada",
        "cant_pendiente",
        "costo_unitario",
        "total",
        "divisa",
      ] as const;

      const headerLabels = [
        "Artículo",
        "Código",
        "Código cuenta",
        "Fecha orden",
        "N° OC",
        "Cant. comprada",
        "Cant. entregada",
        "Cant. pendiente",
        "Costo unitario",
        "Total",
        "Divisa",
      ];

      const rows = filtrados.map((row) => ({
        articulo: row.articulo,
        codigo: row.codint || "",
        codigo_cuenta: row.codCta || "",
        fecha_orden: row.fechaOrden,
        noc: row.noc || "",
        cant_comprada: row.cantidadComprada,
        cant_entregada: row.cantidadEntregada,
        cant_pendiente: row.cantidadPendiente,
        costo_unitario: row.costoUnitario,
        total: row.total,
        divisa: row.divisa,
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
      <div className="bg-slate-50 px-6 py-4 sm:px-8 border-b border-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-600 text-white">
              <Package className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Artículos comprados
              </h2>
              <p className="text-sm text-slate-500">
                Cantidades compradas, entregadas y pendientes
              </p>
            </div>
          </div>
          <Input
            type="search"
            placeholder="Buscar artículo o código..."
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
              <Label htmlFor="consulta-fecha-desde" className="text-sm text-gray-600">
                Desde
              </Label>
              <Input
                id="consulta-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-10 w-[11.5rem] min-w-[11.5rem] border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="consulta-fecha-hasta" className="text-sm text-gray-600">
                Hasta
              </Label>
              <Input
                id="consulta-fecha-hasta"
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="consulta-filtro-divisa" className="text-sm text-gray-600">
                Divisa
              </Label>
              <select
                id="consulta-filtro-divisa"
                value={filtroDivisa}
                onChange={(e) =>
                  setFiltroDivisa(e.target.value as FiltroDivisaIndicador)
                }
                disabled={totalizarEnArs}
                className="h-10 w-[11.5rem] min-w-[11.5rem] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="todas">Todas las divisas</option>
                <option value="USD">{DIVISA_LABELS.USD}</option>
                <option value="EUR">{DIVISA_LABELS.EUR}</option>
                <option value="ARS">{DIVISA_LABELS.ARS}</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consulta-totalizar-ars"
                checked={totalizarEnArs}
                onCheckedChange={(checked) => setTotalizarEnArs(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="consulta-totalizar-ars"
                  className="cursor-pointer text-sm font-medium text-gray-800"
                >
                  Totalizar en moneda local (ARS)
                </Label>
                <p className="text-xs text-gray-500">
                  Convierte USD y EUR al tipo de cambio del día y muestra costo
                  unitario y total en pesos.
                </p>
              </div>
            </div>

            {totalizarEnArs && (
              <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="consulta-tc-usd" className="text-sm text-gray-600">
                    TC del día USD → ARS
                  </Label>
                  <Input
                    id="consulta-tc-usd"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1050,50"
                    value={tcUsd}
                    onChange={(e) => setTcUsd(e.target.value)}
                    className="w-44 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="consulta-tc-eur" className="text-sm text-gray-600">
                    TC del día EUR → ARS
                  </Label>
                  <Input
                    id="consulta-tc-eur"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1150,00"
                    value={tcEur}
                    onChange={(e) => setTcEur(e.target.value)}
                    className="w-44 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {totalizarEnArs && tiposCambioValidos && (
            <p className="text-sm text-gray-500">
              Conversión aplicada: 1 USD ={" "}
              {tipoCambioUsd!.toLocaleString("es-AR")} ARS, 1 EUR ={" "}
              {tipoCambioEur!.toLocaleString("es-AR")} ARS.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={descargarExcel}
              disabled={
                exportando ||
                loading ||
                !mostrarTabla ||
                filtrados.length === 0
              }
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
        ) : totalizarEnArs && !tiposCambioValidos ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            Ingresá el tipo de cambio del día en USD y EUR para ver los valores
            en ARS.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No hay artículos para mostrar.
          </p>
        ) : (
          mostrarTabla && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Artículo</th>
                    <th className="px-4 py-3 font-semibold">Código</th>
                    <th className="px-4 py-3 font-semibold">Código cuenta</th>
                    <th className="px-4 py-3 font-semibold">Fecha orden</th>
                    <th className="px-4 py-3 font-semibold">N° OC</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Cant. comprada
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Cant. entregada
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Cant. pendiente
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Costo unitario
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                    <th className="px-4 py-3 font-semibold">Divisa</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((row: ArticuloCompradoResumen) => (
                    <tr
                      key={row.key}
                      className="border-t border-gray-100 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 text-slate-800">{row.articulo}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.codint || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.codCta || "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {row.fechaOrden}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
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
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {formatCantidad(row.cantidadComprada)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {formatCantidad(row.cantidadEntregada)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                        {formatCantidad(row.cantidadPendiente)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {formatImporte(row.costoUnitario)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {formatImporte(row.total)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.divisa}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                    <td className="px-4 py-3" colSpan={5}>
                      Totales ({filtrados.length} artículos)
                      {tiposCambioValidos ? " en ARS" : ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCantidad(totales.comprada)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      {formatCantidad(totales.entregada)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                      {formatCantidad(totales.pendiente)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatImporte(costoUnitarioPromedio)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatImporte(totales.total)}
                    </td>
                    <td className="px-4 py-3">
                      {tiposCambioValidos ? "ARS" : ""}
                    </td>
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
