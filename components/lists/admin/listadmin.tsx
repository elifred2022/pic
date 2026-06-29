"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PedidosGeneralesAdminMobileList from "@/components/lists/admin/PedidosGeneralesAdminMobileList";
import { OcBackLink } from "@/components/ordenes-compra/oc-back-link";
import { useOcVolver, type OcVolver } from "@/hooks/use-oc-volver";
import {
  emptyOcFacturaForm,
  formatDateInputValue,
  getFacturaViewUrl,
  parseOrdenCompraEntero,
  uploadFacturaOrdenCompra,
} from "@/lib/fact-compras-storage";
import {
  getPresupuestoViewUrl,
  removePresupuestoFromStorage,
  uploadPresupuestoProveedor,
} from "@/lib/presupuestos-storage";

const COMPRADOR_OPCIONES = ["Eliezer Martinez", "Fatima Dimenna", "Otros"] as const;

function presupuestoStorageIdPic(pedidoId: string) {
  return `pic/${pedidoId}`;
}

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

  articulos: Array<{
    articulo: string;
    descripcion?: string;
    cant: number;
    cant_exist?: number;
    observacion?: string;
    link?: string;
  }>; // Array de artículos
  notas?: string;
  controlado: string;
  superviso: string;
  estado: string;
  aprueba: string;
  notas_aprobador?: string;
  nota_aprobador?: string;
  oc: number;
  proveedor_selec: string;
  usd: number;
  eur: number;
  tc: number;
  ars: number;
  porcent: number;
  ars_desc: number;
  total_simp: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  mod_pago: string;
  proceso: string;
  prov_uno: string;
  cost_prov_uno: string | number;
  subt_prov1: number;
  prov_dos: string;
  cost_prov_dos: string | number;
  subt_prov2: number;
  prov_tres: string;
  cost_prov_tres: string | number;
  subt_prov3: number;
  comparativa_prov?: ProveedorComparativa[] | null;
  notas_comprador?: string;
  comprador?: string | null;
  // Agregá más campos si los usás en el .map()
};

