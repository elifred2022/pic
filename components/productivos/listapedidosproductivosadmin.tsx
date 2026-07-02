"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PedidosProductivosAdminMobileList from "@/components/productivos/PedidosProductivosAdminMobileList";
import { OcBackLink } from "@/components/ordenes-compra/oc-back-link";
import { useOcVolver, type OcVolver } from "@/hooks/use-oc-volver";
import { useCanEditAsAdmin } from "@/hooks/use-can-edit-as-admin";
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

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
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
  nota_aprobador?: string;
  notas_aprobador?: string;
  nota_comprador?: string;
  comprador?: string | null;
  estado: string;
  observ: string;
  numero_oc: string | null;
  proveedor_seleccionado: string | null;
  usd: number;
  eur: number;
  ars: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: string | null;
  fac: string | null;
  
  articulos: {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    cant: number;
    provsug: string;
    codprovsug?: string;
    presentacion?: string;
    observacion: string;
  }[];
};

export default function ListaPedidosProductivosAdmin() {
  const { canEdit } = useCanEditAsAdmin();

  interface Articulo {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    cant: number;
    provsug: string;
    codprovsug?: string;
    presentacion?: string;
    observacion: string;
  }

   const searchParams = useSearchParams();
   const { ocVolver, resolveOcParaPedido } = useOcVolver();
   const [comparativaOc, setComparativaOc] = useState<OcVolver | null>(null);
   const comparativaAbiertaRef = useRef<string | null>(null);
   const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [editingPedido, setEditingPedido] = useState<Pedido | null>(null); //modal edicion
    const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
    const [ocultarAprobados, setOcultarAprobados] = useState(false);
    const [ocultarAnulados, setOcultarAnulados] = useState(false);
    const [ocultarStandBy, setOcultarStandBy] = useState(false);
    const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
    const [comparativaPedido, setComparativaPedido] = useState<Pedido | null>(null); //modal comparativa
    

    const [comparativaForm, setComparativaForm] = useState<ProveedorComparativa[] | null>(null);
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
  
    const [formData, setFormData] = useState<Partial<Pedido>>({});
    const [fechaImpresion, setFechaImpresion] = useState("");
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
   
   // Establecer fecha de impresión para evitar errores de hidratación
   useEffect(() => {
     setFechaImpresion(new Date().toLocaleDateString('es-AR') + ' a las ' + new Date().toLocaleTimeString('es-AR'));
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
   
       // Recalcular comparativa cuando se abre el modal de edición
    useEffect(() => {
      if (editingPedido && formData.articulos && formData.articulos.length > 0) {
        // Solo recalcular si no hay comparativa o si es la primera vez que se abre
        if (!comparativaForm) {
          // Crear estructura inicial
          const articulosBase = formData.articulos.map(a => ({
            codint: a.codint,
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
        }
      }
    }, [editingPedido, formData.articulos, comparativaForm]);
   
   
   // Cargar datos
    useEffect(() => {
    const fetchPedidos = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        return;
      }
  
      const { data, error } = await supabase
        .from("pedidos_productivos")
        .select("*")
        //.eq("uuid", user.id); // 👈 Filtra por usuario logueado
  
      if (error) console.error("Error cargando pedidos:", error);
      else if (data) {
        const pedidosEnriquecidos = await enriquecerPedidosConCodProvSug(data);
        setPedidos(pedidosEnriquecidos);
      }
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
    void abrirComparativaPedido(pedido);
  }, [searchParams, pedidos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!comparativaPedido || !comparativaOc?.id) {
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
  }, [comparativaPedido?.id, comparativaOc?.id, supabase]);

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
    const provs = comparativaPedido?.comparativa_prov;
    if (!comparativaPedido || !provs?.length) {
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
  }, [comparativaPedido?.id, comparativaPedido?.comparativa_prov, supabase]);
  
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
      const s = search.trim().toLowerCase(); // normalizar búsqueda
      if (!s) return true;

      // Verificar propiedades del pedido
      const matchPedidoPropiedades = Object.entries(pedido).some(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (String(value).toLowerCase().includes(s)) return true;
        if (dateFields.includes(key as keyof Pedido)) {
          const isoDate = String(value).split("T")[0];
          const niceDate = formatDate(value as string);
          return (
            isoDate.toLowerCase().includes(s) ||
            niceDate.toLowerCase().includes(s)
          );
        }
        return false;
      });

      // Verificar en los artículos
      const matchArticulos = pedido.articulos?.some((art: Articulo) =>
        ['codint', 'articulo', 'descripcion', 'presentacion', 'provsug', 'codprovsug', 'existencia'].some((campo) => {
          const val = art[campo as keyof Articulo];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(s);
        })
      ) ?? false;

      return matchPedidoPropiedades || matchArticulos;
    })
  .filter((pedido) => {
    // tus condiciones de ocultar
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

  const initComparativaForm = (p: Pedido) => {
    if (p.comparativa_prov && p.comparativa_prov.length > 0) {
      const comparativaConCant = p.comparativa_prov.map((prov) => ({
        ...prov,
        articulos: prov.articulos.map((art) => ({
          ...art,
          cant: art.cant || p.articulos.find((a) => a.codint === art.codint)?.cant || 0,
          descuentoPorcentaje: art.descuentoPorcentaje || 0,
        })),
      }));
      setComparativaForm(comparativaConCant);
    } else {
      const articulosBase = p.articulos.map((a) => ({
        codint: a.codint,
        articulo: a.articulo,
        cant: a.cant,
        precioUnitario: null,
        descuentoPorcentaje: 0,
        subtotal: 0,
      }));
      setComparativaForm([
        { nombreProveedor: "", articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
        { nombreProveedor: "", articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
        { nombreProveedor: "", articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
      ]);
    }
  };

  const abrirEdicionPedido = (p: Pedido) => {
    setEditingPedido(p);
    setFormData(p);
    initComparativaForm(p);
  };

  const enriquecerPedidosConCodProvSug = async (pedidos: Pedido[]): Promise<Pedido[]> => {
    const codints = [
      ...new Set(
        pedidos.flatMap((p) => (p.articulos ?? []).map((a) => a.codint).filter(Boolean))
      ),
    ];
    if (codints.length === 0) return pedidos;

    const { data } = await supabase
      .from("articulos")
      .select("codint, codprovsug, presentacion")
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
          codprovsug: art.codprovsug ?? desdeBd?.codprovsug ?? "",
          presentacion: art.presentacion ?? desdeBd?.presentacion ?? "",
        };
      }),
    }));
  };

  const enriquecerArticulosConCodProvSug = async (p: Pedido): Promise<Pedido> => {
    const [enriquecido] = await enriquecerPedidosConCodProvSug([p]);
    return enriquecido;
  };

  const abrirComparativaPedido = async (p: Pedido) => {
    setOcFacturaForm(emptyOcFacturaForm());
    setOcFacturaImageUrl(null);
    setOcFacturaUploadError(null);

    const oc = await resolveOcParaPedido({ id: p.id, numero_oc: p.numero_oc });
    setComparativaOc(oc);

    const pedidoEnriquecido = await enriquecerArticulosConCodProvSug(p);
    setComparativaPedido(pedidoEnriquecido);
    setFormData(pedidoEnriquecido);
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
      editingPedido.id,
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
      .from("pedidos_productivos")
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
      .from("pedidos_productivos")
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

  const eliminarPedido = async (p: Pedido) => {
    const confirm = window.confirm(`¿Estás seguro de que querés eliminar el pedido ${p.id}?`);
    if (!confirm) return;

    const { error } = await supabase.from("pedidos_productivos").delete().eq("id", p.id);
    if (error) {
      alert("Error al eliminar");
      console.error(error);
    } else {
      alert("Pedido eliminado");
      setSelectedMobilePedidoId((prev) => (prev === p.id ? null : prev));
      const { data } = await supabase.from("pedidos_productivos").select("*");
      if (data) {
        const pedidosEnriquecidos = await enriquecerPedidosConCodProvSug(data);
        setPedidos(pedidosEnriquecidos);
      }
    }
  };

  // ✅ Función para actualizar pedido
 // ✅ Función para actualizar pedido
const handleUpdatePedido = async () => {
    if (!editingPedido && !comparativaPedido) return;

    const pedidoToUpdate = editingPedido || comparativaPedido;
    if (!pedidoToUpdate) return;

    setGuardandoComparativa(true);

    const dataToUpdate: Partial<Pedido> = {
        estado: formData.estado,
        observ: formData.observ,
        numero_oc: formData.numero_oc,
        proveedor_seleccionado: formData.proveedor_seleccionado,
        usd: formData.usd,
        eur: formData.eur,
        ars: formData.ars,
        supervisor: formData.supervisor,
        controlado: formData.controlado,
        fecha_conf: formData.fecha_conf,
        fecha_prom: formData.fecha_prom,
        fecha_ent: formData.fecha_ent,
        fac: formData.fac,
        rto: formData.rto,
    };

    if (editingPedido) {
        dataToUpdate.comparativa_prov = comparativaForm;
        dataToUpdate.nota_comprador = formData.nota_comprador;
        dataToUpdate.comprador = formData.comprador?.trim() || null;
    }

    const { error } = await supabase
        .from("pedidos_productivos")
        .update(dataToUpdate)
        .eq("id", pedidoToUpdate.id);

    if (error) {
        console.error("Error actualizando pedido:", error);
        alert(`Error al guardar el pedido: ${error.message}`);
        setGuardandoComparativa(false);
        return;
    }

    if (comparativaPedido && comparativaOc?.id) {
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
        console.error("Error actualizando orden de compra:", ocError);
        alert(`Pedido guardado, pero error en la orden de compra: ${ocError.message}`);
        setGuardandoComparativa(false);
        return;
      }
    }

    setPedidos((prev) =>
        prev.map((p) =>
            p.id === pedidoToUpdate.id ? { ...p, ...dataToUpdate } as Pedido : p
        )
    );

    setGuardandoComparativa(false);
    setEditingPedido(null);
    setComparativaPedido(null);
    setComparativaOc(null);
    setComparativaForm(null);
    setPresupuestoViewUrls({});
    setComparativaPresupuestoUrls({});
    setPresupuestoUploadErrors({});
};

