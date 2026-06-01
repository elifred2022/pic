"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  extractPicDisplayNumber,
  getComparativaPedidoUrl,
  parsePicFromArticuloId,
} from "@/lib/pic-links";
import {
  getFactComprasBucket,
  getFacturaStoragePath,
  getFacturaViewUrl,
  getSupabaseErrorMessage,
} from "@/lib/fact-compras-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Estilos para impresión A4
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 1cm;
    }
    
    body {
      font-size: 12px !important;
      line-height: 1.3 !important;
    }
    
    .print-container {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .print-header {
      margin-bottom: 15px !important;
      border-bottom: 2px solid #000 !important;
      padding-bottom: 10px !important;
    }
    
    .print-section {
      margin-bottom: 10px !important;
      page-break-inside: avoid;
    }
    
    .print-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }
    
    .print-items {
      font-size: 11px !important;
    }
    
    .print-total {
      border-top: 2px solid #000 !important;
      padding-top: 10px !important;
      margin-top: 10px !important;
      font-weight: bold !important;
    }
    
    .print-table {
      border-collapse: collapse !important;
      width: 100% !important;
      font-size: 10px !important;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid #000 !important;
      padding: 4px !important;
      text-align: left !important;
    }
    
    .print-table th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
    
    .print-table tfoot td {
      background-color: #e0e0e0 !important;
      font-weight: bold !important;
    }
    
    .print-hidden {
      display: none !important;
    }
  }