export default function ListAdmin() {
  const searchParams = useSearchParams();
  const { ocVolver, resolveOcParaPedido } = useOcVolver();
  const [comparativaOc, setComparativaOc] = useState<OcVolver | null>(null);
  const [ocFacturaForm, setOcFacturaForm] = useState(emptyOcFacturaForm);
  const [ocFacturaImageUrl, setOcFacturaImageUrl] = useState<string | null>(null);
  const [ocFacturaUploading, setOcFacturaUploading] = useState(false);
  const [ocFacturaUploadError, setOcFacturaUploadError] = useState<string | null>(null);
  const [guardandoComparativa, setGuardandoComparativa] = useState(false);
  const [presupuestoViewUrls, setPresupuestoViewUrls] = useState<Record<number, string | null>>({});
  const [comparativaPresupuestoUrls, setComparativaPresupuestoUrls] = useState<
    Record<number, string | null>
  >({});
  const [presupuestoUploading, setPresupuestoUploading] = useState<Record<number, boolean>>({});
  const [presupuestoUploadErrors, setPresupuestoUploadErrors] = useState<
    Record<number, string | null>
  >({});
  const comparativaAbiertaRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [verInfo, setVerInfo] = useState<Pedido | null>(null);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarAprobados, setOcultarAprobados] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [ocultarStandBy, setOcultarStandBy] = useState(false);
  const [ocultarConfirmado, setOcultarConfirmado] = useState(false);

  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const [comparativaForm, setComparativaForm] = useState<ProveedorComparativa[] | null>(null);
  const [selectedMobilePedidoId, setSelectedMobilePedidoId] = useState<string | null>(null);
  const supabase = createClient();

  const mobileBtnBase =
    "w-full min-h-[48px] px-4 py-3 text-base font-semibold rounded-xl shadow-sm transition active:scale-[0.98] touch-manipulation";

  const calcularSubtotalConDescuento = (precioUnitario: number | null, descuentoPorcentaje: number, cantidad: number) => {
    const precioBase = precioUnitario || 0;
    const descuentoNormalizado = Math.min(100, Math.max(0, descuentoPorcentaje || 0));
    const precioConDescuento = precioBase * (1 - descuentoNormalizado / 100);
    return precioConDescuento * cantidad;
  };

  // ✅ Función para actualizar pedido
  const handleUpdatePedido = async () => {
    if (!editingPedido) return;
    
    // Preparar datos para actualizar, incluyendo la comparativa de proveedores
    const datosActualizar: Record<string, unknown> = {
      ...formData,
      comparativa_prov: comparativaForm ? comparativaForm.map(prov => ({
        nombreProveedor: prov.nombreProveedor,
        presupuesto_path: prov.presupuesto_path ?? null,
        articulos: prov.articulos.map(art => ({
          articulo: art.articulo,
          cant: art.cant,
          precioUnitario: art.precioUnitario,
          descuentoPorcentaje: art.descuentoPorcentaje || 0,
          subtotal: art.subtotal
        })),
        total: prov.total
      })) : null
    };

    datosActualizar.comprador =
      typeof formData.comprador === "string" && formData.comprador.trim()
        ? formData.comprador.trim()
        : null;
    
    const { error } = await supabase
      .from("pic")
      .update(datosActualizar)
      .eq("id", editingPedido.id);

    if (error) {
      alert("Error actualizando");
      console.error(error);
    } else {
      alert("Actualizado correctamente");
      setEditingPedido(null);
      setFormData({});
      setComparativaForm(null);
      setPresupuestoViewUrls({});
      setPresupuestoUploadErrors({});
      const { data } = await supabase.from("pic").select("*");
      if (data) setPedidos(data);
    }
  };

  // Recalcular comparativa cuando se abre el modal de edición
  useEffect(() => {
    if (!editingPedido || !formData.articulos || formData.articulos.length === 0) return;

    // Evita re-inicializar en cada render y romper el árbol con loops de estado.
    if (comparativaForm) return;

    // Si ya existe comparativa en la base de datos, cargarla
    if (editingPedido.comparativa_prov && Array.isArray(editingPedido.comparativa_prov)) {
      const comparativaConDescuento = editingPedido.comparativa_prov.map((prov) => ({
        ...prov,
        articulos: prov.articulos.map((art) => ({
          ...art,
          descuentoPorcentaje: art.descuentoPorcentaje || 0
        }))
      }));
      setComparativaForm(comparativaConDescuento);
      return;
    }

    // Crear estructura inicial si no existe
    const articulosBase = formData.articulos.map(a => ({
      articulo: a.articulo,
      cant: a.cant,
      precioUnitario: null,
      descuentoPorcentaje: 0,
      subtotal: 0
    }));

    setComparativaForm([
      { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
      { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
      { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 }
    ]);
  }, [editingPedido, formData.articulos, comparativaForm]);

  // función para formatear las fechas
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

  //Filtro que también contempla las fechas y busca dentro del array de artículos
  const filteredPedidos = pedidos
    .filter((pedido) => {
      const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
      if (!s) return true;                     // si el input está vacío, no filtra nada

      // Buscar en campos directos del pedido
      const foundInDirectFields = Object.entries(pedido).some(([key, value]) => {
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

      // Si ya encontró en campos directos, retornar true
      if (foundInDirectFields) return true;

      // Buscar dentro del array de artículos
      if (Array.isArray(pedido.articulos)) {
        const foundInArticles = pedido.articulos.some((articulo) => {
          return Object.values(articulo).some((value) => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(s);
          });
        });
        return foundInArticles;
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

  const buildFormDataFromPedido = (pedido: Pedido): Partial<Pedido> => ({
    created_at: pedido.created_at,
    necesidad: pedido.necesidad,
    categoria: pedido.categoria,
    solicita: pedido.solicita,
    nota_solicitante: pedido.nota_solicitante,
    sector: pedido.sector,
    articulos: pedido.articulos,
    notas: pedido.notas,
    controlado: pedido.controlado,
    superviso: pedido.superviso,
    estado: pedido.estado,
    oc: pedido.oc,
    proveedor_selec: pedido.proveedor_selec,
    usd: pedido.usd,
    eur: pedido.eur,
    tc: pedido.tc,
    ars: pedido.ars,
    porcent: pedido.porcent,
    ars_desc: pedido.ars_desc,
    total_simp: pedido.total_simp,
    fecha_conf: pedido.fecha_conf,
    fecha_prom: pedido.fecha_prom,
    fecha_ent: pedido.fecha_ent,
    rto: pedido.rto,
    fac: pedido.fac,
    mod_pago: pedido.mod_pago,
    proceso: pedido.proceso,
    prov_uno: pedido.prov_uno,
    cost_prov_uno: pedido.cost_prov_uno,
    subt_prov1: pedido.subt_prov1,
    prov_dos: pedido.prov_dos,
    cost_prov_dos: pedido.cost_prov_dos,
    subt_prov2: pedido.subt_prov2,
    prov_tres: pedido.prov_tres,
    cost_prov_tres: pedido.cost_prov_tres,
    subt_prov3: pedido.subt_prov3,
    notas_comprador: pedido.notas_comprador,
    comprador: pedido.comprador,
  });

  const abrirInfoPedido = async (pedido: Pedido) => {
    setOcFacturaForm(emptyOcFacturaForm());
    setOcFacturaImageUrl(null);
    setOcFacturaUploadError(null);

    const oc = await resolveOcParaPedido({ id: pedido.id, numero_oc: pedido.oc });
    setComparativaOc(oc);

    setVerInfo(pedido);
    setFormData(buildFormDataFromPedido(pedido));
  };

  const handleSubirImagenFacturaOc = async (file: File) => {
    if (!comparativaOc?.id) return;

    setOcFacturaUploading(true);
    setOcFacturaUploadError(null);

    const result = await uploadFacturaOrdenCompra(supabase, comparativaOc.id, file);

    setOcFacturaUploading(false);

    if ("error" in result) {
      setOcFacturaUploadError(result.error);
      return;
    }

    setOcFacturaForm((prev) => ({ ...prev, fact_path: result.storagePath }));
    setOcFacturaImageUrl(result.viewUrl);
  };

  const handleSubirPresupuestoProveedor = async (provIndex: number, file: File) => {
    if (!editingPedido?.id || !comparativaForm) return;

    setPresupuestoUploading((prev) => ({ ...prev, [provIndex]: true }));
    setPresupuestoUploadErrors((prev) => ({ ...prev, [provIndex]: null }));

    const result = await uploadPresupuestoProveedor(
      supabase,
      presupuestoStorageIdPic(editingPedido.id),
      provIndex,
      file
    );

    setPresupuestoUploading((prev) => ({ ...prev, [provIndex]: false }));

    if ("error" in result) {
      setPresupuestoUploadErrors((prev) => ({ ...prev, [provIndex]: result.error }));
      return;
    }

    const nuevaComparativa = comparativaForm.map((prov, i) =>
      i === provIndex ? { ...prov, presupuesto_path: result.storagePath } : prov
    );
    setComparativaForm(nuevaComparativa);
    setPresupuestoViewUrls((prev) => ({ ...prev, [provIndex]: result.viewUrl }));

    const { error } = await supabase
      .from("pic")
      .update({ comparativa_prov: nuevaComparativa })
      .eq("id", editingPedido.id);

    if (error) {
      setPresupuestoUploadErrors((prev) => ({
        ...prev,
        [provIndex]: `Archivo subido pero no se guardó en el pedido: ${error.message}`,
      }));
      return;
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === editingPedido.id ? { ...p, comparativa_prov: nuevaComparativa } : p
      )
    );
    setEditingPedido((prev) =>
      prev ? { ...prev, comparativa_prov: nuevaComparativa } : null
    );
  };

  const handleQuitarPresupuestoProveedor = async (provIndex: number) => {
    if (!editingPedido?.id || !comparativaForm) return;

    const pathActual = comparativaForm[provIndex]?.presupuesto_path;
    if (!pathActual) return;

    if (!window.confirm("¿Quitar el presupuesto adjunto de este proveedor?")) return;

    setPresupuestoUploading((prev) => ({ ...prev, [provIndex]: true }));
    setPresupuestoUploadErrors((prev) => ({ ...prev, [provIndex]: null }));

    const removeResult = await removePresupuestoFromStorage(supabase, pathActual);
    if ("error" in removeResult) {
      setPresupuestoUploading((prev) => ({ ...prev, [provIndex]: false }));
      setPresupuestoUploadErrors((prev) => ({ ...prev, [provIndex]: removeResult.error }));
      return;
    }

    const nuevaComparativa = comparativaForm.map((prov, i) =>
      i === provIndex ? { ...prov, presupuesto_path: null } : prov
    );
    setComparativaForm(nuevaComparativa);
    setPresupuestoViewUrls((prev) => {
      const next = { ...prev };
      delete next[provIndex];
      return next;
    });

    const { error } = await supabase
      .from("pic")
      .update({ comparativa_prov: nuevaComparativa })
      .eq("id", editingPedido.id);

    setPresupuestoUploading((prev) => ({ ...prev, [provIndex]: false }));

    if (error) {
      setPresupuestoUploadErrors((prev) => ({
        ...prev,
        [provIndex]: `No se pudo actualizar el pedido: ${error.message}`,
      }));
      return;
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === editingPedido.id ? { ...p, comparativa_prov: nuevaComparativa } : p
      )
    );
    setEditingPedido((prev) =>
      prev ? { ...prev, comparativa_prov: nuevaComparativa } : null
    );
  };

  const handleGuardarComparativa = async () => {
    if (!verInfo) return;

    setGuardandoComparativa(true);

    const datosActualizar = {
      estado: formData.estado,
      oc: formData.oc ?? 0,
      proveedor_selec: formData.proveedor_selec,
      fac: formData.fac ?? 0,
      rto: formData.rto ?? 0,
      fecha_ent: formData.fecha_ent || null,
    };

    const { error } = await supabase
      .from("pic")
      .update(datosActualizar)
      .eq("id", verInfo.id);

    if (error) {
      alert(`Error al guardar el pedido: ${error.message}`);
      setGuardandoComparativa(false);
      return;
    }

    if (comparativaOc?.id) {
      const { error: ocError } = await supabase
        .from("ordenes_compra")
        .update({
          fc: parseOrdenCompraEntero(ocFacturaForm.fc),
          rt: parseOrdenCompraEntero(ocFacturaForm.rt),
          fact_path: ocFacturaForm.fact_path || null,
          fecha_entrega: ocFacturaForm.fecha_entrega || null,
        })
        .eq("id", comparativaOc.id);

      if (ocError) {
        alert(`Pedido guardado, pero error en la orden de compra: ${ocError.message}`);
        setGuardandoComparativa(false);
        return;
      }
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === verInfo.id ? { ...p, ...datosActualizar } as Pedido : p
      )
    );

    setGuardandoComparativa(false);
    setVerInfo(null);
    setComparativaOc(null);
    setComparativaPresupuestoUrls({});
  };

  const abrirEdicionPedido = (pedido: Pedido) => {
    setComparativaForm(null);
    setEditingPedido(pedido);
    setFormData(buildFormDataFromPedido(pedido));
  };

  const eliminarPedido = async (pedido: Pedido) => {
    const confirm = window.confirm(`¿Estás seguro de que querés eliminar el pedido ${pedido.id}?`);
    if (!confirm) return;

    const { error } = await supabase.from("pic").delete().eq("id", pedido.id);
    if (error) {
      alert("Error al eliminar");
      console.error(error);
    } else {
      alert("Pedido eliminado");
      setSelectedMobilePedidoId((prev) => (prev === pedido.id ? null : prev));
      const { data } = await supabase.from("pic").select("*");
      if (data) setPedidos(data);
    }
  };

  // Estilos para la tabla (comentados por ahora)
  // const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
  // const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";

  // ✅ Función para imprimir información del pedido
  const imprimirInfoPedido = () => {
    if (!verInfo) return;
    
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Interno de Compra - ${verInfo.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 10px;
            color: #333;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            color: #059669;
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 10px;
          }
          .info-section {
            background: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            margin-bottom: 10px;
          }
          .info-section h3 {
            color: #047857;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #10b981;
            padding-bottom: 5px;
            font-size: 12px;
          }
          .presupuestos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin: 10px 0;
          }
          .presupuesto-card {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            padding: 8px;
            text-align: center;
          }
          .presupuesto-card h4 {
            color: #0369a1;
            margin: 0 0 5px 0;
            font-size: 10px;
          }
          .presupuesto-valor {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
          }
          .articulos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .articulos-table th {
            background: #f3f4f6;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
          }
          .articulos-table td {
            padding: 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
          }
          .articulos-table tr:hover {
            background: #f9fafb;
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pedido Interno de Compra</h1>
          <p><strong>Número de Pedido:</strong> ${verInfo.id}</p>
          <p><strong>Fecha de Creación:</strong> ${formatDate(verInfo.created_at)}</p>
        </div>
        
        <!-- Información del Pedido -->
        <div class="info-section">
          <h3>Información del Pedido</h3>
          <table class="articulos-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Necesidad</strong></td>
                <td>${formatDate(verInfo.necesidad) || verInfo.necesidad || '-'}</td>
              </tr>
              <tr>
                <td><strong>Fecha confirmada</strong></td>
                <td>${formatDate(verInfo.fecha_conf) || '-'}</td>
              </tr>
              <tr>
                <td><strong>Fecha promesa</strong></td>
                <td>${formatDate(verInfo.fecha_prom) || '-'}</td>
              </tr>
              <tr>
                <td><strong>Categoría</strong></td>
                <td>${verInfo.categoria || '-'}</td>
              </tr>
              <tr>
                <td><strong>Solicitante</strong></td>
                <td>${verInfo.solicita || '-'}</td>
              </tr>
              <tr>
                <td><strong>Notas solicitante</strong></td>
                <td>${verInfo.nota_solicitante && String(verInfo.nota_solicitante).trim() ? String(verInfo.nota_solicitante).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') : '-'}</td>
              </tr>
              <tr>
                <td><strong>Comprador</strong></td>
                <td>${verInfo.comprador ? String(verInfo.comprador).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-'}</td>
              </tr>
              <tr>
                <td><strong>Notas del comprador</strong></td>
                <td>${verInfo.notas_comprador && String(verInfo.notas_comprador).trim() ? String(verInfo.notas_comprador).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') : '-'}</td>
              </tr>
              <tr>
                <td><strong>Sector</strong></td>
                <td>${verInfo.sector || '-'}</td>
              </tr>
              <tr>
                <td><strong>Estado</strong></td>
                <td>${verInfo.estado || '-'}</td>
              </tr>
              <tr>
                <td><strong>Aprobador</strong></td>
                <td>${verInfo.aprueba || '-'}</td>
              </tr>
              <tr>
                <td><strong>Orden de Compra</strong></td>
                <td>${verInfo.oc || '-'}</td>
              </tr>
              <tr>
                <td><strong>Total USD</strong></td>
                <td>$${verInfo.usd || 0}</td>
              </tr>
              <tr>
                <td><strong>Total EUR</strong></td>
                <td>€${verInfo.eur || 0}</td>
              </tr>
              <tr>
                <td><strong>Total ARS</strong></td>
                <td>$${verInfo.ars || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Artículos del Pedido -->
        ${Array.isArray(verInfo.articulos) && verInfo.articulos.length > 0 ? `
        <div class="info-section">
          <h3>Artículos del Pedido</h3>
          <table class="articulos-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Stock</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              ${verInfo.articulos.map((a) => `
                <tr>
                  <td>${a.articulo || '-'}</td>
                  <td>${a.descripcion || '-'}</td>
                  <td>${a.cant || 0}</td>
                  <td>${a.cant_exist || 0}</td>
                  <td>${a.observacion || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Sección de Presupuestos -->
        <div class="info-section">
          <h3>Presupuestos por Moneda</h3>
          <div class="presupuestos-grid">
            <div class="presupuesto-card">
              <h4>Presupuesto USD</h4>
              <div class="presupuesto-valor">$${verInfo.usd || 0}</div>
            </div>
            <div class="presupuesto-card">
              <h4>Presupuesto EUR</h4>
              <div class="presupuesto-valor">€${verInfo.eur || 0}</div>
            </div>
            <div class="presupuesto-card">
              <h4>Presupuesto ARS</h4>
              <div class="presupuesto-valor">$${verInfo.ars || 0}</div>
            </div>
          </div>
        </div>

        <!-- Comparativa de Proveedores -->
        ${verInfo.comparativa_prov && Array.isArray(verInfo.comparativa_prov) && verInfo.comparativa_prov.length > 0 ? `
        <div class="info-section">
          <h3>Comparativa de Proveedores</h3>
          <div class="presupuestos-grid">
            ${verInfo.comparativa_prov.map((prov, provIndex) => `
              <div class="presupuesto-card">
                <h4>${prov.nombreProveedor || 'Proveedor ' + (provIndex + 1)}</h4>
                ${prov.articulos && prov.articulos.length > 0 ? `
                  <div style="margin: 5px 0; font-size: 8px;">
                    ${prov.articulos.map(art => `
                      <div style="margin: 2px 0; padding: 2px; background: #f8fafc; border-radius: 2px;">
                        <strong>${art.articulo}</strong><br>
                        <span>Precio: $${(art.precioUnitario || 0).toLocaleString('es-AR')}</span><br>
                        <span>Desc.: ${(art.descuentoPorcentaje || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</span><br>
                        <span>Subtotal: $${(art.subtotal || 0).toLocaleString('es-AR')}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                <div class="presupuesto-valor" style="margin-top: 5px;">
                  Total: $${(prov.total || 0).toLocaleString('es-AR')}
                </div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 6px 0; font-size: 10px;">Notas del comprador</h4>
            <p style="margin: 0; font-size: 9px; white-space: pre-wrap;">${String(verInfo.notas_comprador ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 6px 0; font-size: 10px;">Notas del aprobador</h4>
            <p style="margin: 0; font-size: 9px; white-space: pre-wrap;">${String(verInfo.notas_aprobador || verInfo.nota_aprobador || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
        </div>
      </body>
      </html>
    `;

    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    ventanaImpresion.onload = () => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    };
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

  // Cargar datos tabla pic
  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("pic").select("*")
  
      if (error) console.error("Error cargando pedidos:", error);
      else setPedidos(data);
    };

    fetchPedidos();
  }, [supabase]);

  useEffect(() => {
    const comparativaId = searchParams.get("comparativa");
    if (!comparativaId || pedidos.length === 0) return;
    if (comparativaAbiertaRef.current === comparativaId) return;

    const pedido = pedidos.find((p) => String(p.id) === comparativaId);
    if (!pedido) return;

    comparativaAbiertaRef.current = comparativaId;
    void abrirInfoPedido(pedido);
  }, [searchParams, pedidos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!verInfo || !comparativaOc?.id) {
      setOcFacturaForm(emptyOcFacturaForm());
      setOcFacturaImageUrl(null);
      setOcFacturaUploadError(null);
      return;
    }

    const ocId = comparativaOc.id;
    let cancelled = false;

    setOcFacturaForm(emptyOcFacturaForm());
    setOcFacturaImageUrl(null);

    const cargarOcFactura = async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("fc, rt, fact_path, fecha_entrega")
        .eq("id", ocId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const factPath = data.fact_path ?? "";
      setOcFacturaForm({
        fc: data.fc != null ? String(data.fc) : "",
        rt: data.rt != null ? String(data.rt) : "",
        fact_path: factPath,
        fecha_entrega: formatDateInputValue(data.fecha_entrega),
      });

      if (factPath) {
        const url = await getFacturaViewUrl(supabase, factPath);
        if (!cancelled) setOcFacturaImageUrl(url);
      } else if (!cancelled) {
        setOcFacturaImageUrl(null);
      }
    };

    void cargarOcFactura();
    return () => {
      cancelled = true;
    };
  }, [verInfo?.id, comparativaOc?.id, supabase]);

  const presupuestoPathsKey =
    comparativaForm?.map((p) => p.presupuesto_path ?? "").join("|") ?? "";

  useEffect(() => {
    if (!editingPedido || !comparativaForm?.length) {
      setPresupuestoViewUrls({});
      return;
    }

    let cancelled = false;

    const cargarUrls = async () => {
      const urls: Record<number, string | null> = {};
      await Promise.all(
        comparativaForm.map(async (prov, i) => {
          if (prov.presupuesto_path) {
            urls[i] = await getPresupuestoViewUrl(supabase, prov.presupuesto_path);
          }
        })
      );
      if (!cancelled) setPresupuestoViewUrls(urls);
    };

    void cargarUrls();
    return () => {
      cancelled = true;
    };
  }, [editingPedido?.id, presupuestoPathsKey, supabase]);

  useEffect(() => {
    const provs = verInfo?.comparativa_prov;
    if (!verInfo || !provs?.length) {
      setComparativaPresupuestoUrls({});
      return;
    }

    let cancelled = false;

    const cargarUrls = async () => {
      const urls: Record<number, string | null> = {};
      await Promise.all(
        provs.map(async (prov, i) => {
          if (prov.presupuesto_path) {
            urls[i] = await getPresupuestoViewUrl(supabase, prov.presupuesto_path);
          }
        })
      );
      if (!cancelled) setComparativaPresupuestoUrls(urls);
    };

    void cargarUrls();
    return () => {
      cancelled = true;
    };
  }, [verInfo?.id, verInfo?.comparativa_prov, supabase]);

  useEffect(() => {
    if (!verInfo || !searchParams.get("comparativa")) return;
    const timer = setTimeout(() => {
      document
        .getElementById("comparativa-proveedores")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [verInfo, searchParams]);

  return (
    <div className="flex-1 w-full p-4 bg-gray-50 min-h-screen">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
             <Link
              href="/auth/modulo-compras"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
            >
            Volver
            </Link>
           
          <h1 className="text-3xl font-bold text-gray-800">Pedidos Generales</h1>
        </div>
      
        <div className="flex flex-wrap gap-4 items-center">
          <Link
            href="/auth/crear-formus"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
          >
            ➕ Crear nuevo pedido general
          </Link>
          
          <input
            type="text"
            placeholder="🔍 Buscar pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>
        </div>

      {/* Filtros con mejor diseño */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Filtros de estado</h3>
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
            <span className="text-gray-700 font-medium">Ocultar stand by</span>
              </label>
        </div>
      </div>

             {/* Tabla con scroll horizontal y encabezado congelado */}
       <div className="bg-white rounded-lg shadow-md overflow-hidden">
         <PedidosGeneralesAdminMobileList
           pedidos={filteredPedidos}
           selectedId={selectedMobilePedidoId}
           onSelect={setSelectedMobilePedidoId}
           onClearSelection={() => setSelectedMobilePedidoId(null)}
           formatDate={formatDate}
           renderValue={renderValue}
           mobileBtnBase={mobileBtnBase}
           onInfo={abrirInfoPedido}
           onEdit={abrirEdicionPedido}
           onDelete={eliminarPedido}
         />
         <div className="hidden lg:block overflow-x-auto max-h-[70vh] overflow-y-auto">
           <table className="min-w-full table-auto border-collapse">
             <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
               <tr>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left bg-gradient-to-r from-blue-600 to-blue-700">Acciones</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Estado</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Nº PIC</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha sol</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha nec</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Categoria</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Solicita</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Sector</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Artículos Solicitados</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Supervisado/Revisado</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Comprador</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Notas</th>
                  <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Aprueba</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">OC</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Proveedor Selec.</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">USD</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">EUR</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">ARS sin imp</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha confirm</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha prometida</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha entrega</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Rto</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fact</th>
                 
          </tr>
        </thead>
          
        <tbody>
          {filteredPedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td className="px-4 py-3 border-b border-gray-200 align-top">
                <div className="flex flex-col gap-2">
                   <button
                    className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={() => abrirInfoPedido(pedido)}
                  >
                    📋 Info
                  </button>
                  <button
                    className="px-3 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={() => abrirEdicionPedido(pedido)}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={() => eliminarPedido(pedido)}
                  >
                    🗑️ Elim
                  </button>
                </div>
              </td>
             
            <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <span
                    className={
                    pedido.estado === "anulado"
                         ? "px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "aprobado"
                         ? "px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "cotizado"
                         ? "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "stand by"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "Visto/recibido"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "Presentar presencial"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "cumplido"
                         ? "px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full"
                         : pedido.estado === "confirmado" 
                         ? "px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
                         : "px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                    }
                >
                   {renderValue(pedido.estado)}
                </span>
            </td>
             <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.id}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.created_at) || "-"}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.necesidad)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.categoria}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium text-gray-800">{pedido.solicita}</span>
                  {pedido.nota_solicitante?.trim() ? (
                    <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                      {pedido.nota_solicitante}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.sector}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <div className="bg-gray-50 rounded-lg p-3 max-w-xs">
                  {Array.isArray(pedido.articulos) ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cant.</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Stock</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observ.</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.articulos.map((a, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-2 py-1 font-medium">{a.articulo}</td>
                             <td className="px-2 py-1 text-gray-700">
                               {a.descripcion && a.descripcion.length > 30 
                                 ? `${a.descripcion.substring(0, 30)}...` 
                                 : a.descripcion || "-"}
                             </td>
                             <td className="px-2 py-1 text-center font-semibold">{Number(a.cant) || 0}</td>
                             <td className="px-2 py-1 text-center">{Number(a.cant_exist) || 0}</td>
                             <td className="px-2 py-1 text-gray-600 max-w-20 break-words">
                               {a.observacion && a.observacion.length > 20 
                                 ? `${a.observacion.substring(0, 20)}...` 
                                 : a.observacion || "-"}
                             </td>
                             <td className="px-2 py-1">
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
                  ) : (
                    <span className="text-sm text-gray-500">Sin artículos</span>
                  )}
                </div>
                             </td>

                 <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{renderValue(pedido.controlado)}</span>
                      <span className="text-sm text-gray-600">{pedido.superviso}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{renderValue(pedido.comprador)}</span>
                      {pedido.notas_comprador?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {pedido.notas_comprador}
                        </span>
                      ) : null}
                    </div>
                  </td>
               
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-red-600 text-xs max-w-32 break-words">{renderValue(pedido.notas)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <div className="flex flex-col items-center gap-1">
                  <span>{renderValue(pedido.aprueba)}</span>
                  <span className="text-xs text-red-600 max-w-[180px] break-words">
                    {pedido.notas_aprobador || "-"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium">{pedido.oc}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium">{renderValue(pedido.proveedor_selec)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.usd}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.eur}</td>
              
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium">$ {Number(pedido.ars).toLocaleString("es-AR")}</td>
             
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.rto}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.fac}</td>
             
              
            
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
      

      {/* ✅ Modal de edición */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1800px] max-h-[95vh] overflow-y-auto overflow-x-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido General #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido general</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">🏭</span>
                    Información del Pedido
                  </h3>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Sector:</span> {formData.sector}</p>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Categoría:</span> {formData.categoria}</p>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Solicitante:</span> {formData.solicita}</p>
                  {formData.nota_solicitante?.trim() ? (
                    <p className="text-gray-700 mb-2 text-sm text-blue-700 font-bold whitespace-pre-wrap">
                      <span className="font-medium text-gray-800">Notas solicitante:</span>{" "}
                      {formData.nota_solicitante}
                    </p>
                  ) : null}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📦</span>
                    Artículos Solicitados
                  </h3>
                  {formData.articulos && formData.articulos.length > 0 ? (
                    <div className="space-y-3">
                      {formData.articulos.map((art, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                          <div className="font-medium text-gray-800 text-sm mb-2">{art.articulo}</div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="text-gray-600 text-xs">Cant. sol: {art.cant}</div>
                            <div className="text-gray-600 text-xs">Stock: {art.cant_exist}</div>
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Descripción:
                            </label>
                            <input
                              type="text"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              value={art.descripcion || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], descripcion: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="Descripción del artículo"
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Observación:
                            </label>
                            <textarea
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              rows={2}
                              value={art.observacion || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], observacion: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="Observaciones del artículo"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Link de Referencia:
                            </label>
                            <input
                              type="url"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              value={art.link || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], link: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="https://ejemplo.com"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">- Sin artículos -</p>
                  )}
                </div>
              </div>

                {/* Campos de edición del supervisor */}
                <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">⚙️</span>
                        Control del Supervisor
                      </h3>

                      <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Estado Actual: <span className="font-bold text-blue-600">{formData.controlado || 'No definido'}</span>
                     </label>
                     <select
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       value={formData.controlado || ""}
                       onChange={(e) => setFormData({ ...formData, controlado: e.target.value })}
                     >
                       <option value="">Seleccionar controlado</option>
                       <option value="autoriza">🟢 Autoriza</option>
                       <option value="no autoriza">🔴 No autoriza</option>
                       <option value="stand by">🟠 Stand By</option>
                     </select>
                   </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supervisor:
                      </label>
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={formData.superviso || ""}
                        onChange={(e) => setFormData({ ...formData, superviso: e.target.value })}
                      />
                    </div>
                    </div>

              {/* Campos de edición del estado */}
              <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Cambiar Estado del Pedido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado Actual: <span className="font-bold text-blue-600">{formData.estado || 'No definido'}</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.estado || ""}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="">Seleccionar nuevo estado</option>
                      <option value="iniciado">🟡 Iniciado</option>
                      <option value="visto/recibido">🟠 Visto/Recibido</option>
                      <option value="cotizado">🟡 Cotizado</option>
                      <option value="aprobado">🟢 Aprobado</option>
                      <option value="confirmado">🟢 Confirmado</option>
                      <option value="confirmado">🟢 Entrego parcial</option>
                      <option value="cumplido">⚪ Cumplido</option>
                      <option value="stand by">🟠 Stand By</option>
                      <option value="anulado">🔴 Anulado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agrar notas:
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={3}
                      placeholder="Agregar observaciones sobre el cambio de estado..."
                      value={formData.notas || ""}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proveedor Seleccionado:
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Nombre del proveedor seleccionado"
                      value={formData.proveedor_selec || ""}
                      onChange={(e) => setFormData({ ...formData, proveedor_selec: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de OC:
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de orden de compra"
                      value={formData.oc || ""}
                      onChange={(e) => setFormData({ ...formData, oc: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Comparativa de Proveedores */}
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <span className="mr-2">📊</span>
                      Comparativa de Proveedores
                    </h3>
                    <button
                      onClick={() => {
                        if (formData.articulos && formData.articulos.length > 0 && comparativaForm) {
                          // Recalcular totales de proveedores
                          const nuevaComparativa = comparativaForm.map(prov => ({
                            ...prov,
                            articulos: prov.articulos.map(art => {
                              // Obtener la cantidad del artículo original del pedido
                              const articuloOriginal = formData.articulos!.find(a => a.articulo === art.articulo);
                              const cantidad = articuloOriginal?.cant || 0;
                              const subtotal = calcularSubtotalConDescuento(art.precioUnitario, art.descuentoPorcentaje, cantidad);
                              
                              return {
                                ...art,
                                cant: cantidad, // Asegurar que tenga la cantidad correcta
                                subtotal: subtotal
                              };
                            }),
                            total: 0 // Se recalculará abajo
                          }));
                          
                          // Recalcular totales de proveedores
                          nuevaComparativa.forEach(prov => {
                            prov.total = prov.articulos.reduce((sum: number, art: ArticuloComparativa) => sum + (art.subtotal || 0), 0);
                          });
                          
                          setComparativaForm(nuevaComparativa);
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      🔄 Recalcular Totales
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {comparativaForm && comparativaForm.map((prov, provIndex) => (
                    <div key={provIndex} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <label className="block mb-3 text-sm font-medium text-gray-700">
                        Proveedor {provIndex + 1}:
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Nombre del proveedor"
                        value={prov.nombreProveedor}
                        onChange={(e) => {
                          if (comparativaForm) {
                            const newComparativa = [...comparativaForm];
                            newComparativa[provIndex].nombreProveedor = e.target.value;
                            setComparativaForm(newComparativa);
                          }
                        }}
                      />

                      <table className="w-full text-gray-700 text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-medium">Artículo</th>
                            <th className="px-2 py-2 text-right font-medium">Precio Unit.</th>
                            <th className="px-2 py-2 text-right font-medium">Desc. %</th>
                            <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prov.articulos.map((art, artIndex) => (
                            <tr key={artIndex} className="border-b border-gray-100">
                              <td className="px-2 py-2 text-sm">{art.articulo}</td>
                              <td className="px-2 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                  value={art.precioUnitario || ''}
                                  onChange={(e) => {
                                    if (!comparativaForm) return;
                                    
                                    const newComparativa = [...comparativaForm];
                                    const newPrecio = parseFloat(e.target.value) || 0;
                                    const descuentoPorcentajeActual = newComparativa[provIndex].articulos[artIndex].descuentoPorcentaje || 0;
                                    
                                    // Obtener la cantidad del artículo original del pedido
                                    const articuloOriginal = formData.articulos?.find(a => a.articulo === art.articulo);
                                    const cantidad = articuloOriginal?.cant || 0;
                                    
                                    newComparativa[provIndex].articulos[artIndex].precioUnitario = newPrecio;
                                    newComparativa[provIndex].articulos[artIndex].subtotal = calcularSubtotalConDescuento(
                                      newPrecio,
                                      descuentoPorcentajeActual,
                                      cantidad
                                    );
                                    
                                    // Recalcular total del proveedor
                                    newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                      (sum: number, articulo: ArticuloComparativa) => sum + (articulo.subtotal || 0), 0
                                    );

                                    setComparativaForm(newComparativa);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                  value={art.descuentoPorcentaje || 0}
                                  onChange={(e) => {
                                    if (!comparativaForm) return;

                                    const newComparativa = [...comparativaForm];
                                    const nuevoDescuento = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                    const precioUnitarioActual = newComparativa[provIndex].articulos[artIndex].precioUnitario;

                                    const articuloOriginal = formData.articulos?.find(a => a.articulo === art.articulo);
                                    const cantidad = articuloOriginal?.cant || 0;

                                    newComparativa[provIndex].articulos[artIndex].descuentoPorcentaje = nuevoDescuento;
                                    newComparativa[provIndex].articulos[artIndex].subtotal = calcularSubtotalConDescuento(
                                      precioUnitarioActual,
                                      nuevoDescuento,
                                      cantidad
                                    );

                                    newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                      (sum: number, articulo: ArticuloComparativa) => sum + (articulo.subtotal || 0), 0
                                    );

                                    setComparativaForm(newComparativa);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-medium">
                                ${(art.subtotal || 0).toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-gray-100 p-2 rounded border text-sm">
                        Total: ${(prov.total || 0).toFixed(0)}
                      </div>
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Presupuesto (PDF o JPG)
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,application/pdf"
                          disabled={!!presupuestoUploading[provIndex]}
                          className="w-full text-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleSubirPresupuestoProveedor(provIndex, file);
                            e.target.value = "";
                          }}
                        />
                        {presupuestoUploading[provIndex] && (
                          <p className="text-xs text-blue-600 mt-1">Subiendo presupuesto...</p>
                        )}
                        {presupuestoUploadErrors[provIndex] && (
                          <p className="text-xs text-red-600 mt-1">
                            {presupuestoUploadErrors[provIndex]}
                          </p>
                        )}
                        {prov.presupuesto_path && (
                          <p className="text-xs mt-2 flex items-center gap-2 flex-wrap">
                            {presupuestoViewUrls[provIndex] ? (
                              <a
                                href={presupuestoViewUrls[provIndex]!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline font-medium"
                              >
                                Ver presupuesto
                              </a>
                            ) : (
                              <span className="text-gray-500">Presupuesto adjunto</span>
                            )}
                            <button
                              type="button"
                              title="Quitar presupuesto"
                              disabled={!!presupuestoUploading[provIndex]}
                              onClick={() => void handleQuitarPresupuestoProveedor(provIndex)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 disabled:opacity-50"
                              aria-label="Quitar presupuesto"
                            >
                              ×
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <label className="block text-sm font-medium text-amber-950 mb-2">
                      Notas del comprador
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-white text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 text-sm"
                      rows={3}
                      placeholder="Observaciones de compras sobre la comparativa de precios..."
                      value={formData.notas_comprador ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notas_comprador: e.target.value })
                      }
                    />
                  </div>

                  <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-slate-800 mb-2">
                      Comprador asignado
                    </label>
                    <select
                      className="w-full max-w-md px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.comprador ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          comprador: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Sin asignar</option>
                      {COMPRADOR_OPCIONES.map((nombre) => (
                        <option key={nombre} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Campos adicionales para pedidos generales */}
              <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💰</span>
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total USD:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.usd || ""}
                      onChange={(e) => setFormData({ ...formData, usd: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total EUR:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.eur || ""}
                      onChange={(e) => setFormData({ ...formData, eur: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total ARS:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.ars || ""}
                      onChange={(e) => setFormData({ ...formData, ars: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Confirmación:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_conf || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_conf: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Prometida:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_prom || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_prom: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Entrega:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_ent || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Factura:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de factura"
                      value={formData.fac || ""}
                      onChange={(e) => setFormData({ ...formData, fac: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de RTO:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de RTO"
                      value={formData.rto || ""}
                      onChange={(e) => setFormData({ ...formData, rto: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingPedido(null);
                    setComparativaForm(null);
                    setPresupuestoViewUrls({});
                    setPresupuestoUploadErrors({});
                  }}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  ❌ Cancelar
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
      {/* MODAL VER INFO */}
      {verInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1900px] max-h-[95vh] overflow-y-auto overflow-x-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">📋 Pedido interno de compra #{verInfo.id}</h2>
                  <p className="text-green-100 mt-2">Información detallada del pedido</p>
                </div>
                <OcBackLink
                  ordenCompraId={ocVolver?.id ?? null}
                  ordenCompraNoc={ocVolver?.noc}
                  variant="light"
                />
              </div>
            </div>
            {ocVolver && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center gap-2">
                <span className="text-sm text-amber-900">Volvé a la orden de compra:</span>
                <OcBackLink
                  ordenCompraId={ocVolver.id}
                  ordenCompraNoc={ocVolver.noc}
                  variant="dark"
                />
              </div>
            )}
            <div className="p-6">
           <div className="flex-col gap-2">
                <span className="text-black font-semibold">Fecha necesidad: {formatDate(verInfo.necesidad)}</span>
                 <br/>
                <span className="text-black font-semibold">Fecha confirmada: {formatDate(verInfo.fecha_conf)}</span>
                 <br/>
                <span className="text-black font-semibold">Fecha promesa: {formatDate(verInfo.fecha_prom)}</span>
                 <br/>
                <span className="text-black font-semibold">Sector: {verInfo.sector}</span>
                  <br/>
                <span className="text-black font-semibold">Solicita: {verInfo.solicita}</span>
                <br/>
                {verInfo.nota_solicitante?.trim() ? (
                  <>
                    <span className="text-sm text-blue-700 font-bold whitespace-pre-wrap">
                      Notas solicitante: {verInfo.nota_solicitante}
                    </span>
                    <br/>
                  </>
                ) : null}
                <span className="text-black font-semibold">
                  Comprador: {verInfo.comprador ? renderValue(verInfo.comprador) : "-"}
                </span>
                <br />
                {verInfo.notas_comprador?.trim() ? (
                  <>
                    <span className="text-sm text-blue-700 font-bold whitespace-pre-wrap">
                      Notas del comprador: {verInfo.notas_comprador}
                    </span>
                    <br />
                  </>
                ) : null}
                <span className="text-black font-semibold">Aprueba: {verInfo.aprueba}</span>
              </div>
              {/* Mostrar lista de artículos */}
              {Array.isArray(verInfo.articulos) && verInfo.articulos.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos del Pedido</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cantidad</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Stock</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observación</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link Web</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verInfo.articulos.map((a, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-2 py-1 font-medium">{a.articulo}</td>
                            <td className="px-2 py-1 text-gray-700 max-w-xs">
                              <div className="break-words">
                                {a.descripcion || "-"}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-center">{Number(a.cant) || 0}</td>
                            <td className="px-2 py-1 text-center">{Number(a.cant_exist) || 0}</td>
                            <td className="px-2 py-1 text-gray-600">{a.observacion || "-"}</td>
                            <td className="px-2 py-1">
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
                 <br/>
                 
                 {/* Comparativa de Proveedores */}
                 {verInfo.comparativa_prov && Array.isArray(verInfo.comparativa_prov) && verInfo.comparativa_prov.length > 0 && (
                   <div id="comparativa-proveedores" className="mb-6">
                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                       <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                         <span className="mr-2">💰</span>
                         Cotizaciones de Proveedores
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {verInfo.comparativa_prov.map((prov, provIndex) => (
                           <div key={provIndex} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm min-w-0">
                             <h5 className="font-semibold text-gray-800 mb-3 text-center">
                               {prov.nombreProveedor || `Proveedor ${provIndex + 1}`}
                             </h5>
                             
                             {prov.articulos && prov.articulos.length > 0 && (
                               <table className="w-full text-sm">
                                 <thead>
                                   <tr className="border-b border-gray-200">
                                     <th className="px-2 py-1 text-left text-gray-600 font-medium">Artículo</th>
                                     <th className="px-2 py-1 text-right text-gray-600 font-medium">Precio Unit.</th>
                                     <th className="px-2 py-1 text-right text-gray-600 font-medium">Desc. %</th>
                                     <th className="px-2 py-1 text-right text-gray-600 font-medium">Subtotal</th>
                                   </tr>
                                 </thead>
                                 <tbody>
                                   {prov.articulos.map((art, artIndex) => (
                                     <tr key={artIndex} className="border-b border-gray-100 last:border-b-0">
                                       <td className="px-2 py-1 text-sm font-medium">{art.articulo}</td>
                                       <td className="px-2 py-1 text-right text-gray-700">
                                         ${(art.precioUnitario || 0).toLocaleString("es-AR")}
                                       </td>
                                       <td className="px-2 py-1 text-right text-gray-700">
                                         {(art.descuentoPorcentaje || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                                       </td>
                                       <td className="px-2 py-1 text-right font-medium text-gray-800">
                                         ${(art.subtotal || 0).toLocaleString("es-AR")}
                                       </td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             )}
                             
                             <div className="mt-3 text-center font-bold text-gray-800 bg-gray-50 p-2 rounded border text-sm">
                               Total: ${(prov.total || 0).toLocaleString("es-AR")}
                             </div>
                             {prov.presupuesto_path && comparativaPresupuestoUrls[provIndex] && (
                               <p className="mt-2 text-center text-sm">
                                 <a
                                   href={comparativaPresupuestoUrls[provIndex]!}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-600 underline font-medium"
                                 >
                                   Ver presupuesto
                                 </a>
                               </p>
                             )}
                           </div>
                         ))}
                       </div>

                       <div className="mt-4 pt-4 border-t border-gray-300">
                         <p className="text-sm font-semibold text-gray-800 mb-2">Notas del comprador</p>
                         <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                           {renderValue(verInfo.notas_comprador)}
                         </div>
                       </div>

                       <div className="mt-4 pt-4 border-t border-gray-300">
                         <p className="text-sm font-semibold text-gray-800 mb-2">Notas del aprobador</p>
                         <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                           {renderValue(verInfo.notas_aprobador || verInfo.nota_aprobador)}
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* Mostrar proveedores antiguos si no hay comparativa nueva */}
                 {(!verInfo.comparativa_prov || !Array.isArray(verInfo.comparativa_prov) || verInfo.comparativa_prov.length === 0) && (
                   <div className="mb-4 flex gap-4">
                     <div className="flex-col gap-2">
                       <span className="text-black">Proveedor 1: </span>
                       <br/>
                       <span className="text-black"> {verInfo.prov_uno}</span>
                       <br/>
                       <span className="text-black">c/u ${Number(verInfo.cost_prov_uno).toLocaleString("es-AR")}</span>
                       <br/>
                       <span className="text-black">subt. ${Number(verInfo.subt_prov1).toLocaleString("es-AR")}</span>
                     </div>
                     
                     <div>
                       <span className="text-black">Proveedor 2:</span>
                       <br/>
                       <span className="text-black">{verInfo.prov_dos}</span>
                       <br/>
                       <span className="text-black">c/u ${Number(verInfo.cost_prov_dos).toLocaleString("es-AR")}</span>
                       <br/>
                       <span className="text-black">subt. ${Number(verInfo.subt_prov2).toLocaleString("es-AR")}</span>
                     </div>

                     <div>
                       <span className="text-black">Proveedor 3:</span>
                       <br/>
                       <span className="text-black">{verInfo.prov_tres}</span>
                       <br/>
                       <span className="text-black">c/u ${Number(verInfo.cost_prov_tres).toLocaleString("es-AR")}</span>
                       <br/>
                       <span className="text-black">subt. ${Number(verInfo.subt_prov3).toLocaleString("es-AR")}</span>
                     </div>
                   </div>
                 )}

                 {searchParams.get("comparativa") && (
                   <>
                     <hr className="my-6" />
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">✏️ Actualizar pedido</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                         <select
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.estado || ""}
                           onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                         >
                           <option value="iniciado">Iniciado</option>
                           <option value="visto/recibido">Visto/Recibido</option>
                           <option value="cotizado">Cotizado</option>
                           <option value="aprobado">Aprobado</option>
                           <option value="confirmado">Confirmado</option>
                           <option value="cumplido">Cumplido</option>
                           <option value="stand by">Stand By</option>
                           <option value="anulado">Anulado</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor seleccionado</label>
                         <input
                           type="text"
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.proveedor_selec || ""}
                           onChange={(e) =>
                             setFormData({ ...formData, proveedor_selec: e.target.value })
                           }
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Número de OC (pedido)</label>
                         <input
                           type="number"
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.oc ?? ""}
                           onChange={(e) =>
                             setFormData({ ...formData, oc: parseFloat(e.target.value) || 0 })
                           }
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Factura (pedido)</label>
                         <input
                           type="number"
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.fac ?? ""}
                           onChange={(e) =>
                             setFormData({ ...formData, fac: parseFloat(e.target.value) || 0 })
                           }
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Remito (pedido)</label>
                         <input
                           type="number"
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.rto ?? ""}
                           onChange={(e) =>
                             setFormData({ ...formData, rto: parseFloat(e.target.value) || 0 })
                           }
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de entrega (pedido)</label>
                         <input
                           type="date"
                           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                           value={formData.fecha_ent || ""}
                           onChange={(e) =>
                             setFormData({ ...formData, fecha_ent: e.target.value })
                           }
                         />
                       </div>
                     </div>

                     {comparativaOc && (
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                         <h3 className="text-lg font-semibold text-blue-900 mb-3">
                           📄 Factura y remito — Orden de compra
                           {comparativaOc.noc ? ` #${comparativaOc.noc}` : ""}
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Factura (FC)</label>
                             <input
                               type="number"
                               min={0}
                               className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                               placeholder="Nº de factura"
                               value={ocFacturaForm.fc}
                               onChange={(e) =>
                                 setOcFacturaForm((prev) => ({ ...prev, fc: e.target.value }))
                               }
                             />
                             {ocFacturaImageUrl && ocFacturaForm.fc.trim() && (
                               <p className="mt-2 text-sm">
                                 <a
                                   href={ocFacturaImageUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-600 underline font-medium"
                                 >
                                   Ver imagen de factura {ocFacturaForm.fc}
                                 </a>
                               </p>
                             )}
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Remito (RT)</label>
                             <input
                               type="number"
                               min={0}
                               className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                               placeholder="Nº de remito"
                               value={ocFacturaForm.rt}
                               onChange={(e) =>
                                 setOcFacturaForm((prev) => ({ ...prev, rt: e.target.value }))
                               }
                             />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de entrega (OC)</label>
                             <input
                               type="date"
                               className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white"
                               value={ocFacturaForm.fecha_entrega}
                               onChange={(e) =>
                                 setOcFacturaForm((prev) => ({
                                   ...prev,
                                   fecha_entrega: e.target.value,
                                 }))
                               }
                             />
                           </div>
                           <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-2">
                               Imagen de factura
                             </label>
                             <input
                               type="file"
                               accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf"
                               disabled={ocFacturaUploading || guardandoComparativa}
                               className="w-full text-sm"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) void handleSubirImagenFacturaOc(file);
                                 e.target.value = "";
                               }}
                             />
                             {ocFacturaUploading && (
                               <p className="text-sm text-blue-600 mt-1">Subiendo imagen...</p>
                             )}
                             {ocFacturaUploadError && (
                               <p className="text-sm text-red-600 mt-1">{ocFacturaUploadError}</p>
                             )}
                             {ocFacturaForm.fact_path && ocFacturaImageUrl && !ocFacturaForm.fc.trim() && (
                               <p className="text-sm mt-2">
                                 <a
                                   href={ocFacturaImageUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-600 underline"
                                 >
                                   Ver imagen cargada
                                 </a>
                               </p>
                             )}
                           </div>
                         </div>
                       </div>
                     )}
                   </>
                 )}

                        <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={imprimirInfoPedido}
                          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                        >
                          🖨️ Imprimir
                        </button>
                        <button
                          onClick={() => {
                            setVerInfo(null);
                            setComparativaOc(null);
                            setComparativaPresupuestoUrls({});
                          }}
                          className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                        >
                          🔒 Cerrar
                        </button>
                        {searchParams.get("comparativa") && (
                          <button
                            onClick={handleGuardarComparativa}
                            disabled={guardandoComparativa || ocFacturaUploading}
                            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                          >
                            {guardandoComparativa ? "Guardando..." : "💾 Guardar"}
                          </button>
                        )}
                        </div>
            </div>
          </div>
        </div>
        
      )}
    </div>
  );
}
