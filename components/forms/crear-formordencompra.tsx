"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface Proveedor {
  id: number;
  cuitprov: number;
  nombreprov: string;
  direccionprov: string;
  telefonoprov: number;
  emailprov: string;
}

interface ArticuloAprobado {
  id: string; // Cambiado a string para IDs únicos
  pedido_id: string; // ID del pedido original
  articulo: string;
  descripcion: string;
  cantidad: number;
  cant_exist: number;
  observacion: string;
  categoria: string;
  sector: string;
  solicita: string;
  aprueba: string;
  necesidad: string;
  estado: string;
  origen: 'productivo' | 'general'; // Nuevo campo para identificar el origen
  codint?: string;
  codprovsug?: string;
  articulo_db_id?: string | null;
  costunit?: string | null;
  descuento?: string | null;
}

interface ItemOrden {
  articulo_id: string;
  articulo_nombre: string;
  articulo_db_id?: string | null; // id real en tabla articulos (si aplica)
  codint?: string | null;
  descripcion?: string | null;
  codprovsug?: string | null;
  cantidad: number;
  precio_unitario: number;
  descuento: number; // porcentaje 0-100
  costunitcdesc: number;
  divisa: "USD" | "EUR" | "ARS";
  total: number;
}

interface ArticuloCatalogo {
  id: string;
  codint: string | null;
  articulo: string;
  descripcion: string | null;
  codprovsug: string | null;
  costunit: string | null;
  descuento: string | null;
  costunitcdesc: string | null;
  divisa: string | null;
}

interface ArticuloOrden {
  articulo_id: string;
}

interface ArticuloPedido {
  articulo: string;
  descripcion: string;
  cant: number;
  cant_exist: number;
  observacion: string;
  codint?: string;
  codprovsug?: string;
}

const SECTORES = [
  "Compra directa",
  "Panol Cardales",
  "Panol Gascon",
  "Mantenimiento",
  "RRHH",
  "Seguridad e Higiene",
  "Vidrio",
  "Pvc",
  "Perf. Aluminio",
  "Administracion",
  "Colocaciones",
  "Reparaciones",
  "Mediciones",
  "Maestranza",
  "Compras",
  "Calidad",
  "Flota",
];