// Estilos para la tabla (comentados por ahora)
// const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
// const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";

  // ✅ Función para imprimir comparativa
  const imprimirComparativa = () => {
    if (!comparativaPedido) return;
    
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparativa de Proveedores - Pedido ${comparativaPedido.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 10px;
            color: #333;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-section {
            background: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .info-section h3 {
            color: #1e40af;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #3b82f6;
            padding-bottom: 5px;
            font-size: 12px;
          }
          .info-item {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .info-label {
            font-weight: bold;
            color: #374151;
          }
          .articulos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
          }
          .proveedor-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 10px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .proveedor-header {
            background: #f3f4f6;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-align: center;
            border: 1px solid #d1d5db;
          }
          .proveedor-nombre {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
          }
          .tabla-articulos {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .tabla-articulos th {
            background: #f9fafb;
            padding: 6px 4px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-weight: bold;
            color: #374151;
            font-size: 9px;
          }
          .tabla-articulos td {
            padding: 6px 4px;
            border-bottom: 1px solid #f3f4f6;
            color: #6b7280;
            font-size: 9px;
          }
          .tabla-articulos th:last-child,
          .tabla-articulos td:last-child {
            text-align: right;
          }
          .total-proveedor {
            background: #fef3c7;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
            border: 1px solid #f59e0b;
            font-weight: bold;
            color: #92400e;
            font-size: 10px;
          }
          .fecha-impresion {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 8px;
          }
          .cotizaciones-titulo {
            color: #1e40af;
            text-align: center;
            margin: 20px 0 15px 0;
            border-bottom: 1px solid #3b82f6;
            padding-bottom: 8px;
            font-size: 14px;
          }
          @media print {
            body { margin: 0; }
            .header { border-bottom-color: #000; }
            .info-section { background: #fff; border-color: #000; }
            .proveedor-card { border-color: #000; box-shadow: none; }
            .proveedor-header { background: #fff; border-color: #000; }
            .tabla-articulos th { background: #fff; border-color: #000; }
            .total-proveedor { background: #fff; border-color: #000; color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Comparativa de Proveedores</h1>
          <p><strong>Pedido Productivo:</strong> ${comparativaPedido.id}</p>
          <p><strong>Fecha de Impresión:</strong> ${fechaImpresion.split(' a las ')[0]}</p>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <h3>📋 Detalles del Pedido</h3>
            <div class="info-item">
              <span class="info-label">Fecha Necesidad:</span>
              <span>${formatDate(comparativaPedido.necesidad)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha de Confirmado:</span>
              <span>${formatDate(formData.fecha_conf ?? comparativaPedido.fecha_conf)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha Prometida:</span>
              <span>${formatDate(formData.fecha_prom ?? comparativaPedido.fecha_prom)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sector:</span>
              <span>${comparativaPedido.sector || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Solicitante:</span>
              <span>${comparativaPedido.solicita || '-'}</span>
            </div>
            ${
              comparativaPedido.nota_solicitante &&
              String(comparativaPedido.nota_solicitante).trim()
                ? `<div class="info-item">
              <span class="info-label">Notas solicitante:</span>
              <span>${String(comparativaPedido.nota_solicitante)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</span>
            </div>`
                : ""
            }
            <div class="info-item">
              <span class="info-label">Aprueba:</span>
              <span>${comparativaPedido.aprueba || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado:</span>
              <span>${comparativaPedido.estado || '-'}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>📦 Artículos Solicitados</h3>
            ${comparativaPedido.articulos && comparativaPedido.articulos.length > 0 
              ? comparativaPedido.articulos.map(art => `
                <div class="info-item">
                  <span class="info-label">${art.articulo}</span>
                </div>
                <div class="info-item" style="margin-bottom: 4px;">
                  <span style="font-size: 9px; color: #4b5563;">Desc: ${art.descripcion != null && String(art.descripcion).trim() !== '' ? art.descripcion : '-'}</span>
                </div>
                <div class="info-item" style="margin-bottom: 4px;">
                  <span style="font-size: 9px; color: #4b5563;">Presentacion: ${art.presentacion != null && String(art.presentacion).trim() !== '' ? art.presentacion : '-'}</span>
                </div>
                <div class="info-item">
                  <span>Cant: ${art.cant} · Stock: ${art.existencia ?? '-'} · Cod. prov. sug.: ${art.codprovsug?.trim() ? art.codprovsug : '-'}</span>
                </div>
                <div class="info-item" style="margin-left: 15px; margin-bottom: 8px;">
                  <span style="font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 2px; font-size: 8px;">
                    Código: ${art.codint}
                  </span>
                </div>
              `).join('')
              : '<p>Sin artículos</p>'
            }
          </div>
        </div>

        <h2 class="cotizaciones-titulo">
          💰 Cotizaciones de Proveedores
        </h2>

        <div class="articulos-grid">
          ${comparativaPedido.comparativa_prov && comparativaPedido.comparativa_prov.length > 0
            ? comparativaPedido.comparativa_prov.map(prov => `
              <div class="proveedor-card">
                <div class="proveedor-header">
                  <h3 class="proveedor-nombre">${prov.nombreProveedor || 'Proveedor sin nombre'}</h3>
                </div>
                
                <table class="tabla-articulos">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Cant.</th>
                      <th>Cod. prov. sug.</th>
                      <th>Precio Unit.</th>
                      <th>Desc. %</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${prov.articulos.map(art => {
                      const articuloOriginal = comparativaPedido.articulos?.find(a => a.codint === art.codint);
                      const codProvSug = articuloOriginal?.codprovsug?.trim() ? articuloOriginal.codprovsug : '-';
                      return `
                      <tr>
                        <td title="${art.articulo}">${art.articulo}</td>
                        <td>${art.cant}</td>
                        <td>${codProvSug}</td>
                        <td>$${(art.precioUnitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${(art.descuentoPorcentaje || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</td>
                        <td>$${(art.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    `;
                    }).join('')}
                  </tbody>
                </table>
                
                <div class="total-proveedor">
                  Total: $${(prov.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            `).join('')
            : '<p style="text-align: center; color: #6b7280; grid-column: 1 / -1;">No hay cotizaciones de proveedores</p>'
          }
        </div>

        <div class="info-section" style="margin-top: 12px;">
          <h3>Nota del comprador</h3>
          <p style="margin: 0; font-size: 10px; white-space: pre-wrap;">${String(comparativaPedido.nota_comprador ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <div class="info-section" style="margin-top: 8px;">
          <h3>Notas del aprobador</h3>
          <p style="margin: 0; font-size: 10px; white-space: pre-wrap;">${String(comparativaPedido.notas_aprobador || comparativaPedido.nota_aprobador || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>

        <div class="fecha-impresion">
          Impreso el ${fechaImpresion}
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
          
          <h1 className="text-3xl font-bold text-gray-800">⚙️ Pedidos Productivos Admin</h1>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        {canEdit && (
        <Link
          href="/auth/rutaproductivos/crear-formpedidosproductivos"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
        >
            ➕ Crear Pedido Productivo
        </Link>
        )}
          
        <input
          type="text"
            placeholder="🔍 Buscar pedido productivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
        />
        </div>
      </div>

      {/* Filtros con mejor diseño */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🎛️ Filtros de estado</h3>
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
        <PedidosProductivosAdminMobileList
          pedidos={filteredPedidos}
          selectedId={selectedMobilePedidoId}
          onSelect={setSelectedMobilePedidoId}
          onClearSelection={() => setSelectedMobilePedidoId(null)}
          formatDate={formatDate}
          renderValue={renderValue}
          mobileBtnBase={mobileBtnBase}
          onEdit={abrirEdicionPedido}
          onComparativa={abrirComparativaPedido}
          onDelete={eliminarPedido}
          canEdit={canEdit}
        />
        <div className="hidden lg:block overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left bg-gradient-to-r from-blue-600 to-blue-700">Acciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Solicitante</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Artículo Solicitado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Observ/Mensaje</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Supervisado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Comprador</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Aprueba</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Prov. Selecc.</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">USD</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">EUR</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">ARS sin imp</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Confirmado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Promesa</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Entrego</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fac</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Rto</th>
          </tr>
        </thead>
        <tbody>
          {filteredPedidos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 border-b border-gray-200 align-top">
                    <div className="flex flex-col gap-2">
                      {canEdit && (
                      <button 
                        className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-sm"
                                                   onClick={() => abrirEdicionPedido(p)}
                >
                        ✏️ Editar
                </button>
                      )}
                 <button
                        className="px-3 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-105 text-sm"
                      onClick={() => abrirComparativaPedido(p)}
                  >
                        📊 Comparativa
                  </button>
                {canEdit && (
                <button
                        className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-sm"
                    onClick={() => eliminarPedido(p)}
                  >
                        🗑️ Elim
                  </button>
                )}
                </div>
              </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <span
                    className={
                    p.estado === "anulado"
                          ? "px-3 py-2 bg-red-100 text-red-800 text-sm font-semibold rounded-full"
                        : p.estado === "aprobado"
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                        : p.estado === "cotizado"
                          ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                        : p.estado === "iniciado"
                          ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                        : p.estado === "visto/recibido"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                        : p.estado === "stand by"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                        : p.estado === "Presentar presencial"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                        : p.estado === "cumplido"
                          ? "px-3 py-2 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full"
                          : p.estado === "confirmado" 
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : "px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full"
                    }
                >
                   {renderValue(p.estado)}
                </span>
            </td>
            
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium text-lg">{p.id}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.necesidad)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.categoria}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{p.solicita}</span>
                      {p.nota_solicitante?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {p.nota_solicitante}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.sector}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    {p.articulos && p.articulos.length > 0 ? (
                      <div className="space-y-2">
                        {p.articulos.map((art, index) => (
                          <div key={index} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="font-medium text-gray-800">{art.articulo}</div>
                            <div className="text-gray-600 text-xs">Desc: {renderValue(art.descripcion)}</div>
                            <div className="text-gray-600 text-xs">Presentacion: {art.presentacion?.trim() ? art.presentacion : '-'}</div>
                            <div className="text-gray-600">Cant: {art.cant}</div>
                            <div className="text-gray-600">Stock: {art.existencia ?? '-'}</div>
                            <div className="text-gray-600">Prov: {art.provsug || '-'}</div>
                            <div className="text-gray-600">Cod. prov. sug.: {art.codprovsug?.trim() ? art.codprovsug : '-'}</div>
                            <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">Código: {art.codint}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">- Sin artículos -</span>
                    )}
                </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="max-w-xs">
                      <span className="text-sm text-gray-700">{renderValue(p.observ)}</span>
                </div>
                </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{p.controlado}</span>
                      <span className="text-sm text-gray-600">{p.supervisor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{renderValue(p.comprador)}</span>
                      {p.nota_comprador?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {p.nota_comprador}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-orange-600 font-medium text-lg">{renderValue(p.aprueba)}</span>
                      <span className="text-xs text-red-600 max-w-[180px] break-words">
                        {p.notas_aprobador || p.nota_aprobador || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.numero_oc)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.proveedor_seleccionado)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">${(Number(p.usd) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">€{(Number(p.eur) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">${(Number(p.ars) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_conf)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_prom)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_ent)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{renderValue(p.fac)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{renderValue(p.rto)}</td>
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
              <h2 className="text-2xl font-bold">✏️ Editar Pedido Productivo #{formData.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido productivo</p>
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
                           <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                           <div className="text-gray-600 text-xs">Desc: {renderValue(art.descripcion)}</div>
                           <div className="text-gray-600 text-xs">Presentacion: {art.presentacion?.trim() ? art.presentacion : '-'}</div>
                           <div className="text-gray-600 text-xs">Cant. sol: {art.cant}</div>
                           <div className="text-gray-600 text-xs">Stock: {art.existencia}</div>
                           <div className="text-gray-600 text-xs">Cod. prov. sug.: {art.codprovsug?.trim() ? art.codprovsug : '-'}</div>
                           <div className="text-gray-600 text-xs">Observ: {art.observacion}</div>
                           <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">Código: {art.codint}</div>
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
                        value={formData.supervisor || ""}
                        onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      />
                    </div>
                    </div>

                             {/* Sección de Comparativa de Proveedores */}
               <div className="mb-6">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                     <span className="mr-2">📊</span>
                     Comparativa de Proveedores
                   </h3>
                                       <button
                      onClick={() => {
                        if (comparativaForm && formData.articulos && formData.articulos.length > 0) {
                          const nuevaComparativa = comparativaForm.map(prov => ({
                            ...prov,
                                                         articulos: prov.articulos.map(art => {
                               // Obtener la cantidad del artículo original del pedido
                               const articuloOriginal = formData.articulos!.find(a => a.codint === art.codint);
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
                            prov.total = prov.articulos.reduce((sum, art) => sum + (art.subtotal || 0), 0);
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
                        {comparativaForm?.map((prov, provIndex) => (
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
                                const newComparativa = [...comparativaForm];
                                newComparativa[provIndex].nombreProveedor = e.target.value;
                                setComparativaForm(newComparativa);
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
                                           const articuloOriginal = formData.articulos?.find(a => a.codint === art.codint);
                                           const cantidad = articuloOriginal?.cant || 0;
                                           
                                           newComparativa[provIndex].articulos[artIndex].precioUnitario = newPrecio;
                                          newComparativa[provIndex].articulos[artIndex].subtotal = calcularSubtotalConDescuento(
                                            newPrecio,
                                            descuentoPorcentajeActual,
                                            cantidad
                                          );
                                           
                                           // Recalcular total del proveedor
                                           newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                             (sum, articulo) => sum + (articulo.subtotal || 0), 0
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

                                    // Obtener la cantidad del artículo original del pedido
                                    const articuloOriginal = formData.articulos?.find(a => a.codint === art.codint);
                                    const cantidad = articuloOriginal?.cant || 0;

                                    newComparativa[provIndex].articulos[artIndex].descuentoPorcentaje = nuevoDescuento;
                                    newComparativa[provIndex].articulos[artIndex].subtotal = calcularSubtotalConDescuento(
                                      precioUnitarioActual,
                                      nuevoDescuento,
                                      cantidad
                                    );

                                    // Recalcular total del proveedor
                                    newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                      (sum, articulo) => sum + (articulo.subtotal || 0), 0
                                    );

                                    setComparativaForm(newComparativa);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-medium">
                                ${(art.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-gray-100 p-2 rounded border text-sm">
                        Total: ${(prov.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Presupuesto (PDF o JPG)
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,application/pdf"
                          disabled={!!presupuestoUploading[provIndex] || guardandoComparativa}
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
                              disabled={!!presupuestoUploading[provIndex] || guardandoComparativa}
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

                <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-amber-950 mb-2">
                    Notas del comprador
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-white text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 text-sm"
                    rows={3}
                    placeholder="Observaciones de compras sobre la comparativa de precios..."
                    value={formData.nota_comprador ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nota_comprador: e.target.value })
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
                       Observaciones:
                     </label>
                     <textarea
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       rows={3}
                       placeholder="Agregar observaciones sobre el cambio de estado..."
                       value={formData.observ || ""}
                       onChange={(e) => setFormData({ ...formData, observ: e.target.value })}
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
                        value={formData.proveedor_seleccionado || ""}
                        onChange={(e) => setFormData({ ...formData, proveedor_seleccionado: e.target.value })}
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
                        value={formData.numero_oc || ""}
                        onChange={(e) => setFormData({ ...formData, numero_oc: e.target.value })}
                      />
                    </div>
                  </div>

                   {/* Campos adicionales para pedidos generales */}
              
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Factura:
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Número de factura"
                        value={formData.fac || ""}
                        onChange={(e) => setFormData({ ...formData, fac: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de RTO:
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Número de RTO"
                        value={formData.rto || ""}
                        onChange={(e) => setFormData({ ...formData, rto: e.target.value })}
                      />
                    </div>
                  </div>
               </div>

               {/* Sección de Fechas */}
               <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                   <span className="mr-2">📅</span>
                   Fechas del Pedido
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Fecha de Confirmado:
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
                       Fecha de Ingreso:
                     </label>
                     <input
                       type="date"
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       value={formData.fecha_ent || ""}
                       onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
                     />
                   </div>
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

      {/* ✅ Modal de comparativa */}
{comparativaPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1900px] max-h-[95vh] overflow-y-auto overflow-x-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">📊 Comparativa de Proveedores #{comparativaPedido.id}</h2>
                  <p className="text-green-100 mt-2">Vista de comparativa y edición de estado</p>
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
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(comparativaPedido.necesidad)}</p>
                    <p><span className="font-medium">Fecha de Confirmado:</span> {formatDate(formData.fecha_conf ?? comparativaPedido.fecha_conf)}</p>
                    <p><span className="font-medium">Fecha Prometida:</span> {formatDate(formData.fecha_prom ?? comparativaPedido.fecha_prom)}</p>
                    <p><span className="font-medium">Sector:</span> {comparativaPedido.sector}</p>
                    <p><span className="font-medium">Solicitante:</span> {comparativaPedido.solicita}</p>
                    {comparativaPedido.nota_solicitante?.trim() ? (
                      <p className="text-sm text-blue-700 font-bold whitespace-pre-wrap">
                        <span className="font-medium text-gray-800">Notas solicitante:</span>{" "}
                        {comparativaPedido.nota_solicitante}
                      </p>
                    ) : null}
                    <p><span className="font-medium">Aprueba:</span> {comparativaPedido.aprueba}</p>
                  </div>
                </div>

                                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos</h3>
                   {comparativaPedido.articulos && comparativaPedido.articulos.length > 0 ? (
                     <div className="space-y-2">
                       {comparativaPedido.articulos.map((art, index) => (
                         <div key={index} className="bg-white p-3 rounded border border-gray-200">
                           <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                           <div className="text-gray-600 text-xs">Desc: {renderValue(art.descripcion)}</div>
                           <div className="text-gray-600 text-xs">Presentacion: {art.presentacion?.trim() ? art.presentacion : '-'}</div>
                           <div className="text-gray-600 text-xs">Cant: {art.cant}</div>
                           <div className="text-gray-600 text-xs">Stock: {art.existencia ?? '-'}</div>
                           <div className="text-gray-600 text-xs">Cod. prov. sug.: {art.codprovsug?.trim() ? art.codprovsug : '-'}</div>
                           <div className="text-gray-600 text-xs">Observ: {art.observacion || '-'}</div>
                           <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">Código: {art.codint}</div>
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
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 font-semibold bg-white text-center text-sm break-words"
                                     value={prov.nombreProveedor}
                         readOnly
                                 />

                                             <table className="w-full text-gray-700 text-sm">
                                     <thead>
                           <tr className="border-b border-gray-200">
                             <th className="px-2 py-2 text-left font-medium">Artículo</th>
                             <th className="px-2 py-2 text-center font-medium">Cant.</th>
                             <th className="px-2 py-2 text-center font-medium">Stock</th>
                             <th className="px-2 py-2 text-center font-medium">Cod. prov. sug.</th>
                             <th className="px-2 py-2 text-center font-medium">Precio</th>
                            <th className="px-2 py-2 text-center font-medium w-1/6">Desc. %</th>
                             <th className="px-2 py-2 text-center font-medium w-1/6">Subtotal</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {prov.articulos.map((art, artIndex) => (
                             <tr key={artIndex} className="border-b border-gray-100">
                               <td className="px-2 py-2 text-sm break-words" title={art.articulo}>
                                 <div className="max-w-full">
                                   {art.articulo}
                                 </div>
                               </td>
                               <td className="px-2 py-2 text-center text-sm">{art.cant}</td>
                               <td className="px-2 py-2 text-center text-sm">
                                 {(() => {
                                   const articuloOriginal = comparativaPedido.articulos.find(a => a.codint === art.codint);
                                   return articuloOriginal?.existencia || 0;
                                 })()}
                               </td>
                               <td className="px-2 py-2 text-center text-sm font-mono">
                                 {(() => {
                                   const articuloOriginal = comparativaPedido.articulos.find(a => a.codint === art.codint);
                                   return articuloOriginal?.codprovsug?.trim() ? articuloOriginal.codprovsug : '-';
                                 })()}
                               </td>
                               <td className="px-2 py-2 text-center text-sm">
                                 ${(art.precioUnitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </td>
                              <td className="px-2 py-2 text-center text-sm">
                                {(art.descuentoPorcentaje || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                              </td>
                               <td className="px-2 py-2 text-center text-sm">
                                 ${(art.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-white p-3 rounded border text-sm">
                        Total: ${(prov.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <option value="iniciado">Iniciado</option>
                    <option value="visto/recibido">Visto/Recibido</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="cotizado">Cotizado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cumplido">Cumplido</option>
                    <option value="anulado">Anulado</option>
                    <option value="stand by">Stand By</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de OC:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Número de orden de compra"
                    value={formData.numero_oc || ""}
                    onChange={(e) => setFormData({ ...formData, numero_oc: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Factura (pedido):</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Nº de factura"
                    value={formData.fac || ""}
                    onChange={(e) => setFormData({ ...formData, fac: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remito (pedido):</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Nº de remito"
                    value={formData.rto || ""}
                    onChange={(e) => setFormData({ ...formData, rto: e.target.value })}
                  />
                </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📅</span>
                Fechas del Pedido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Confirmado:
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formatDateInputValue(formData.fecha_conf) || ""}
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
                    value={formatDateInputValue(formData.fecha_prom) || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_prom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Ingreso:
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formatDateInputValue(formData.fecha_ent) || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
                  />
                </div>
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
                        setOcFacturaForm((prev) => ({ ...prev, fecha_entrega: e.target.value }))
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

              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={imprimirComparativa}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  🖨️ Imprimir
                </button>
                <button
                    onClick={() => {
                      setComparativaPedido(null);
                      setComparativaOc(null);
                    }}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  ❌ Cerrar
                </button>
                <button
                    onClick={handleUpdatePedido}
                  disabled={guardandoComparativa || ocFacturaUploading}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                >
                  {guardandoComparativa ? "Guardando..." : "💾 Guardar"}
                </button>
              </div>
            </div>
        </div>
    </div>
)}
    </div>
  );

  
}
