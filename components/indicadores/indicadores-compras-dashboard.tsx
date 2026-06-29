"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calcularAhorrosAlcanzados,
  calcularAhorrosAlcanzadosPorDivisa,
  calcularImportePorModalidadPago,
  calcularImportePorModalidadPagoPorDivisa,
  calcularImportePorCondicionProceso,
  calcularImportePorCondicionProcesoPorDivisa,
  calcularSolicitudesPorSector,
  calcularSolicitudesPorSectorPorDivisa,
  calcularSolicitudesPorEstado,
  calcularSolicitudesPorEstadoPorDivisa,
  calcularImportePorCodCta,
  calcularImportePorCodCtaPorDivisa,
  calcularImportePorProveedor,
  calcularImportePorProveedorPorDivisa,
  consolidarAhorrosEnArs,
  consolidarImporteModalidadEnArs,
  consolidarImporteCondicionProcesoEnArs,
  consolidarSolicitudesPorSectorEnArs,
  consolidarSolicitudesPorEstadoEnArs,
  consolidarImportePorCodCtaEnArs,
  consolidarImportePorProveedorEnArs,
  ordenarSectoresPorImporte,
  DIVISA_LABELS,
  DIVISAS_INDICADOR,
  filtrarOrdenesParaIndicadores,
  filtrarOrdenesPorFecha,
  getRangoFechasPorDefecto,
  parseTipoCambio,
  type FiltroDivisaIndicador,
  type OrdenCompraIndicador,
} from "@/lib/indicadores-compras";
import { AhorrosAlcanzadosChart } from "@/components/indicadores/ahorros-alcanzados-chart";
import { ImporteModalidadPagoChart } from "@/components/indicadores/importe-modalidad-pago-chart";
import { ImporteCondicionProcesoChart } from "@/components/indicadores/importe-condicion-proceso-chart";
import { SolicitudesPorSectorChart } from "@/components/indicadores/solicitudes-por-sector-chart";
import { ImportePorSectorChart } from "@/components/indicadores/importe-por-sector-chart";
import { EstadoSolicitudesChart } from "@/components/indicadores/estado-solicitudes-chart";
import { ImporteArticuloCcChart } from "@/components/indicadores/importe-articulo-cc-chart";
import { ImportePorProveedorChart } from "@/components/indicadores/importe-por-proveedor-chart";