`;

type ArticuloOrdenItem = {
  articulo_id: string;
  articulo_nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  divisa?: "USD" | "EUR" | "ARS";
  costunitcdesc?: number;
  total: number;
  codint?: string | null;
  descripcion?: string | null;
  codprovsug?: string | null;
};

interface OrdenCompra {
  id: number;
  noc: number;
  fecha: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: string;
  total: number;
  divisa?: string;
  importe_competencia?: number | null;
  ahorro?: number | null;
  observaciones?: string;
  condicion_pago?: string;
  tipo_pago?: string;
  articulos: ArticuloOrdenItem[];
  lugar_entrega: string;
  cod_cta?: string;
  sector?: string;
  fc?: number | null;
  rt?: number | null;
  fecha_entrega?: string | null;
  fact_path?: string | null;
}

interface Proveedor {
  id: number;
  cuitprov: number;
  nombreprov: string;
  direccionprov: string;
  telefonoprov: number;
  emailprov: string;
}

export default function VerOrdenCompraPage() {
  const [orden, setOrden] = useState<OrdenCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    noc: '',
    proveedor: '',
    cuit: '',
    direccion: '',
    telefono: '',
    email: '',
    estado: '',
    observaciones: '',
    condicion_pago: '',
    tipo_pago: '',
    lugar_entrega: '',
    cod_cta: '',
    sector: '',
    fc: '',
    rt: '',
    fecha_entrega: '',
    fact_path: '',
    divisa: 'USD',
    articulos: [] as ArticuloOrdenItem[]
  });
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [saving, setSaving] = useState(false);
  const [facturaUploading, setFacturaUploading] = useState(false);
  const [facturaUploadError, setFacturaUploadError] = useState<string | null>(null);
  const [facturaImageUrl, setFacturaImageUrl] = useState<string | null>(null);
  const [showArticuloModal, setShowArticuloModal] = useState(false);
  const [nuevoArticulo, setNuevoArticulo] = useState({
    articulo_nombre: '',
    cantidad: 1,
    precio_unitario: 0,
    descuento: 0
  });
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const enriquecerArticulosOrden = useCallback(
    async (articulos: ArticuloOrdenItem[]): Promise<ArticuloOrdenItem[]> => {
      if (articulos.length === 0) return articulos;

      const codints = [
        ...new Set(articulos.map((a) => a.codint).filter(Boolean)),
      ] as string[];
      const nombres = [
        ...new Set(
          articulos.map((a) => a.articulo_nombre?.trim()).filter(Boolean)
        ),
      ] as string[];

      const codProvPorCodint = new Map<string, string>();
      const codProvPorNombre = new Map<string, string>();
      const descPorCodint = new Map<string, string>();
      const descPorNombre = new Map<string, string>();

      if (codints.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("codint, articulo, codprovsug, descripcion")
          .in("codint", codints);
        (data ?? []).forEach((row) => {
          codProvPorCodint.set(row.codint, row.codprovsug ?? "");
          if (row.descripcion) descPorCodint.set(row.codint, row.descripcion);
        });
      }

      if (nombres.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("codint, articulo, codprovsug, descripcion")
          .in("articulo", nombres);
        (data ?? []).forEach((row) => {
          codProvPorNombre.set(row.articulo, row.codprovsug ?? "");
          if (row.descripcion) descPorNombre.set(row.articulo, row.descripcion);
        });
      }

      return articulos.map((art) => {
        const codint = art.codint ?? undefined;
        const descripcion =
          art.descripcion?.trim() ||
          (codint ? descPorCodint.get(codint) : undefined) ||
          descPorNombre.get(art.articulo_nombre) ||
          null;
        const codprovsug =
          art.codprovsug?.trim() ||
          (codint ? codProvPorCodint.get(codint) : undefined) ||
          codProvPorNombre.get(art.articulo_nombre) ||
          null;

        return { ...art, descripcion, codprovsug };
      });
    },
    [supabase]
  );

  const fetchOrden = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const articulosEnriquecidos = await enriquecerArticulosOrden(
        (data.articulos as ArticuloOrdenItem[]) || []
      );
      setOrden({ ...data, articulos: articulosEnriquecidos });
    } catch (err) {
      console.error("Error fetching orden:", err);
      setError("Error al cargar la orden de compra");
    } finally {
      setLoading(false);
    }
  }, [supabase, enriquecerArticulosOrden]);

  const fetchProveedores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("proveedor")
        .select("*");

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    }
  }, [supabase]);

  const filtrarProveedores = useCallback(() => {
    if (!busquedaProveedor.trim()) {
      setProveedoresFiltrados(proveedores);
      return;
    }

    const terminoBusqueda = busquedaProveedor.toLowerCase().trim();
    
    const proveedoresFiltrados = proveedores.filter(proveedor => 
      proveedor.cuitprov.toString().includes(terminoBusqueda) ||
      proveedor.nombreprov.toLowerCase().includes(terminoBusqueda)
    );
    
    setProveedoresFiltrados(proveedoresFiltrados);
  }, [busquedaProveedor, proveedores]);

  useEffect(() => {
    if (params.id) {
      fetchOrden(Number(params.id));
    }
    fetchProveedores();
  }, [params.id, fetchOrden, fetchProveedores]);

  // Efecto para filtrar proveedores cuando cambia la búsqueda
  useEffect(() => {
    filtrarProveedores();
  }, [filtrarProveedores]);

  useEffect(() => {
    if (!orden?.fact_path) {
      setFacturaImageUrl(null);
      return;
    }
    let cancelled = false;
    void getFacturaViewUrl(supabase, orden.fact_path).then((url) => {
      if (!cancelled) setFacturaImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [orden?.fact_path, orden?.id, supabase]);

  // Sincronizar divisa de la orden con todos los artículos cuando cambia
  useEffect(() => {
    if (showEditModal && editData.articulos.length > 0) {
      const divisaOrden = editData.divisa || "USD";
      const tieneOtroDivisa = editData.articulos.some(a => (a.divisa ?? "USD") !== divisaOrden);
      if (tieneOtroDivisa) {
        setEditData(prev => ({
          ...prev,
          articulos: prev.articulos.map(a => ({
            ...a,
            divisa: (prev.divisa === "EUR" || prev.divisa === "ARS" ? prev.divisa : "USD") as "USD" | "EUR" | "ARS"
          }))
        }));
      }
    }
  }, [editData.divisa, showEditModal]);

  const getEstadoBadge = (estado: string) => {
    const estados = {
      pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
      aprobada: { color: "bg-green-100 text-green-800", text: "Aprobada" },
      rechazada: { color: "bg-red-100 text-red-800", text: "Rechazada" },
      cumplida: { color: "bg-blue-100 text-blue-800", text: "Cumplida" },
      entrego_parcial: { color: "bg-orange-100 text-orange-800", text: "Entregó Parcial" },
      anulado: { color: "bg-red-100 text-red-800", text: "Anulado" }
    };
    
    const estadoInfo = estados[estado as keyof typeof estados] || estados.pendiente;
    return <Badge className={estadoInfo.color}>{estadoInfo.text}</Badge>;
  };

  const formatDateLocal = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return '';
    return new Date(year, month, day).toLocaleDateString('es-AR');
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  const calcularPrecioConDescuento = (precio: number, descuento?: number) => {
    const descuentoNormalizado = Math.min(Math.max(descuento ?? 0, 0), 100);
    return precio - (precio * descuentoNormalizado) / 100;
  };

  const getRowTotal = (item: ArticuloOrdenItem) => {
    const precioConDescuento = calcularPrecioConDescuento(
      item.precio_unitario,
      item.descuento
    );
    return typeof item.total === "number" && !Number.isNaN(item.total)
      ? item.total
      : item.cantidad * precioConDescuento;
  };

  const handleOpenEditModal = () => {
    if (orden) {
      setEditData({
        noc: orden.noc.toString(),
        proveedor: orden.proveedor,
        cuit: orden.cuit,
        direccion: orden.direccion,
        telefono: orden.telefono,
        email: orden.email || '',
        estado: orden.estado,
        observaciones: orden.observaciones || '',
        condicion_pago: orden.condicion_pago || '',
        tipo_pago: orden.tipo_pago || '',
        lugar_entrega: orden.lugar_entrega,
        cod_cta: orden.cod_cta || '',
        sector: orden.sector || '',
        fc: orden.fc != null ? orden.fc.toString() : '',
        rt: orden.rt != null ? orden.rt.toString() : '',
        fecha_entrega: formatDateForInput(orden.fecha_entrega),
        fact_path: orden.fact_path || '',
        divisa: orden.divisa || 'USD',
        articulos: (orden.articulos || []).map((item) => ({
          ...item,
          divisa: item.divisa ?? "USD",
          costunitcdesc:
            item.costunitcdesc ??
            calcularPrecioConDescuento(item.precio_unitario, item.descuento),
        }))
      });
      setBusquedaProveedor('');
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditData({ 
      noc: '', 
      proveedor: '', 
      cuit: '', 
      direccion: '', 
      telefono: '', 
      email: '',
      estado: '',
      observaciones: '',
      condicion_pago: '',
      tipo_pago: '',
      lugar_entrega: '',
      cod_cta: '',
      sector: '',
      fc: '',
      rt: '',
      fecha_entrega: '',
      fact_path: '',
      divisa: 'USD',
      articulos: []
    });
    setBusquedaProveedor('');
    setFacturaUploadError(null);
  };

  const handleSubirImagenFactura = async (file: File) => {
    if (!orden) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!/^(jpg|jpeg|png|gif|webp|bmp|pdf)$/i.test(fileExt)) {
      setFacturaUploadError("Formato no permitido. Use JPG, PNG, WEBP, GIF, BMP o PDF.");
      return;
    }

    setFacturaUploading(true);
    setFacturaUploadError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setFacturaUploadError("Debe iniciar sesión para subir la factura.");
        return;
      }

      const storagePath = getFacturaStoragePath(orden.id, fileExt);
      const contentType = file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(getFactComprasBucket())
        .upload(storagePath, file, {
          upsert: true,
          contentType: fileExt === "pdf" ? "application/pdf" : contentType,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        setFacturaUploadError(
          `No se pudo subir al storage: ${getSupabaseErrorMessage(uploadError)}`
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update({ fact_path: storagePath })
        .eq("id", orden.id);

      if (updateError) {
        console.error("DB update fact_path error:", updateError);
        setFacturaUploadError(
          `La imagen se subió, pero no se guardó en la orden: ${getSupabaseErrorMessage(updateError)}. Ejecute database/add_factura_imagen_ordenes_compra.sql en Supabase.`
        );
        return;
      }

      setEditData((prev) => ({ ...prev, fact_path: storagePath }));
      setOrden((prev) => (prev ? { ...prev, fact_path: storagePath } : prev));
      const viewUrl = await getFacturaViewUrl(supabase, storagePath);
      setFacturaImageUrl(viewUrl);
    } catch (err) {
      console.error("Error subiendo imagen de factura:", err);
      setFacturaUploadError(getSupabaseErrorMessage(err));
    } finally {
      setFacturaUploading(false);
    }
  };

  const handleSeleccionarProveedor = (proveedor: Proveedor) => {
    setEditData({
      ...editData,
      proveedor: proveedor.nombreprov,
      cuit: proveedor.cuitprov.toString(),
      direccion: proveedor.direccionprov,
      telefono: proveedor.telefonoprov.toString(),
      email: proveedor.emailprov
    });
    setBusquedaProveedor(proveedor.nombreprov);
  };

  const actualizarArticulosSupabase = async (
    articulos: typeof editData.articulos,
    proveedor: string
  ) => {
    let updateUsuario: string | null = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        const { data: perfil, error: perfilError } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("uuid", userData.user.id)
          .single();
        if (!perfilError && perfil?.nombre) {
          updateUsuario = perfil.nombre;
        } else {
          updateUsuario = userData.user.email || null;
        }
      }
    } catch (err) {
      console.error("Error obteniendo usuario para update_usuario:", err);
    }

    const resultados = await Promise.all(
      articulos.map(async (item) => {
        const nombreArticulo = item.articulo_nombre?.trim();
        if (!nombreArticulo) {
          return { error: null };
        }
        const payload = {
          costunit: item.precio_unitario,
          descuento: item.descuento ?? 0,
          costunitcdesc: calcularPrecioConDescuento(
            item.precio_unitario,
            item.descuento ?? 0
          ),
          divisa: item.divisa ?? "ARS",
          ultimo_prov: proveedor || null,
          update_usuario: updateUsuario,
          updated_at: new Date().toISOString(),
        };
        const { data: exactMatch, error: exactError } = await supabase
          .from("articulos")
          .select("id")
          .or(`codint.eq.${nombreArticulo},articulo.eq.${nombreArticulo}`)
          .limit(1)
          .maybeSingle();

        if (exactError) {
          return { error: exactError };
        }

        if (exactMatch?.id) {
          const { error: updateError } = await supabase
            .from("articulos")
            .update(payload)
            .eq("id", exactMatch.id);
          if (updateError) {
            return { error: updateError };
          }
          return { error: null };
        }

        const { data: ilikeMatch, error: ilikeError } = await supabase
          .from("articulos")
          .select("id")
          .ilike("articulo", nombreArticulo)
          .limit(1)
          .maybeSingle();

        if (ilikeError) {
          return { error: ilikeError };
        }

        if (ilikeMatch?.id) {
          const { error: updateError } = await supabase
            .from("articulos")
            .update(payload)
            .eq("id", ilikeMatch.id);
          if (updateError) {
            return { error: updateError };
          }
        }

        return { error: null };
      })
    );

    const errorActualizacion = resultados.find((res) => res.error)?.error;
    if (errorActualizacion) {
      throw errorActualizacion;
    }
  };

  const handleSaveEdit = async () => {
    if (!orden) return;

    try {
      setSaving(true);
      const divisaOrden: "USD" | "EUR" | "ARS" = (editData.divisa === "EUR" || editData.divisa === "ARS") ? editData.divisa : "USD";
      const articulosActualizados = editData.articulos.map((item) => ({
        ...item,
        divisa: divisaOrden,
        costunitcdesc: calcularPrecioConDescuento(item.precio_unitario, item.descuento),
        total: getRowTotal(item),
      }));
      const totalOrden = articulosActualizados.reduce((sum, item) => sum + item.total, 0);

      const payload = {
        divisa: divisaOrden,
        noc: parseInt(editData.noc),
        proveedor: editData.proveedor,
        cuit: editData.cuit,
        direccion: editData.direccion,
        telefono: editData.telefono,
        estado: editData.estado,
        observaciones: editData.observaciones,
        condicion_pago: editData.condicion_pago,
        tipo_pago: editData.tipo_pago || null,
        lugar_entrega: editData.lugar_entrega,
        cod_cta: editData.cod_cta || null,
        sector: editData.sector || null,
        fc: editData.fc ? parseInt(editData.fc, 10) : null,
        rt: editData.rt ? parseInt(editData.rt, 10) : null,
        fecha_entrega: editData.fecha_entrega || null,
        fact_path: editData.fact_path || null,
        articulos: articulosActualizados,
        total: totalOrden,
      };

      const { data: datosActualizados, error } = await supabase
        .from("ordenes_compra")
        .update(payload)
        .eq("id", orden.id)
        .select("id, divisa, total")
        .single();

      if (error) {
        console.error("Error actualizando ordenes_compra:", error);
        throw error;
      }

      // Update explícito de divisa (asegura que se persista si el payload principal lo ignora)
      await supabase
        .from("ordenes_compra")
        .update({ divisa: divisaOrden })
        .eq("id", orden.id);

      try {
        await actualizarArticulosSupabase(articulosActualizados, editData.proveedor);
      } catch (updateError) {
        console.error("Error actualizando artículos:", updateError);
        setError("Orden actualizada, pero no se pudieron actualizar los artículos");
        return;
      }

      // Actualizar el estado local (usar divisa de la respuesta si vino)
      setOrden({
        ...orden,
        noc: parseInt(editData.noc),
        proveedor: editData.proveedor,
        cuit: editData.cuit,
        direccion: editData.direccion,
        telefono: editData.telefono,
        estado: editData.estado,
        observaciones: editData.observaciones,
        condicion_pago: editData.condicion_pago,
        tipo_pago: editData.tipo_pago || undefined,
        lugar_entrega: editData.lugar_entrega,
        cod_cta: editData.cod_cta || undefined,
        sector: editData.sector || undefined,
        fc: editData.fc ? parseInt(editData.fc, 10) : null,
        rt: editData.rt ? parseInt(editData.rt, 10) : null,
        fecha_entrega: editData.fecha_entrega || null,
        fact_path: editData.fact_path || null,
        articulos: articulosActualizados,
        total: totalOrden,
        divisa: datosActualizados?.divisa ?? divisaOrden
      });

      setShowEditModal(false);
    } catch (err) {
      console.error("Error actualizando orden:", err);
      setError("Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  // Funciones para manejar artículos
  const handleAgregarArticulo = () => {
    if (!nuevoArticulo.articulo_nombre.trim()) return;
    
    const precioConDescuento = calcularPrecioConDescuento(
      nuevoArticulo.precio_unitario,
      nuevoArticulo.descuento
    );
    const divisaArt: "USD" | "EUR" | "ARS" = (editData.divisa === "EUR" || editData.divisa === "ARS") ? editData.divisa : "USD";
    const articulo = {
      articulo_id: `temp-${Date.now()}`,
      articulo_nombre: nuevoArticulo.articulo_nombre,
      cantidad: nuevoArticulo.cantidad,
      precio_unitario: nuevoArticulo.precio_unitario,
      descuento: nuevoArticulo.descuento,
      divisa: divisaArt,
      costunitcdesc: precioConDescuento,
      total: nuevoArticulo.cantidad * precioConDescuento
    };
    
    setEditData({
      ...editData,
      articulos: [...editData.articulos, articulo]
    });
    
    setNuevoArticulo({
      articulo_nombre: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0
    });
    setShowArticuloModal(false);
  };

  const handleEliminarArticulo = (index: number) => {
    setEditData({
      ...editData,
      articulos: editData.articulos.filter((_, i) => i !== index)
    });
  };

  const handleEditarArticulo = (index: number, campo: string, valor: string | number) => {
    const articulosActualizados = [...editData.articulos];
    const valorNumero = typeof valor === "string" ? parseFloat(valor) || 0 : valor;
    articulosActualizados[index] = {
      ...articulosActualizados[index],
      [campo]: valor,
      total: campo === 'cantidad' || campo === 'precio_unitario' || campo === 'descuento'
        ? (() => {
            const cantidad = campo === 'cantidad' ? (valorNumero as number) : articulosActualizados[index].cantidad;
            const precio = campo === 'precio_unitario' ? (valorNumero as number) : articulosActualizados[index].precio_unitario;
            const descuento = campo === 'descuento' ? (valorNumero as number) : (articulosActualizados[index].descuento ?? 0);
            const precioConDescuento = calcularPrecioConDescuento(precio, descuento);
            return cantidad * precioConDescuento;
          })()
        : articulosActualizados[index].total
    };
    if (campo === "cantidad" || campo === "precio_unitario" || campo === "descuento") {
      const precio = articulosActualizados[index].precio_unitario;
      const descuento = articulosActualizados[index].descuento ?? 0;
      articulosActualizados[index].costunitcdesc = calcularPrecioConDescuento(precio, descuento);
    }
    
    setEditData({
      ...editData,
      articulos: articulosActualizados
    });
  };

  const handleImprimir = () => {
    try {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error) {
      console.error("Error al imprimir:", error);
      // Fallback: abrir en nueva ventana
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Orden de Compra #${orden?.noc}</title></head>
            <body>
              <h1>Orden de Compra #${orden?.noc}</h1>
              <p>Use Ctrl+P para imprimir esta página</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando orden de compra...</div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600 text-lg">{error || "Orden no encontrada"}</div>
      </div>
    );
  }

  const totalOrdenCalculado = orden.articulos?.reduce(
    (sum, item) => sum + getRowTotal(item),
    0
  ) || 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="w-full max-w-6xl mx-auto p-6 print-container">
        {/* Encabezado de la empresa */}
        <div className="text-center mb-6 print-header">
          <h1 className="text-2xl font-bold text-gray-800 print:text-xl">
            Perfiles y Servicios SRL
          </h1>
        </div>
        
        <div className="flex justify-between items-center mb-6 print-header">
          <h2 className="text-3xl font-bold text-gray-900 print:text-2xl">
            📋 Orden de Compra #{orden.noc}
          </h2>
          <div className="flex flex-wrap gap-2 print-hidden">
            <Button
              onClick={handleOpenEditModal}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              ✏️ Editar
            </Button>
            <Button
              onClick={() => router.push("/auth/rutaproductivos/lista-pedidosproductivosadmin")}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              🏭 Pedidos Productivos
            </Button>
            <Button
              onClick={() => router.push("/auth/list-adminpedidosgenerales")}
              variant="outline"
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              📋 Pedidos Generales
            </Button>
            <Button
              onClick={() => router.push("/auth/ordenes-compra")}
              variant="outline"
            >
              🔙 Volver a la Lista
            </Button>
          </div>
        </div>

      <div className="grid gap-4 print:gap-2">

          {/* Información del Proveedor */}
          <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print-grid">
              
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Nombre</p>
                <p className="font-medium print:text-sm">{orden.proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">CUIT</p>
                <p className="font-medium print:text-sm">{orden.cuit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Dirección</p>
                <p className="font-medium print:text-sm">{orden.direccion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Teléfono</p>
                <p className="font-medium print:text-sm">{orden.telefono}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Email</p>
                <p className="font-medium print:text-sm">{orden.email}</p>
              </div>
             
            </div>
          </CardContent>
        </Card>

        {/* Información Principal */}
        <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Información General</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print-grid">
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Estado</p>
                <div className="mt-1 print:text-sm">{getEstadoBadge(orden.estado)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Fecha de Creación</p>
                <p className="font-medium print:text-sm">
                  {new Date(orden.fecha).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Total de la Orden</p>
                <p className="text-2xl font-bold text-green-600 print:text-lg">
                  {orden.divisa || 'USD'} ${totalOrdenCalculado.toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Observaciones</p>
                <p className="font-medium print:text-sm">
                  {orden.observaciones || "Sin observaciones"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Condición de Pago</p>
                <p className="font-medium print:text-sm">
                  {orden.condicion_pago || "No especificada"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Dirección de Entrega</p>
                <p className="font-medium print:text-sm">{orden.lugar_entrega}</p>
              </div>
              {orden.cod_cta && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Código de Cuenta</p>
                  <p className="font-medium print:text-sm">{orden.cod_cta}</p>
                </div>
              )}
              {orden.sector && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Sector</p>
                  <p className="font-medium print:text-sm">{orden.sector}</p>
                </div>
              )}
              {orden.fc != null && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Factura (FC)</p>
                  {facturaImageUrl ? (
                    <a
                      href={facturaImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 underline print:text-gray-900 print:no-underline"
                      title="Ver imagen de la factura"
                    >
                      {orden.fc}
                    </a>
                  ) : (
                    <p className="font-medium print:text-sm">{orden.fc}</p>
                  )}
                </div>
              )}
              {orden.fact_path && orden.fc == null && facturaImageUrl && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Imagen de factura</p>
                  <a
                    href={facturaImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800 underline print:text-gray-900 print:no-underline"
                  >
                    Ver factura
                  </a>
                </div>
              )}
              {orden.rt != null && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Remitos (RT)</p>
                  <p className="font-medium print:text-sm">{orden.rt}</p>
                </div>
              )}
              {orden.fecha_entrega && (
                <div>
                  <p className="text-sm text-gray-600 print:text-xs">Fecha de Entrega</p>
                  <p className="font-medium print:text-sm">
                    {formatDateLocal(orden.fecha_entrega)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      

        {/* Artículos de la Orden */}
        <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Artículos de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            {orden.articulos && orden.articulos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 print:border-gray-500 print-table">
                  <thead className="bg-gray-100 print:bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        PIC
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs min-w-[200px]">
                        Artículo
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        Cantidad
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        Precio Unitario
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        Descuento %
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        Precio Unit. c/ desc.
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orden.articulos.map((item, index) => (
                      (() => {
                        const precioConDescuento = calcularPrecioConDescuento(
                          item.precio_unitario,
                          item.descuento
                        );
                        const totalFila = getRowTotal(item);
                        return (
                      <tr key={index} className="hover:bg-gray-50 print:hover:bg-white">
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-600 print:px-2 print:py-1 print:text-xs">
                          {(() => {
                            const comparativaUrl = getComparativaPedidoUrl(item.articulo_id, {
                              ordenCompraId: orden.id,
                              ordenCompraNoc: orden.noc,
                            });
                            const picLabel = extractPicDisplayNumber(item.articulo_id);
                            const parsed = parsePicFromArticuloId(item.articulo_id);

                            if (comparativaUrl) {
                              return (
                                <Link
                                  href={comparativaUrl}
                                  className="text-blue-600 hover:text-blue-800 underline font-medium print:text-gray-600 print:no-underline"
                                  title={`Ver comparativa del pedido ${parsed.pic}`}
                                >
                                  {picLabel}
                                </Link>
                              );
                            }

                            if (parsed.tipo === "sin-pic") {
                              return <span className="text-gray-500">Sin PIC</span>;
                            }

                            return picLabel;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm print:px-2 print:py-1 print:text-xs align-top">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-medium text-gray-900">{item.articulo_nombre}</span>
                            <span className="text-gray-600 leading-snug">
                              <span className="text-gray-500">Descripción: </span>
                              {item.descripcion?.trim() ? item.descripcion : "-"}
                            </span>
                            <span className="text-gray-600 leading-snug">
                              <span className="text-gray-500">Cod. prov. sug.: </span>
                              {item.codprovsug?.trim() ? item.codprovsug : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-700 print:px-2 print:py-1 print:text-xs">
                          {item.cantidad}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-sm text-gray-700 print:px-2 print:py-1 print:text-xs">
                          ${item.precio_unitario?.toLocaleString('es-AR')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-sm text-gray-700 print:px-2 print:py-1 print:text-xs">
                          {(item.descuento ?? 0).toLocaleString('es-AR')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-sm text-gray-700 print:px-2 print:py-1 print:text-xs">
                          ${precioConDescuento.toLocaleString('es-AR')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900 print:px-2 print:py-1 print:text-xs">
                          ${totalFila.toLocaleString('es-AR')}
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 print:bg-gray-100">
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                        TOTAL:
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-lg font-bold text-gray-900 print:px-2 print:py-1 print:text-sm">
                        ${totalOrdenCalculado.toLocaleString('es-AR')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 print:py-2">
                No hay artículos en esta orden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-center gap-4 print-hidden">
          <Button
            onClick={handleImprimir}
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            🖨️ Imprimir
          </Button>
          <Button
            onClick={() => router.push("/auth/ordenes-compra")}
            variant="outline"
            className="px-8"
          >
            🔙 Volver a la Lista
          </Button>
        </div>
      </div>
      </div>

      {/* Modal de Edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">✏️ Editar Orden de Compra</h3>
            
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">📋 Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-noc">Número de Orden (NOC)</Label>
                    <Input
                      id="edit-noc"
                      type="number"
                      value={editData.noc}
                      onChange={(e) => setEditData({ ...editData, noc: e.target.value })}
                      placeholder="Ingrese el número de orden"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-estado">Estado</Label>
                    <select
                      id="edit-estado"
                      value={editData.estado || ''}
                      onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="cumplida">Cumplida</option>
                      <option value="entrego_parcial">Entregó Parcial</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del Proveedor */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">🏢 Información del Proveedor</h4>
                
                <div className="mb-4">
                  <Label htmlFor="edit-proveedor">Buscar Proveedor</Label>
                  <Input
                    id="edit-proveedor"
                    type="text"
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="Buscar por CUIT o nombre del proveedor"
                  />
                  
                  {/* Lista de proveedores filtrados */}
                  {busquedaProveedor && proveedoresFiltrados.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {proveedoresFiltrados.map((proveedor) => (
                        <div
                          key={proveedor.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSeleccionarProveedor(proveedor)}
                        >
                          <div className="font-medium">{proveedor.nombreprov}</div>
                          <div className="text-sm text-gray-600">
                            CUIT: {proveedor.cuitprov} | {proveedor.direccionprov}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {busquedaProveedor && proveedoresFiltrados.length === 0 && (
                    <div className="mt-2 p-3 text-sm text-gray-500 bg-gray-50 rounded-md">
                      No se encontraron proveedores
                    </div>
                  )}
                </div>

                {/* Información del proveedor seleccionado */}
                {editData.proveedor && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">✅ Proveedor Seleccionado</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Nombre:</strong> {editData.proveedor}</div>
                      <div><strong>CUIT:</strong> {editData.cuit}</div>
                      <div><strong>Dirección:</strong> {editData.direccion}</div>
                      <div><strong>Teléfono:</strong> {editData.telefono}</div>
                      <div><strong>Email:</strong> {editData.email}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Información General */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">ℹ️ Información General</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-lugar-entrega">Lugar de Entrega</Label>
                    <select
                      id="edit-lugar-entrega"
                      value={editData.lugar_entrega || ''}
                      onChange={(e) => setEditData({ ...editData, lugar_entrega: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione el lugar de entrega</option>
                      <option value="Gascon 74 Boulogne horario 8 a 16 hrs">
                        Gascon 74 Boulogne horario 8 a 16 hrs
                      </option>
                      <option value="Parque industrial ruta 6, lote 26, Los Cardales">
                        Parque industrial ruta 6, lote 26, Los Cardales
                      </option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-fc">Factura (FC)</Label>
                      <Input
                        id="edit-fc"
                        type="number"
                        value={editData.fc}
                        onChange={(e) => setEditData({ ...editData, fc: e.target.value })}
                        placeholder="Nº de factura"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="edit-factura-imagen">Imagen de factura</Label>
                      <Input
                        id="edit-factura-imagen"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf"
                        disabled={facturaUploading || saving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleSubirImagenFactura(file);
                          e.target.value = "";
                        }}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Se guarda en el bucket fact_compras. El número de FC se ingresa arriba; al guardar, en la vista aparecerá como enlace a la imagen.
                      </p>
                      {facturaUploading && (
                        <p className="text-sm text-blue-600 mt-1">Subiendo imagen...</p>
                      )}
                      {facturaUploadError && (
                        <p className="text-sm text-red-600 mt-1">{facturaUploadError}</p>
                      )}
                      {editData.fact_path && facturaImageUrl && (
                        <p className="text-sm text-green-700 mt-1">
                          Imagen cargada.{" "}
                          <a
                            href={facturaImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Ver vista previa
                          </a>
                        </p>
                      )}
                      {editData.fact_path && !facturaImageUrl && !facturaUploading && (
                        <p className="text-sm text-gray-600 mt-1">Imagen cargada.</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-rt">Remitos (RT)</Label>
                      <Input
                        id="edit-rt"
                        type="number"
                        value={editData.rt}
                        onChange={(e) => setEditData({ ...editData, rt: e.target.value })}
                        placeholder="Nº de remito"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-fecha-entrega">Fecha de Entrega</Label>
                      <Input
                        id="edit-fecha-entrega"
                        type="date"
                        value={editData.fecha_entrega}
                        onChange={(e) => setEditData({ ...editData, fecha_entrega: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-observaciones">Observaciones</Label>
                    <textarea
                      id="edit-observaciones"
                      value={editData.observaciones}
                      onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
                      placeholder="Observaciones adicionales..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-divisa">Divisa</Label>
                    <select
                      id="edit-divisa"
                      name="divisa"
                      value={editData.divisa || "USD"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "USD" || val === "EUR" || val === "ARS") {
                          setEditData(prev => ({ ...prev, divisa: val }));
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-condicion-pago">Condición de Pago</Label>
                    <select
                      id="edit-condicion-pago"
                      value={editData.condicion_pago || ''}
                      onChange={(e) => setEditData({ ...editData, condicion_pago: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione la condición de pago</option>
                      <option value="CC 30/60/90 DIAS FF">CC 30/60/90 DIAS FF</option>
                      <option value="CC 60 DIAS FF">CC 60 DIAS FF</option>
                      <option value="CC 45 DIAS FF">CC 45 DIAS FF</option>
                      <option value="CC 30 DIAS FF">CC 30 DIAS FF</option>
                      <option value="CC 20 DIAS FF">CC 20 DIAS FF</option>
                      <option value="CC 15 DIAS FF">CC 15 DIAS FF</option>
                      <option value="CC 7 DIAS FF">CC 7 DIAS FF</option>
                      <option value="ECHEQ 30 DIAS FF">ECHEQ 30 DIAS FF</option>
                      <option value="ECHEQ 20 DIAS FF">ECHEQ 20 DIAS FF</option>
                      <option value="ECHEQ 15 DIAS FF">ECHEQ 15 DIAS FF</option>
                      <option value="PAGO ANTICIPADO">PAGO ANTICIPADO</option>
                      <option value="PAGO CONTRA ENTREGA">PAGO CONTRA ENTREGA</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-tipo-pago">Tipo de Pago</Label>
                    <select
                      id="edit-tipo-pago"
                      value={editData.tipo_pago || ''}
                      onChange={(e) => setEditData({ ...editData, tipo_pago: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione tipo de pago</option>
                      <option value="CTA A">CTA A</option>
                      <option value="CTA B">CTA B</option>
                      <option value="MERCADO LIBRE">MERCADO LIBRE</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-cod-cta">Código de Cuenta</Label>
                    <select
                      id="edit-cod-cta"
                      value={editData.cod_cta || ''}
                      onChange={(e) => setEditData({ ...editData, cod_cta: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione código de cuenta</option>
                      <option value="1111 MAQ VIDRIERIA">1111 MAQ VIDRIERIA</option>
                      <option value="1115 MAQ HERR GENERAL">1115 MAQ HERR GENERAL</option>
                      <option value="1401 MATERIA PRIMA PVC">1401 MATERIA PRIMA PVC</option>
                      <option value="1402 MATERIA PRIMA ALUMINIO">1402 MATERIA PRIMA ALUMINIO</option>
                      <option value="1403 MATERIA PRIMA VIDRIO">1403 MATERIA PRIMA VIDRIO</option>
                      <option value="1404 HERRAJES PANOL CARDALES">1404 HERRAJES PANOL CARDALES</option>
                      <option value="1408 SILICONA SELLADORES ESPUMA CARDALES">1408 SILICONA SELLADORES ESPUMA CARDALES</option>
                      <option value="1412 TORNILLERIA CARDALES">1412 TORNILLERIA CARDALES</option>
                      <option value="1413 TELA MOSQUITERO">1413 TELA MOSQUITERO</option>
                      <option value="1414 BURLETE">1414 BURLETE</option>
                      <option value="1415 FELPAS Y CORDON">1415 FELPAS Y CORDON</option>
                      <option value="1416 INSUMOS DVH">1416 INSUMOS DVH</option>
                      <option value="1509 ALMUERZOS VIANDAS">1509 ALMUERZOS VIANDAS</option>
                      <option value="1511 CAPACITACION DE PERSONAL">1511 CAPACITACION DE PERSONAL</option>
                      <option value="1512 INDUMENTARIA OPERARIOS">1512 INDUMENTARIA OPERARIOS</option>
                      <option value="1514 EPP">1514 EPP</option>
                      <option value="1527 ALCOHOL ISOP">1527 ALCOHOL ISOP</option>
                      <option value="1528 FERRET INSUMOS CARDALES">1528 FERRET INSUMOS CARDALES</option>
                      <option value="1529 EMBALAJE">1529 EMBALAJE</option>
                      <option value="1530 LUBRICANTE MAQUINAS">1530 LUBRICANTE MAQUINAS</option>
                      <option value="1540 MANTENIMIENTO PVC">1540 MANTENIMIENTO PVC</option>
                      <option value="1541 MANT MAQ VIDRIO">1541 MANT MAQ VIDRIO</option>
                      <option value="1545 MANTENIM MAQ GENERAL">1545 MANTENIM MAQ GENERAL</option>
                      <option value="1548 MANT RODADOS Y FLOTA">1548 MANT RODADOS Y FLOTA</option>
                      <option value="1549 MANTENIMIENTO INMUEBLE">1549 MANTENIMIENTO INMUEBLE</option>
                      <option value="1604 BOTIQUIN PRIM AUX">1604 BOTIQUIN PRIM AUX</option>
                      <option value="1604 FARMACIA CARDALES">1604 FARMACIA CARDALES</option>
                      <option value="1606 LIBRERÍA CARDALES">1606 LIBRERÍA CARDALES</option>
                      <option value="1625 HONO SEG E HIG">1625 HONO SEG E HIG</option>
                      <option value="1705 INV ESCOBAR">1705 INV ESCOBAR</option>
                      <option value="1706 INV EQUIP DE PRODUCCION">1706 INV EQUIP DE PRODUCCION</option>
                      <option value="1708 INV MOBILIARIO CARDALES">1708 INV MOBILIARIO CARDALES</option>
                      <option value="1709 INV EQUI COMPUT">1709 INV EQUI COMPUT</option>
                      <option value="2114 MAQ EQUIP Y HERRAM REPARACIONES">2114 MAQ EQUIP Y HERRAM REPARACIONES</option>
                      <option value="2404 HERRAJES GASCON">2404 HERRAJES GASCON</option>
                      <option value="2408 SILICONA SELLADORES ESPUMA GASCON">2408 SILICONA SELLADORES ESPUMA GASCON</option>
                      <option value="2412 TORNILLERIA GASCON">2412 TORNILLERIA GASCON</option>
                      <option value="2414 BURLETE GASCON">2414 BURLETE GASCON</option>
                      <option value="2415 FELPA Y CORDON GASCON">2415 FELPA Y CORDON GASCON</option>
                      <option value="2528 FERRET INSUMOS GASCON">2528 FERRET INSUMOS GASCON</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-sector">Sector</Label>
                    <Input
                      id="edit-sector"
                      type="text"
                      value={editData.sector || ''}
                      onChange={(e) => setEditData({ ...editData, sector: e.target.value })}
                      placeholder="Ej: Compra directa, Ventas..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Artículos de la Orden */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-purple-800">📦 Artículos de la Orden</h4>
                  <Button
                    onClick={() => setShowArticuloModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-sm"
                  >
                    ➕ Agregar Artículo
                  </Button>
                </div>

                <div className="bg-gray-100 print:bg-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                    <div className="md:col-span-2 border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Artículo
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Cantidad
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Costo unit.
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Descuento %
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Divisa
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Costo unit. c/ desc.
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Total
                    </div>
                  </div>
                </div>
                
                {editData.articulos.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {editData.articulos.map((articulo, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                        <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-start">
                          <div className="md:col-span-2 space-y-2">
                            <Input
                              value={articulo.articulo_nombre}
                              onChange={(e) => handleEditarArticulo(index, 'articulo_nombre', e.target.value)}
                              placeholder="Nombre del artículo"
                              className="text-sm"
                            />
                            <div className="flex flex-col gap-1 text-xs text-gray-600 pl-0.5">
                              <p className="leading-snug">
                                <span className="text-gray-500">Descripción: </span>
                                {articulo.descripcion?.trim() ? articulo.descripcion : "-"}
                              </p>
                              <p className="leading-snug">
                                <span className="text-gray-500">Cod. prov. sug.: </span>
                                {articulo.codprovsug?.trim() ? articulo.codprovsug : "-"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.cantidad}
                              onChange={(e) => handleEditarArticulo(index, 'cantidad', parseInt(e.target.value) || 0)}
                              placeholder="Cantidad"
                              className="text-sm"
                              min="1"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.precio_unitario}
                              onChange={(e) => handleEditarArticulo(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              placeholder="Precio unit."
                              className="text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.descuento ?? 0}
                              onChange={(e) => handleEditarArticulo(index, 'descuento', parseFloat(e.target.value) || 0)}
                              placeholder="Desc. %"
                              className="text-sm"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </div>
                          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium text-center">
                            {editData.divisa || "USD"}
                          </div>
                          <div className="text-sm text-right">
                            ${calcularPrecioConDescuento(articulo.precio_unitario, articulo.descuento).toLocaleString('es-AR')}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              ${getRowTotal(articulo).toLocaleString('es-AR')}
                            </span>
                            <Button
                              onClick={() => handleEliminarArticulo(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 ml-2"
                            >
                              ❌
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total de la orden */}
                    <div className="bg-purple-100 p-3 rounded-lg border-2 border-purple-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total de la Orden:</span>
                        <span className="font-bold text-xl text-purple-800">
                          ${editData.articulos.reduce((sum, item) => sum + getRowTotal(item), 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay artículos en esta orden</p>
                    <Button
                      onClick={() => setShowArticuloModal(true)}
                      className="mt-2 bg-purple-600 hover:bg-purple-700"
                    >
                      Agregar el primer artículo
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={handleCloseEditModal}
                variant="outline"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Agregar Artículo */}
      {showArticuloModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Agregar Nuevo Artículo</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nuevo-articulo-nombre">Nombre del Artículo</Label>
                <Input
                  id="nuevo-articulo-nombre"
                  type="text"
                  value={nuevoArticulo.articulo_nombre}
                  onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, articulo_nombre: e.target.value })}
                  placeholder="Ingrese el nombre del artículo"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="nuevo-articulo-cantidad">Cantidad</Label>
                  <Input
                    id="nuevo-articulo-cantidad"
                    type="number"
                    value={nuevoArticulo.cantidad}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, cantidad: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nuevo-articulo-precio">Precio Unitario</Label>
                  <Input
                    id="nuevo-articulo-precio"
                    type="number"
                    value={nuevoArticulo.precio_unitario}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, precio_unitario: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="nuevo-articulo-descuento">Descuento %</Label>
                  <Input
                    id="nuevo-articulo-descuento"
                    type="number"
                    value={nuevoArticulo.descuento}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, descuento: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Divisa</Label>
                  <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium">
                    {editData.divisa || "USD"}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">
                    ${(nuevoArticulo.cantidad * calcularPrecioConDescuento(nuevoArticulo.precio_unitario, nuevoArticulo.descuento)).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowArticuloModal(false);
                  setNuevoArticulo({
                    articulo_nombre: '',
                    cantidad: 1,
                    precio_unitario: 0,
                    descuento: 0
                  });
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarArticulo}
                disabled={!nuevoArticulo.articulo_nombre.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Agregar Artículo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