export function CrearFormOrdenCompra() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [articulosAprobados, setArticulosAprobados] = useState<ArticuloAprobado[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [itemsOrden, setItemsOrden] = useState<ItemOrden[]>([]);
  const [totalOrden, setTotalOrden] = useState(0);
  const [mostrarFormSinPic, setMostrarFormSinPic] = useState(false);
  const [busquedaArticuloCatalogo, setBusquedaArticuloCatalogo] = useState("");
  const [articulosCatalogo, setArticulosCatalogo] = useState<ArticuloCatalogo[]>([]);
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false);
  const [articuloSinPic, setArticuloSinPic] = useState({
    nombre: "",
    cantidad: "1",
    precio_unitario: "0",
    descuento: 0
  });
  const [cantidadEdicion, setCantidadEdicion] = useState<Record<string, string>>({});
  const [precioEdicion, setPrecioEdicion] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    cuit_proveedor: "",
    observaciones: "",
    estado: "pendiente",
    lugar_entrega: "",
    noc: "",
    sector: "",
    cod_cta: "",
    condicion_pago: "",
    tipo_pago: "",
    condi_proceso: "",
    importe_competencia: "0",
    divisa: "USD" as "USD" | "EUR" | "ARS"
  });

  const router = useRouter();
  const supabase = createClient();

  const parseNumero = (valor: string) => {
    const normalizado = valor.replace(",", ".");
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? 0 : numero;
  };

  const esEntradaDecimalValida = (valor: string) =>
    valor === "" || /^\d*[.,]?\d*$/.test(valor);

  const parseCantidadDecimal = (valor: string) => {
    if (valor === "" || valor === "." || valor === ",") return 0;
    return parseNumero(valor);
  };

  const calcularPrecioConDescuento = (precio: number, descuento: number) => {
    const descuentoNormalizado = Math.min(Math.max(descuento, 0), 100);
    return precio - (precio * descuentoNormalizado) / 100;
  };

  const enriquecerArticulosConCatalogo = useCallback(
    async (articulos: ArticuloAprobado[]): Promise<ArticuloAprobado[]> => {
      const codints = [
        ...new Set(articulos.map((a) => a.codint).filter(Boolean)),
      ] as string[];
      const nombres = [
        ...new Set(articulos.filter((a) => !a.codint).map((a) => a.articulo)),
      ];

      const codProvPorCodint = new Map<string, string>();
      const codProvPorNombre = new Map<string, string>();
      const descPorCodint = new Map<string, string>();
      const descPorNombre = new Map<string, string>();
      const codintPorNombre = new Map<string, string>();
      const idPorCodint = new Map<string, string>();
      const idPorNombre = new Map<string, string>();
      const costunitPorCodint = new Map<string, string>();
      const costunitPorNombre = new Map<string, string>();
      const descuentoPorCodint = new Map<string, string>();
      const descuentoPorNombre = new Map<string, string>();

      if (codints.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("id, codint, articulo, codprovsug, descripcion, costunit, descuento")
          .in("codint", codints);
        (data ?? []).forEach((row) => {
          codProvPorCodint.set(row.codint, row.codprovsug ?? "");
          if (row.descripcion) descPorCodint.set(row.codint, row.descripcion);
          if (row.id) idPorCodint.set(row.codint, row.id);
          if (row.costunit != null) costunitPorCodint.set(row.codint, String(row.costunit));
          if (row.descuento != null) descuentoPorCodint.set(row.codint, String(row.descuento));
        });
      }

      if (nombres.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("id, codint, articulo, codprovsug, descripcion, costunit, descuento")
          .in("articulo", nombres);
        (data ?? []).forEach((row) => {
          codProvPorNombre.set(row.articulo, row.codprovsug ?? "");
          if (row.descripcion) descPorNombre.set(row.articulo, row.descripcion);
          if (row.codint) codintPorNombre.set(row.articulo, row.codint);
          if (row.id) idPorNombre.set(row.articulo, row.id);
          if (row.costunit != null) costunitPorNombre.set(row.articulo, String(row.costunit));
          if (row.descuento != null) descuentoPorNombre.set(row.articulo, String(row.descuento));
        });
      }

      return articulos.map((art) => {
        const codint =
          art.codint ?? codintPorNombre.get(art.articulo) ?? undefined;
        const codprovsug =
          art.codprovsug?.trim() ||
          (codint ? codProvPorCodint.get(codint) : undefined) ||
          codProvPorNombre.get(art.articulo) ||
          "";
        const descripcion =
          art.descripcion?.trim() ||
          (codint ? descPorCodint.get(codint) : undefined) ||
          descPorNombre.get(art.articulo) ||
          art.descripcion;
        const articulo_db_id =
          (codint ? idPorCodint.get(codint) : undefined) ||
          idPorNombre.get(art.articulo) ||
          null;
        const costunit =
          (codint ? costunitPorCodint.get(codint) : undefined) ||
          costunitPorNombre.get(art.articulo) ||
          null;
        const descuento =
          (codint ? descuentoPorCodint.get(codint) : undefined) ||
          descuentoPorNombre.get(art.articulo) ||
          null;

        return { ...art, codint, codprovsug, descripcion, articulo_db_id, costunit, descuento };
      });
    },
    [supabase]
  );

  useEffect(() => {
    // Calcular total de la orden
    const total = itemsOrden.reduce((sum, item) => sum + item.total, 0);
    setTotalOrden(total);
  }, [itemsOrden]);

  // Sincronizar divisa de la orden con todos los artículos cuando cambia
  useEffect(() => {
    if (itemsOrden.length > 0) {
      const tieneOtroDivisa = itemsOrden.some(item => item.divisa !== formData.divisa);
      if (tieneOtroDivisa) {
        setItemsOrden(prev => prev.map(item => ({ ...item, divisa: formData.divisa })));
      }
    }
  }, [formData.divisa]);

  // Calcular ahorro: importe_competencia - total (positivo = ahorramos vs competencia)
  const ahorroCalculado = (() => {
    const impComp = parseNumero(formData.importe_competencia);
    if (impComp <= 0) return null;
    return impComp - totalOrden;
  })();

  const fetchProveedores = useCallback(async () => {
    try {
      console.log("🔍 Intentando obtener proveedores...");
      
      const { data, error } = await supabase
        .from("proveedor")
        .select("*");

      console.log("📊 Respuesta de Supabase proveedores:", { data, error });

      if (error) throw error;
      setProveedores(data || []);
      console.log("✅ Proveedores obtenidos:", data);
    } catch (err) {
      console.error("💥 Error en proveedores:", err);
      setError("Error al cargar los proveedores");
    }
  }, [supabase]);

  const fetchUltimoNOC = useCallback(async () => {
    try {
      console.log("🔍 Obteniendo último NOC...");
      
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("noc")
        .order("noc", { ascending: false })
        .limit(1);

      if (error) {
        console.error("❌ Error obteniendo último NOC:", error);
        // Si hay error, empezar desde 2000
        setFormData(prev => ({ ...prev, noc: "2000" }));
        return;
      }

      let siguienteNOC = 2000; // Valor por defecto
      
      if (data && data.length > 0) {
        const ultimoNOC = parseInt(data[0].noc);
        siguienteNOC = ultimoNOC + 1;
        console.log("✅ Último NOC encontrado:", ultimoNOC, "Siguiente:", siguienteNOC);
      } else {
        console.log("✅ No hay órdenes existentes, empezando desde 2000");
      }

      setFormData(prev => ({ ...prev, noc: siguienteNOC.toString() }));
    } catch (err) {
      console.error("💥 Error obteniendo último NOC:", err);
      // En caso de error, usar 2000 como fallback
      setFormData(prev => ({ ...prev, noc: "2000" }));
    }
  }, [supabase]);

  const fetchArticulosAprobados = useCallback(async () => {
    try {
      console.log("🔍 Intentando obtener artículos aprobados...");
      
      // Obtener artículos aprobados de pedidos productivos
      const { data: articulosProductivosData, error: articulosProductivosError } = await supabase
        .from("pedidos_productivos")
        .select("*")
        .eq("estado", "aprobado");

      if (articulosProductivosError) {
        console.error("❌ Error obteniendo artículos productivos:", articulosProductivosError);
        throw articulosProductivosError;
      }

      // Obtener artículos aprobados de pedidos generales (tabla pic)
      const { data: articulosGeneralesData, error: articulosGeneralesError } = await supabase
        .from("pic")
        .select("*")
        .eq("estado", "aprobado");

      if (articulosGeneralesError) {
        console.error("❌ Error obteniendo artículos generales:", articulosGeneralesError);
        throw articulosGeneralesError;
      }

      // Obtener órdenes de compra existentes
      const { data: ordenesData, error: ordenesError } = await supabase
        .from("ordenes_compra")
        .select("articulos");

      if (ordenesError) {
        console.error("❌ Error obteniendo órdenes:", ordenesError);
        throw ordenesError;
      }

      // Extraer IDs de artículos ya usados en órdenes
      const articulosUsados = new Set<string>();
      ordenesData?.forEach(orden => {
        if (orden.articulos) {
          orden.articulos.forEach((item: ArticuloOrden) => {
            articulosUsados.add(item.articulo_id);
          });
        }
      });

      console.log("📋 Artículos ya usados:", Array.from(articulosUsados));
      
      // Procesar artículos de pedidos productivos
      const articulosProductivosProcesados = articulosProductivosData?.flatMap(pedido => 
        pedido.articulos?.map((articulo: ArticuloPedido, index: number) => ({
          id: `productivo-${pedido.id}-${index}-${articulo.articulo}`,
          pedido_id: pedido.id, // ID del pedido original
          articulo: articulo.articulo,
          descripcion: articulo.descripcion,
          cantidad: articulo.cant,
          cant_exist: articulo.cant_exist,
          observacion: articulo.observacion,
          codint: articulo.codint,
          codprovsug: articulo.codprovsug,
          categoria: pedido.categoria,
          sector: pedido.sector,
          solicita: pedido.solicita,
          aprueba: pedido.aprueba,
          necesidad: pedido.necesidad,
          estado: pedido.estado,
          origen: 'productivo' as const
        })) || []
      ) || [];

      // Procesar artículos de pedidos generales (tabla pic)
      const articulosGeneralesProcesados = articulosGeneralesData?.flatMap(pedido => 
        pedido.articulos?.map((articulo: ArticuloPedido, index: number) => ({
          id: `general-${pedido.id}-${index}-${articulo.articulo}`,
          pedido_id: pedido.id, // ID del pedido original
          articulo: articulo.articulo,
          descripcion: articulo.descripcion,
          cantidad: articulo.cant,
          cant_exist: articulo.cant_exist,
          observacion: articulo.observacion || '',
          categoria: pedido.categoria,
          sector: pedido.sector,
          solicita: pedido.solicita,
          aprueba: pedido.aprueba,
          necesidad: pedido.necesidad,
          estado: pedido.estado,
          origen: 'general' as const
        })) || []
      ) || [];
      
      // Combinar ambos tipos de artículos
      const todosLosArticulos = [...articulosProductivosProcesados, ...articulosGeneralesProcesados];
      
      // Filtrar artículos que ya están en órdenes
      const articulosDisponibles = todosLosArticulos.filter(
        articulo => !articulosUsados.has(articulo.id)
      );

      const articulosEnriquecidos = await enriquecerArticulosConCatalogo(articulosDisponibles);
      
      console.log("✅ Artículos productivos procesados:", articulosProductivosProcesados);
      console.log("✅ Artículos generales procesados:", articulosGeneralesProcesados);
      console.log("✅ Artículos disponibles (filtrados):", articulosEnriquecidos);
      
      setArticulosAprobados(articulosEnriquecidos);
    } catch (err) {
      console.error("💥 Error completo:", err);
      setError("Error al cargar los artículos aprobados: " + (err as Error).message);
    }
  }, [supabase, enriquecerArticulosConCatalogo]);

  useEffect(() => {
    fetchProveedores();
    fetchArticulosAprobados();
    fetchUltimoNOC();
  }, [fetchProveedores, fetchArticulosAprobados, fetchUltimoNOC]);

  useEffect(() => {
    const term = busquedaArticuloCatalogo.trim();
    if (term.length < 2) {
      setArticulosCatalogo([]);
      setBuscandoCatalogo(false);
      return;
    }

    setBuscandoCatalogo(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("articulos")
        .select("id,codint,articulo,descripcion,codprovsug,costunit,descuento,costunitcdesc,divisa")
        .or(`codint.ilike.%${term}%,articulo.ilike.%${term}%`)
        .limit(15);

      if (error) {
        console.error("Error buscando artículos en catálogo:", error);
        setArticulosCatalogo([]);
        setBuscandoCatalogo(false);
        return;
      }

      setArticulosCatalogo((data as ArticuloCatalogo[]) || []);
      setBuscandoCatalogo(false);
    }, 250);

    return () => clearTimeout(t);
  }, [busquedaArticuloCatalogo, supabase]);

  const handleCuitChange = (valor: string) => {
    setFormData({ ...formData, cuit_proveedor: valor });
    
    // Buscar proveedor por CUIT o por nombre
    const proveedor = proveedores.find(p => 
      p.cuitprov.toString() === valor || 
      p.nombreprov.toLowerCase().includes(valor.toLowerCase())
    );
    
    if (proveedor) {
      setProveedorSeleccionado(proveedor);
    } else {
      setProveedorSeleccionado(null);
    }
  };

  const obtenerPrecioCatalogo = async (
    articulo: ArticuloAprobado
  ): Promise<{ articulo_db_id: string | null; costunit: string | null; descuento: string | null }> => {
    if (articulo.costunit != null || articulo.articulo_db_id) {
      return {
        articulo_db_id: articulo.articulo_db_id ?? null,
        costunit: articulo.costunit ?? null,
        descuento: articulo.descuento ?? null,
      };
    }

    let query = supabase
      .from("articulos")
      .select("id, costunit, descuento");

    if (articulo.codint) {
      query = query.eq("codint", articulo.codint);
    } else {
      query = query.eq("articulo", articulo.articulo);
    }

    const { data } = await query.maybeSingle();
    return {
      articulo_db_id: data?.id ?? null,
      costunit: data?.costunit != null ? String(data.costunit) : null,
      descuento: data?.descuento != null ? String(data.descuento) : null,
    };
  };

  const handleAgregarArticulo = async (articulo: ArticuloAprobado) => {
    if (itemsOrden.some(item => item.articulo_id === articulo.id)) {
      setError("Este artículo ya está en la orden");
      return;
    }

    const catalogo = await obtenerPrecioCatalogo(articulo);
    const precioUnit = parseNumero(String(catalogo.costunit ?? "0"));
    const desc = parseNumero(String(catalogo.descuento ?? "0"));
    const precioConDescuento = calcularPrecioConDescuento(precioUnit, desc);

    const nuevoItem: ItemOrden = {
      articulo_id: articulo.id,
      articulo_nombre: articulo.articulo,
      articulo_db_id: catalogo.articulo_db_id,
      codint: articulo.codint ?? null,
      descripcion: articulo.descripcion?.trim() || null,
      codprovsug: articulo.codprovsug?.trim() || null,
      cantidad: articulo.cantidad,
      precio_unitario: precioUnit,
      descuento: desc,
      costunitcdesc: precioConDescuento,
      divisa: formData.divisa,
      total: articulo.cantidad * precioConDescuento,
    };

    setItemsOrden([...itemsOrden, nuevoItem]);
    setError(null);
  };

  const handleRemoverArticulo = (articuloId: string) => {
    setItemsOrden(itemsOrden.filter(item => item.articulo_id !== articuloId));
    setCantidadEdicion((prev) => {
      const next = { ...prev };
      delete next[articuloId];
      return next;
    });
    setPrecioEdicion((prev) => {
      const next = { ...prev };
      delete next[articuloId];
      return next;
    });
  };

  const handleAgregarArticuloSinPic = () => {
    const nombre = articuloSinPic.nombre.trim();
    if (!nombre) {
      setError("Debe ingresar el nombre del artículo");
      return;
    }
    const cantidad = parseCantidadDecimal(articuloSinPic.cantidad);
    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    const idUnico = `sin-pic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const precioUnitario = parseCantidadDecimal(articuloSinPic.precio_unitario);
    const precioConDescuento = calcularPrecioConDescuento(precioUnitario, articuloSinPic.descuento);
    const nuevoItem: ItemOrden = {
      articulo_id: idUnico,
      articulo_nombre: nombre,
      articulo_db_id: null,
      codint: null,
      cantidad,
      precio_unitario: precioUnitario,
      descuento: articuloSinPic.descuento,
      costunitcdesc: precioConDescuento,
      divisa: formData.divisa,
      total: cantidad * precioConDescuento
    };
    setItemsOrden([...itemsOrden, nuevoItem]);
    setArticuloSinPic({ nombre: "", cantidad: "1", precio_unitario: "0", descuento: 0 });
    setMostrarFormSinPic(false);
    setError(null);
  };

  const handleAgregarArticuloDesdeCatalogo = (art: ArticuloCatalogo) => {
    // Evitar duplicados por id real
    if (itemsOrden.some((i) => i.articulo_db_id && i.articulo_db_id === art.id)) {
      setError("Este artículo ya está en la orden");
      return;
    }

    const precioUnit = parseNumero(String(art.costunit ?? "0"));
    const desc = parseNumero(String(art.descuento ?? "0"));
    const precioConDescuento = calcularPrecioConDescuento(precioUnit, desc);

    const nuevoItem: ItemOrden = {
      articulo_id: `catalogo-${art.id}`,
      articulo_nombre: art.articulo,
      articulo_db_id: art.id,
      codint: art.codint ?? null,
      descripcion: art.descripcion?.trim() || null,
      codprovsug: art.codprovsug?.trim() || null,
      cantidad: 1,
      precio_unitario: precioUnit,
      descuento: desc,
      costunitcdesc: precioConDescuento,
      divisa: formData.divisa,
      total: 1 * precioConDescuento,
    };

    setItemsOrden((prev) => [...prev, nuevoItem]);
    setError(null);
  };

  const handleCantidadChange = (articuloId: string, nuevaCantidad: number) => {
    setItemsOrden(itemsOrden.map(item => {
      if (item.articulo_id === articuloId) {
        const precioConDescuento = calcularPrecioConDescuento(item.precio_unitario, item.descuento);
        return {
          ...item,
          cantidad: nuevaCantidad,
          costunitcdesc: precioConDescuento,
          total: nuevaCantidad * precioConDescuento
        };
      }
      return item;
    }));
  };

  const handlePrecioChange = (articuloId: string, nuevoPrecio: number) => {
    setItemsOrden(itemsOrden.map(item => {
      if (item.articulo_id === articuloId) {
        const precioConDescuento = calcularPrecioConDescuento(nuevoPrecio, item.descuento);
        return {
          ...item,
          precio_unitario: nuevoPrecio,
          costunitcdesc: precioConDescuento,
          total: item.cantidad * precioConDescuento
        };
      }
      return item;
    }));
  };

  const handleDescuentoChange = (articuloId: string, nuevoDescuento: number) => {
    setItemsOrden(itemsOrden.map(item => {
      if (item.articulo_id === articuloId) {
        const precioConDescuento = calcularPrecioConDescuento(item.precio_unitario, nuevoDescuento);
        return {
          ...item,
          descuento: nuevoDescuento,
          costunitcdesc: precioConDescuento,
          total: item.cantidad * precioConDescuento
        };
      }
      return item;
    }));
  };

  const actualizarArticulos = async () => {
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
      itemsOrden
        .filter((item) => !item.articulo_id.startsWith("sin-pic-"))
        .map((item) => {
          const precioConDescuento = calcularPrecioConDescuento(
            item.precio_unitario,
            item.descuento
          );
          const query = supabase
            .from("articulos")
            .update({
              costunit: item.precio_unitario,
              descuento: item.descuento,
              divisa: item.divisa,
              costunitcdesc: precioConDescuento,
              updated_at: new Date().toISOString(),
              ultimo_prov: proveedorSeleccionado?.nombreprov ?? null,
              update_usuario: updateUsuario,
            });

          if (item.articulo_db_id) {
            return query.eq("id", item.articulo_db_id);
          }

          return query.eq("articulo", item.articulo_nombre);
        })
    );

    const errorActualizacion = resultados.find((res) => res.error)?.error;
    if (errorActualizacion) {
      throw errorActualizacion;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proveedorSeleccionado) {
      setError("Debe seleccionar un proveedor válido");
      return;
    }

    if (!formData.lugar_entrega) {
      setError("Debe seleccionar un lugar de entrega");
      return;
    }

    if (!formData.sector) {
      setError("Debe seleccionar un sector");
      return;
    }

    if (!formData.cod_cta || formData.cod_cta.trim() === "") {
      setError("Debe ingresar un código de cuenta");
      return;
    }

    if (!formData.condicion_pago) {
      setError("Debe seleccionar una condición de pago");
      return;
    }

    if (!formData.noc || formData.noc.trim() === "") {
      setError("Error: No se pudo generar el número de orden de compra");
      return;
    }

    if (itemsOrden.length === 0) {
      setError("Debe agregar al menos un artículo a la orden");
      return;
    }

    if (itemsOrden.some((item) => item.cantidad <= 0)) {
      setError("Todos los artículos deben tener una cantidad mayor a 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const divisa = (formData.divisa === "EUR" || formData.divisa === "ARS") ? formData.divisa : "USD";
      const insertData = {
        divisa,
        cuit: proveedorSeleccionado.cuitprov.toString(),
        proveedor: proveedorSeleccionado.nombreprov,
        direccion: proveedorSeleccionado.direccionprov,
        telefono: proveedorSeleccionado.telefonoprov.toString(),
        lugar_entrega: formData.lugar_entrega,
        sector: formData.sector,
        cod_cta: formData.cod_cta,
        condicion_pago: formData.condicion_pago,
        tipo_pago: formData.tipo_pago || null,
        condi_proceso: formData.condi_proceso || null,
        noc: formData.noc,
        total: totalOrden,
        importe_competencia: parseNumero(formData.importe_competencia),
        ahorro: ahorroCalculado ?? 0,
        observaciones: formData.observaciones.trim() === "" ? "-" : formData.observaciones,
        articulos: itemsOrden,
        estado: formData.estado,
      };
      const { error } = await supabase
        .from("ordenes_compra")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      try {
        await actualizarArticulos();
      } catch (updateError) {
        console.error("Error actualizando artículos:", updateError);
        setError("Orden creada, pero no se pudieron actualizar los artículos");
        return;
      }

      setSuccess("Orden de compra creada exitosamente");
      setTimeout(() => {
        router.push("/auth/ordenes-compra");
      }, 2000);

    } catch (err) {
      console.error("Error creating orden:", err);
      setError("Error al crear la orden de compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">📋 Crear Nueva Orden de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información del Proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cuit_proveedor">CUIT del Proveedor *</Label>
                <Input
                  id="cuit_proveedor"
                  type="text"
                  value={formData.cuit_proveedor}
                  onChange={(e) => handleCuitChange(e.target.value)}
                  placeholder="Ingrese CUIT o nombre del proveedor"
                  required
                />
                {proveedores.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600">Proveedores disponibles:</Label>
                    <div className="mt-1 space-y-1">
                      {proveedores
                        .filter(prov => 
                          !formData.cuit_proveedor || 
                          prov.cuitprov.toString().includes(formData.cuit_proveedor) ||
                          prov.nombreprov.toLowerCase().includes(formData.cuit_proveedor.toLowerCase())
                        )
                        .map((prov) => (
                         <div
                           key={prov.id}
                           className={`p-2 rounded cursor-pointer text-sm ${
                             formData.cuit_proveedor === prov.cuitprov.toString() || 
                             formData.cuit_proveedor === prov.nombreprov
                               ? "bg-blue-100 border border-blue-300"
                               : "bg-gray-50 hover:bg-gray-100"
                           }`}
                           onClick={() => handleCuitChange(prov.cuitprov.toString())}
                         >
                           <strong>{prov.cuitprov}</strong> - {prov.nombreprov}
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>

                             {proveedorSeleccionado && (
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                   <h4 className="font-semibold text-green-800 mb-2">✅ Proveedor Seleccionado</h4>
                   <p><strong>Nombre:</strong> {proveedorSeleccionado.nombreprov}</p>
                   <p><strong>Dirección:</strong> {proveedorSeleccionado.direccionprov}</p>
                   <p><strong>Teléfono:</strong> {proveedorSeleccionado.telefonoprov}</p>
                   <p><strong>Email:</strong> {proveedorSeleccionado.emailprov}</p>
                 </div>
               )}
            </div>

            {/* Lugar de Entrega */}
            <div>
              <Label htmlFor="lugar_entrega">Lugar de Entrega *</Label>
              <select
                id="lugar_entrega"
                value={formData.lugar_entrega}
                onChange={(e) => setFormData({ ...formData, lugar_entrega: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
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

            {/* Sector */}
            <div>
              <Label htmlFor="sector">Sector *</Label>
              <select
                id="sector"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccione el sector</option>
                {SECTORES.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector === "Administracion" ? "Administración" : sector}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                🏭 Todos los sectores disponibles
              </p>
            </div>

            {/* Divisa de la orden */}
            <div>
              <Label htmlFor="divisa_orden">Divisa de la Orden</Label>
              <select
                id="divisa_orden"
                name="divisa"
                value={formData.divisa}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "USD" || val === "EUR" || val === "ARS") {
                    setFormData(prev => ({ ...prev, divisa: val }));
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                💱 Los artículos que agregues usarán esta divisa por defecto
              </p>
            </div>

            {/* Código de Cuenta */}
            <div>
              <Label htmlFor="cod_cta">Código de Cuenta *</Label>
              <select
                id="cod_cta"
                value={formData.cod_cta}
                onChange={(e) => setFormData({ ...formData, cod_cta: e.target.value })}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <option value="2114 MAQ EQUIP Y HERRAM REPAR COLOC">2114 MAQ EQUIP Y HERRAM REPAR COLOC</option>
                <option value="2404 HERRAJES GASCON">2404 HERRAJES GASCON</option>
                <option value="2408 SILICONA SELLADORES ESPUMA GASCON">2408 SILICONA SELLADORES ESPUMA GASCON</option>
                <option value="2412 TORNILLERIA GASCON">2412 TORNILLERIA GASCON</option>
                <option value="2414 BURLETE GASCON">2414 BURLETE GASCON</option>
                <option value="2415 FELPA Y CORDON GASCON">2415 FELPA Y CORDON GASCON</option>
                <option value="2528 FERRET INSUMOS GASCON">2528 FERRET INSUMOS GASCON</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                💳 Código de cuenta para la orden de compra
              </p>
            </div>

            {/* Condición de Pago */}
            <div>
              <Label htmlFor="condicion_pago">Condición de Pago *</Label>
              <select
                id="condicion_pago"
                value={formData.condicion_pago}
                onChange={(e) => setFormData({ ...formData, condicion_pago: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
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
                <option value="ECHEQ 15 DIAS FF">ECHEQ 15 DIAS FF</option>
                <option value="PAGO ANTICIPADO">PAGO ANTICIPADO</option>
                <option value="PAGO CONTRA ENTREGA">PAGO CONTRA ENTREGA</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                💳 Seleccione la forma de pago para la orden de compra
              </p>
            </div>

            {/* Tipo de Pago */}
            <div>
              <Label htmlFor="tipo_pago">Tipo de Pago</Label>
              <select
                id="tipo_pago"
                value={formData.tipo_pago}
                onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione tipo de pago</option>
                <option value="CTA A">CTA A</option>
                <option value="CTA B">CTA B</option>
                <option value="MERCADO LIBRE">MERCADO LIBRE</option>
              </select>
            </div>

            {/* Condición de Proceso */}
            <div>
              <Label htmlFor="condi_proceso">Condición de Proceso</Label>
              <select
                id="condi_proceso"
                value={formData.condi_proceso}
                onChange={(e) => setFormData({ ...formData, condi_proceso: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione condición de proceso</option>
                <option value="Bajo proceso">Bajo proceso</option>
                <option value="Fuera de proceso">Fuera de proceso</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            {/* Número de Orden de Compra */}
            <div>
              <Label htmlFor="noc">Número de Orden de Compra *</Label>
              <Input
                id="noc"
                type="number"
                value={formData.noc}
                readOnly
                placeholder="Se genera automáticamente"
                className="w-full bg-gray-100 cursor-not-allowed [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
             
            </div>

            {/* Botón y formulario para agregar artículo sin PIC */}
            <div className="border border-dashed border-amber-300 rounded-lg p-4 bg-amber-50/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMostrarFormSinPic(!mostrarFormSinPic);
                  if (!mostrarFormSinPic) setArticuloSinPic(prev => ({ ...prev }));
                }}
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                {mostrarFormSinPic ? "✖ Cerrar" : "➕ Agregar artículo sin PIC"}
              </Button>
              <p className="text-sm text-amber-700 mt-1">Orden de compra no vinculada a pedido (PIC)</p>
              {mostrarFormSinPic && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200 space-y-4">
                  <div>
                    <Label htmlFor="nombre-sin-pic">Nombre del artículo *</Label>
                    <Input
                      id="nombre-sin-pic"
                      type="text"
                      value={articuloSinPic.nombre}
                      onChange={(e) => setArticuloSinPic(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Tornillo M8 x 50"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="cant-sin-pic">Cantidad *</Label>
                      <Input
                        id="cant-sin-pic"
                        type="text"
                        inputMode="decimal"
                        value={articuloSinPic.cantidad}
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (!esEntradaDecimalValida(valor)) return;
                          setArticuloSinPic(prev => ({ ...prev, cantidad: valor }));
                        }}
                        onBlur={() => {
                          setArticuloSinPic(prev => ({
                            ...prev,
                            cantidad: String(parseCantidadDecimal(prev.cantidad) || ""),
                          }));
                        }}
                        placeholder="Ej: 1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="precio-sin-pic">Precio unitario</Label>
                      <Input
                        id="precio-sin-pic"
                        type="text"
                        inputMode="decimal"
                        value={articuloSinPic.precio_unitario}
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (!esEntradaDecimalValida(valor)) return;
                          setArticuloSinPic(prev => ({ ...prev, precio_unitario: valor }));
                        }}
                        onBlur={() => {
                          setArticuloSinPic(prev => ({
                            ...prev,
                            precio_unitario: String(parseCantidadDecimal(prev.precio_unitario)),
                          }));
                        }}
                        placeholder="Ej: 10.50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc-sin-pic">Descuento %</Label>
                      <Input
                        id="desc-sin-pic"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={articuloSinPic.descuento}
                        onChange={(e) => setArticuloSinPic(prev => ({ ...prev, descuento: parseNumero(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Divisa</Label>
                      <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium">
                        {formData.divisa}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAgregarArticuloSinPic}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    ✅ Agregar a la orden
                  </Button>
                </div>
              )}
            </div>

            {/* Agregar artículo productivo desde catálogo (tabla articulos) */}
            <div className="border border-dashed border-sky-300 rounded-lg p-4 bg-sky-50/50">
              <Label className="text-sm font-semibold">Agregar artículo productivo (catálogo)</Label>
              <p className="text-xs text-sky-700 mt-1">
                Tipiá <strong>código interno</strong> o <strong>nombre</strong>. Se extrae de la tabla <strong>articulos</strong>.
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="busqueda-articulo-catalogo">Buscar</Label>
                  <Input
                    id="busqueda-articulo-catalogo"
                    type="text"
                    value={busquedaArticuloCatalogo}
                    onChange={(e) => setBusquedaArticuloCatalogo(e.target.value)}
                    placeholder="Ej: 1416 o BURLETE"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {buscandoCatalogo ? "Buscando..." : "Mínimo 2 caracteres"}
                  </p>
                </div>
              </div>

              {articulosCatalogo.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {articulosCatalogo.map((a) => {
                    const yaAgregado = itemsOrden.some((i) => i.articulo_db_id === a.id);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-sky-200">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{a.articulo}</span>
                            {a.codint && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-800">
                                CodInt: {a.codint}
                              </span>
                            )}
                          </div>
                          {a.descripcion && (
                            <p className="text-xs text-gray-500 mt-1">Descripción: {a.descripcion}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            Cod. prov. sug.: {a.codprovsug?.trim() ? a.codprovsug : "-"}
                          </p>
                          {a.costunit != null && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              Precio: {parseNumero(String(a.costunit)).toLocaleString("es-AR")}
                              {a.descuento && parseNumero(String(a.descuento)) > 0
                                ? ` (desc. ${a.descuento}%)`
                                : ""}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleAgregarArticuloDesdeCatalogo(a)}
                          className="bg-sky-600 hover:bg-sky-700"
                          disabled={yaAgregado}
                        >
                          {yaAgregado ? "✅ Agregado" : "➕ Agregar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Artículos Aprobados */}
            <div>
              <Label className="text-lg font-semibold">Artículos Aprobados Disponibles</Label>
              <div className="mt-3 grid gap-3">
                                 {articulosAprobados.map((articulo) => (
                   <div key={articulo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <h4 className="font-medium">{articulo.articulo}</h4>
                         <span className={`px-2 py-1 text-xs rounded-full ${
                           articulo.origen === 'productivo' 
                             ? 'bg-blue-100 text-blue-800' 
                             : 'bg-green-100 text-green-800'
                         }`}>
                           {articulo.origen === 'productivo' ? '🏭 Productivo' : '📋 General'}
                         </span>
                         <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                           ID Artículo: {articulo.id}
                         </span>
                         <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                           ID Pedido: {articulo.pedido_id}
                         </span>
                       </div>
                       <p className="text-sm text-gray-600">
                         Cantidad: {articulo.cantidad} | Categoría: {articulo.categoria} | 
                         Sector: {articulo.sector} | Solicita: {articulo.solicita}
                       </p>
                       {articulo.descripcion && (
                         <p className="text-xs text-gray-500 mt-1">
                           Descripción: {articulo.descripcion}
                         </p>
                       )}
                       <p className="text-xs text-gray-500 mt-0.5">
                         Cod. prov. sug.:{" "}
                         {articulo.codprovsug?.trim() ? articulo.codprovsug : "-"}
                       </p>
                       {articulo.costunit != null && (
                         <p className="text-xs text-gray-600 mt-0.5">
                           Precio catálogo:{" "}
                           {parseNumero(String(articulo.costunit)).toLocaleString("es-AR")}
                           {articulo.descuento && parseNumero(String(articulo.descuento)) > 0
                             ? ` (desc. ${articulo.descuento}%)`
                             : ""}
                         </p>
                       )}
                       {articulo.observacion && (
                         <p className="text-xs text-gray-500 mt-1">
                           Observación: {articulo.observacion}
                         </p>
                       )}
                     </div>
                     <Button
                       type="button"
                       onClick={() => handleAgregarArticulo(articulo)}
                       className="bg-blue-600 hover:bg-blue-700"
                       disabled={itemsOrden.some(item => item.articulo_id === articulo.id)}
                     >
                       {itemsOrden.some(item => item.articulo_id === articulo.id) ? "✅ Agregado" : "➕ Agregar"}
                     </Button>
                   </div>
                 ))}
              </div>
            </div>

            {/* Artículos de la Orden */}
            {itemsOrden.length > 0 && (
              <div>
                <Label className="text-lg font-semibold">Artículos de la Orden</Label>
                <div className="mt-3 space-y-3">
                  {itemsOrden.map((item) => (
                    <div key={item.articulo_id} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.articulo_nombre}</h4>
                          {item.codint && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-800">
                              CodInt: {item.codint}
                            </span>
                          )}
                          {item.articulo_id.startsWith("sin-pic-") && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">Sin PIC</span>
                          )}
                        </div>
                        {item.descripcion && (
                          <p className="text-sm text-gray-600 mt-1">
                            Descripción: {item.descripcion}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-0.5">
                          Cod. prov. sug.:{" "}
                          {item.codprovsug?.trim() ? item.codprovsug : "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-sm">Cantidad</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={cantidadEdicion[item.articulo_id] ?? String(item.cantidad)}
                            onChange={(e) => {
                              const valor = e.target.value;
                              if (!esEntradaDecimalValida(valor)) return;
                              setCantidadEdicion((prev) => ({ ...prev, [item.articulo_id]: valor }));
                              handleCantidadChange(
                                item.articulo_id,
                                parseCantidadDecimal(valor)
                              );
                            }}
                            onBlur={(e) => {
                              const cantidad = parseCantidadDecimal(e.target.value);
                              handleCantidadChange(item.articulo_id, cantidad);
                              setCantidadEdicion((prev) => {
                                const next = { ...prev };
                                delete next[item.articulo_id];
                                return next;
                              });
                            }}
                            placeholder="0.00"
                            className="w-24"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Precio Unit.</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={precioEdicion[item.articulo_id] ?? String(item.precio_unitario)}
                            onChange={(e) => {
                              const valor = e.target.value;
                              if (!esEntradaDecimalValida(valor)) return;
                              setPrecioEdicion((prev) => ({ ...prev, [item.articulo_id]: valor }));
                              handlePrecioChange(
                                item.articulo_id,
                                parseCantidadDecimal(valor)
                              );
                            }}
                            onBlur={(e) => {
                              const precio = parseCantidadDecimal(e.target.value);
                              handlePrecioChange(item.articulo_id, precio);
                              setPrecioEdicion((prev) => {
                                const next = { ...prev };
                                delete next[item.articulo_id];
                                return next;
                              });
                            }}
                            placeholder="0.00"
                            className="w-24"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Descuento %</Label>
                          <Input
                            type="number"
                            value={item.descuento}
                            onChange={(e) => handleDescuentoChange(item.articulo_id, parseNumero(e.target.value))}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-24"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Divisa</Label>
                          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium w-20">
                            {formData.divisa}
                          </div>
                        </div>
                        <div className="text-right">
                          <Label className="text-sm">Unit. c/ desc.</Label>
                          <p className="font-semibold">
                            ${calcularPrecioConDescuento(item.precio_unitario, item.descuento).toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Label className="text-sm">Total</Label>
                          <p className="font-semibold text-lg">${item.total.toLocaleString('es-AR')}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoverArticulo(item.articulo_id)}
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          ❌
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total y Observaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-lg mb-2">Resumen de la Orden</h4>
                <p><strong>Total de Artículos:</strong> {itemsOrden.length}</p>
                <div className="flex items-center gap-2">
                  <p><strong>Total de la Orden:</strong></p>
                  <span className="font-medium">{formData.divisa}</span>
                  <span className="text-2xl font-bold text-green-600">${totalOrden.toLocaleString('es-AR')}</span>
                </div>
                <div>
                  <Label htmlFor="importe_competencia" className="text-sm text-gray-600">Importe competencia</Label>
                  <Input
                    id="importe_competencia"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.importe_competencia}
                    onChange={(e) => setFormData({ ...formData, importe_competencia: e.target.value })}
                    placeholder="Precio que cobraría la competencia"
                    className="mt-1"
                  />
                  {ahorroCalculado !== null && (
                    <p className="mt-1 text-sm">
                      <strong>Ahorro:</strong>{" "}
                      <span className={ahorroCalculado >= 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                        ${ahorroCalculado.toLocaleString('es-AR')}
                        {ahorroCalculado >= 0 ? " (vs competencia)" : ""}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mensajes de Error y Éxito */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600">{success}</p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || !proveedorSeleccionado || itemsOrden.length === 0 || !formData.sector || !formData.cod_cta || !formData.condicion_pago}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                {loading ? "Creando..." : "✅ Crear Orden de Compra"}
              </Button>
              
              <Button
                type="button"
                onClick={() => router.push("/auth/ordenes-compra")}
                variant="outline"
                className="flex-1"
              >
                🔙 Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