export function IndicadoresComprasDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const rangoPorDefecto = useMemo(() => getRangoFechasPorDefecto(), []);

  const [ordenes, setOrdenes] = useState<OrdenCompraIndicador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState(rangoPorDefecto.desde);
  const [fechaHasta, setFechaHasta] = useState(rangoPorDefecto.hasta);
  const [filtroDivisa, setFiltroDivisa] = useState<FiltroDivisaIndicador>("todas");
  const [totalizarEnArs, setTotalizarEnArs] = useState(false);
  const [tcUsd, setTcUsd] = useState("");
  const [tcEur, setTcEur] = useState("");

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("ordenes_compra")
        .select("id, noc, fecha, estado, total, divisa, importe_competencia, ahorro, tipo_pago, condi_proceso, sector, cod_cta, proveedor, articulos")
        .order("fecha", { ascending: false });

      if (fetchError) throw fetchError;
      setOrdenes((data as OrdenCompraIndicador[]) || []);
    } catch (err) {
      console.error("Error fetching ordenes para indicadores:", err);
      setError("No se pudieron cargar las órdenes de compra.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  const ordenesFiltradas = useMemo(
    () => filtrarOrdenesParaIndicadores(ordenes, fechaDesde, fechaHasta),
    [ordenes, fechaDesde, fechaHasta]
  );

  const ordenesFiltradasPorFecha = useMemo(
    () => filtrarOrdenesPorFecha(ordenes, fechaDesde, fechaHasta),
    [ordenes, fechaDesde, fechaHasta]
  );

  const ahorrosPorDivisa = useMemo(
    () => calcularAhorrosAlcanzadosPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const importeModalidadPorDivisa = useMemo(
    () => calcularImportePorModalidadPagoPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const importeCondicionProcesoPorDivisa = useMemo(
    () => calcularImportePorCondicionProcesoPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const solicitudesPorSectorPorDivisa = useMemo(
    () => calcularSolicitudesPorSectorPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const solicitudesPorEstadoPorDivisa = useMemo(
    () => calcularSolicitudesPorEstadoPorDivisa(ordenesFiltradasPorFecha),
    [ordenesFiltradasPorFecha]
  );

  const importePorCodCtaPorDivisa = useMemo(
    () => calcularImportePorCodCtaPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const importePorProveedorPorDivisa = useMemo(
    () => calcularImportePorProveedorPorDivisa(ordenesFiltradas),
    [ordenesFiltradas]
  );

  const tipoCambioUsd = useMemo(() => parseTipoCambio(tcUsd), [tcUsd]);
  const tipoCambioEur = useMemo(() => parseTipoCambio(tcEur), [tcEur]);
  const tiposCambioValidos =
    totalizarEnArs && tipoCambioUsd !== null && tipoCambioEur !== null;

  const indicadoresGrafico = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        consolidarAhorrosEnArs(ahorrosPorDivisa, {
          usd: tipoCambioUsd!,
          eur: tipoCambioEur!,
        }),
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ahorrosPorDivisa[divisa]);
    }

    return [calcularAhorrosAlcanzados(ordenesFiltradas, filtroDivisa)];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    ahorrosPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const gruposModalidadPago = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          modalidades: consolidarImporteModalidadEnArs(importeModalidadPorDivisa, {
            usd: tipoCambioUsd!,
            eur: tipoCambioEur!,
          }),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        modalidades: importeModalidadPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        modalidades: calcularImportePorModalidadPago(ordenesFiltradas, filtroDivisa),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    importeModalidadPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const gruposCondicionProceso = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          condiciones: consolidarImporteCondicionProcesoEnArs(
            importeCondicionProcesoPorDivisa,
            {
              usd: tipoCambioUsd!,
              eur: tipoCambioEur!,
            }
          ),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        condiciones: importeCondicionProcesoPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        condiciones: calcularImportePorCondicionProceso(
          ordenesFiltradas,
          filtroDivisa
        ),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    importeCondicionProcesoPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const gruposSolicitudesPorSector = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          sectores: consolidarSolicitudesPorSectorEnArs(
            solicitudesPorSectorPorDivisa,
            {
              usd: tipoCambioUsd!,
              eur: tipoCambioEur!,
            }
          ),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        sectores: solicitudesPorSectorPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        sectores: calcularSolicitudesPorSector(ordenesFiltradas, filtroDivisa),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    solicitudesPorSectorPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const gruposImportePorSector = useMemo(
    () =>
      gruposSolicitudesPorSector.map((grupo) => ({
        ...grupo,
        sectores: ordenarSectoresPorImporte(grupo.sectores),
      })),
    [gruposSolicitudesPorSector]
  );

  const gruposEstadoSolicitudes = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          estados: consolidarSolicitudesPorEstadoEnArs(
            solicitudesPorEstadoPorDivisa,
            {
              usd: tipoCambioUsd!,
              eur: tipoCambioEur!,
            }
          ),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        estados: solicitudesPorEstadoPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        estados: calcularSolicitudesPorEstado(
          ordenesFiltradasPorFecha,
          filtroDivisa
        ),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    solicitudesPorEstadoPorDivisa,
    filtroDivisa,
    ordenesFiltradasPorFecha,
  ]);

  const gruposImportePorCodCta = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          items: consolidarImportePorCodCtaEnArs(importePorCodCtaPorDivisa, {
            usd: tipoCambioUsd!,
            eur: tipoCambioEur!,
          }),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        items: importePorCodCtaPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        items: calcularImportePorCodCta(ordenesFiltradas, filtroDivisa),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    importePorCodCtaPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const tituloComparativaImporte =
    totalizarEnArs
      ? "Total consolidado en ARS"
      : filtroDivisa === "todas"
        ? "Comparativa por divisa"
        : `Total en ${DIVISA_LABELS[filtroDivisa]}`;

  const gruposImportePorProveedor = useMemo(() => {
    if (totalizarEnArs) {
      if (!tiposCambioValidos) return [];
      return [
        {
          divisa: "ARS" as const,
          etiquetaGrupo: "Total en ARS",
          proveedores: consolidarImportePorProveedorEnArs(
            importePorProveedorPorDivisa,
            {
              usd: tipoCambioUsd!,
              eur: tipoCambioEur!,
            }
          ),
        },
      ];
    }

    if (filtroDivisa === "todas") {
      return DIVISAS_INDICADOR.map((divisa) => ({
        divisa,
        proveedores: importePorProveedorPorDivisa[divisa],
      }));
    }

    return [
      {
        divisa: filtroDivisa,
        proveedores: calcularImportePorProveedor(ordenesFiltradas, filtroDivisa),
      },
    ];
  }, [
    totalizarEnArs,
    tiposCambioValidos,
    tipoCambioUsd,
    tipoCambioEur,
    importePorProveedorPorDivisa,
    filtroDivisa,
    ordenesFiltradas,
  ]);

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleTotalizarEnArs = (checked: boolean) => {
    setTotalizarEnArs(checked);
    if (checked) {
      setFiltroDivisa("todas");
    }
  };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-gray-800">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="indicadores-fecha-desde" className="text-sm text-gray-600">
                Desde
              </Label>
              <Input
                id="indicadores-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="indicadores-fecha-hasta" className="text-sm text-gray-600">
                Hasta
              </Label>
              <Input
                id="indicadores-fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="indicadores-divisa" className="text-sm text-gray-600">
                Divisa
              </Label>
              <select
                id="indicadores-divisa"
                value={filtroDivisa}
                onChange={(e) =>
                  setFiltroDivisa(e.target.value as FiltroDivisaIndicador)
                }
                disabled={totalizarEnArs}
                className="h-9 w-44 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="todas">Todas las divisas</option>
                <option value="USD">{DIVISA_LABELS.USD}</option>
                <option value="EUR">{DIVISA_LABELS.EUR}</option>
                <option value="ARS">{DIVISA_LABELS.ARS}</option>
              </select>
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button type="button" variant="outline" onClick={limpiarFiltros}>
                Limpiar fechas
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="totalizar-en-ars"
                checked={totalizarEnArs}
                onCheckedChange={(checked) => handleTotalizarEnArs(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="totalizar-en-ars"
                  className="cursor-pointer text-sm font-medium text-gray-800"
                >
                  Totalizar en moneda local (ARS)
                </Label>
                <p className="text-xs text-gray-500">
                  Convierte USD y EUR al tipo de cambio del día y suma todo en pesos.
                </p>
              </div>
            </div>

            {totalizarEnArs && (
              <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tc-usd" className="text-sm text-gray-600">
                    TC del día USD → ARS
                  </Label>
                  <Input
                    id="tc-usd"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1050,50"
                    value={tcUsd}
                    onChange={(e) => setTcUsd(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tc-eur" className="text-sm text-gray-600">
                    TC del día EUR → ARS
                  </Label>
                  <Input
                    id="tc-eur"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 1150,00"
                    value={tcEur}
                    onChange={(e) => setTcEur(e.target.value)}
                    className="w-44"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {ordenesFiltradas.length}{" "}
            {ordenesFiltradas.length === 1 ? "orden" : "órdenes"} en el período
            (excluye anuladas).
            {totalizarEnArs && tiposCambioValidos && (
              <>
                {" "}
                Conversión aplicada: 1 USD = {tipoCambioUsd!.toLocaleString("es-AR")} ARS,
                1 EUR = {tipoCambioEur!.toLocaleString("es-AR")} ARS.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
          Cargando indicadores...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Ahorros alcanzados</CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Totales consolidados en ARS. El ahorro es la diferencia entre cotizado y confirmado."
                : "Importe más alto cotizado, confirmado y ahorro por divisa."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <AhorrosAlcanzadosChart
                indicadores={indicadoresGrafico}
                tituloComparativa={
                  totalizarEnArs ? "Total consolidado en ARS" : "Comparativa por divisa"
                }
                etiquetasGrupo={
                  totalizarEnArs ? { ARS: "Total en ARS" } : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Importe por modalidad de pago
            </CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Total confirmado por Cta A, Cta B y Mercado libre, consolidado en ARS."
                : "Total confirmado de órdenes según tipo de pago (Cta A, Cta B, Mercado libre)."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <ImporteModalidadPagoChart
                grupos={gruposModalidadPago}
                tituloComparativa={
                  totalizarEnArs
                    ? "Total consolidado en ARS"
                    : filtroDivisa === "todas"
                      ? "Comparativa por divisa"
                      : `Total en ${DIVISA_LABELS[filtroDivisa]}`
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Condición de proceso
            </CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Total confirmado por Bajo proceso, Fuera de proceso y Urgente, consolidado en ARS."
                : "Total confirmado de órdenes según condición de proceso."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <ImporteCondicionProcesoChart
                grupos={gruposCondicionProceso}
                tituloComparativa={
                  totalizarEnArs
                    ? "Total consolidado en ARS"
                    : filtroDivisa === "todas"
                      ? "Comparativa por divisa"
                      : `Total en ${DIVISA_LABELS[filtroDivisa]}`
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Solicitudes por sectores
            </CardTitle>
            <p className="text-sm text-gray-500">
              Cantidad de órdenes de compra agrupadas por sector solicitante.
              {totalizarEnArs
                ? " Importes consolidados en ARS al pasar el cursor."
                : " Al pasar el cursor se muestra el importe confirmado."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <SolicitudesPorSectorChart
                grupos={gruposSolicitudesPorSector}
                tituloComparativa={
                  totalizarEnArs
                    ? "Total consolidado"
                    : filtroDivisa === "todas"
                      ? "Comparativa por divisa"
                      : `Total en ${DIVISA_LABELS[filtroDivisa]}`
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Importe por sector
            </CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Importe confirmado por sector, consolidado en ARS."
                : "Importe confirmado total de órdenes agrupado por sector solicitante."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <ImportePorSectorChart
                grupos={gruposImportePorSector}
                tituloComparativa={
                  totalizarEnArs
                    ? "Total consolidado en ARS"
                    : filtroDivisa === "todas"
                      ? "Comparativa por divisa"
                      : `Total en ${DIVISA_LABELS[filtroDivisa]}`
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Estado de solicitudes
            </CardTitle>
            <p className="text-sm text-gray-500">
              Cantidad de órdenes por estado (incluye anuladas).
              {totalizarEnArs
                ? " Importes consolidados en ARS al pasar el cursor."
                : " Al pasar el cursor se muestra el importe confirmado."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <EstadoSolicitudesChart
                grupos={gruposEstadoSolicitudes}
                tituloComparativa={
                  totalizarEnArs
                    ? "Total consolidado"
                    : filtroDivisa === "todas"
                      ? "Comparativa por divisa"
                      : `Total en ${DIVISA_LABELS[filtroDivisa]}`
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Importe por código de cuenta (CC)
            </CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Valor confirmado de líneas de artículo agrupado por código de cuenta, consolidado en ARS."
                : "Valor confirmado de cada línea de artículo agrupado por código de cuenta (CC)."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <ImporteArticuloCcChart
                secciones={[
                  {
                    tituloSeccion: "Por código de cuenta (CC)",
                    descripcion:
                      "Suma del valor de cada línea según el código de cuenta de la orden.",
                    grupos: gruposImportePorCodCta,
                    tituloComparativa: tituloComparativaImporte,
                    mensajeVacio:
                      "No hay importes con código de cuenta en el rango seleccionado.",
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Importe por proveedor
            </CardTitle>
            <p className="text-sm text-gray-500">
              {totalizarEnArs
                ? "Importe confirmado por proveedor, consolidado en ARS."
                : "Importe confirmado total de órdenes agrupado por proveedor."}
            </p>
          </CardHeader>
          <CardContent>
            {totalizarEnArs && !tiposCambioValidos ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-800">
                Ingresá el tipo de cambio del día en USD y EUR para ver el total en ARS.
              </div>
            ) : (
              <ImportePorProveedorChart
                grupos={gruposImportePorProveedor}
                tituloComparativa={tituloComparativaImporte}
              />
            )}
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
