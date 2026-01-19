"use client";

import { useState, useEffect } from "react";
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
}

interface ItemOrden {
  articulo_id: string;
  articulo_nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number; // porcentaje 0-100
  costunitcdesc: number;
  divisa: "USD" | "EUR" | "ARS";
  total: number;
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
}

export function CrearFormOrdenCompra() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [articulosAprobados, setArticulosAprobados] = useState<ArticuloAprobado[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [itemsOrden, setItemsOrden] = useState<ItemOrden[]>([]);
  const [totalOrden, setTotalOrden] = useState(0);
  const [sectoresDisponibles, setSectoresDisponibles] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    cuit_proveedor: "",
    observaciones: "",
    estado: "pendiente",
    lugar_entrega: "",
    noc: "",
    sector: "",
    cod_cta: "",
    condicion_pago: ""
  });

  const router = useRouter();
  const supabase = createClient();

  const parseNumero = (valor: string) => {
    const normalizado = valor.replace(",", ".");
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? 0 : numero;
  };

  const calcularPrecioConDescuento = (precio: number, descuento: number) => {
    const descuentoNormalizado = Math.min(Math.max(descuento, 0), 100);
    return precio - (precio * descuentoNormalizado) / 100;
  };

  useEffect(() => {
    fetchProveedores();
    fetchArticulosAprobados();
    fetchUltimoNOC();
  }, []);

  useEffect(() => {
    // Calcular total de la orden
    const total = itemsOrden.reduce((sum, item) => sum + item.total, 0);
    setTotalOrden(total);
  }, [itemsOrden]);

  const fetchProveedores = async () => {
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
  };

  const fetchUltimoNOC = async () => {
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
  };

  const fetchArticulosAprobados = async () => {
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
        pedido.articulos?.map((articulo: ArticuloPedido) => ({
          id: `productivo-${pedido.id}-${articulo.articulo}`, // ID único con prefijo
          pedido_id: pedido.id, // ID del pedido original
          articulo: articulo.articulo,
          descripcion: articulo.descripcion,
          cantidad: articulo.cant,
          cant_exist: articulo.cant_exist,
          observacion: articulo.observacion,
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
        pedido.articulos?.map((articulo: ArticuloPedido) => ({
          id: `general-${pedido.id}-${articulo.articulo}`, // ID único con prefijo
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
      
      console.log("✅ Artículos productivos procesados:", articulosProductivosProcesados);
      console.log("✅ Artículos generales procesados:", articulosGeneralesProcesados);
      console.log("✅ Artículos disponibles (filtrados):", articulosDisponibles);
      
      // Extraer sectores únicos de los artículos disponibles
      const sectoresUnicos = [...new Set(articulosDisponibles.map(articulo => articulo.sector))].filter(sector => sector && sector.trim() !== '');
      setSectoresDisponibles(sectoresUnicos);
      console.log("✅ Sectores disponibles:", sectoresUnicos);
      
      setArticulosAprobados(articulosDisponibles);
    } catch (err) {
      console.error("💥 Error completo:", err);
      setError("Error al cargar los artículos aprobados: " + (err as Error).message);
    }
  };

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

  const handleAgregarArticulo = (articulo: ArticuloAprobado) => {
    // Verificar si el artículo ya está en la orden
    if (itemsOrden.some(item => item.articulo_id === articulo.id)) {
      setError("Este artículo ya está en la orden");
      return;
    }

    const nuevoItem: ItemOrden = {
      articulo_id: articulo.id,
      articulo_nombre: articulo.articulo,
      cantidad: articulo.cantidad,
      precio_unitario: 0, // Precio por defecto, se puede editar después
      descuento: 0,
      costunitcdesc: 0,
      divisa: "USD",
      total: 0
    };

    setItemsOrden([...itemsOrden, nuevoItem]);
    setError(null);
  };

  const handleRemoverArticulo = (articuloId: string) => {
    setItemsOrden(itemsOrden.filter(item => item.articulo_id !== articuloId));
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
    const resultados = await Promise.all(
      itemsOrden.map((item) => {
        const precioConDescuento = calcularPrecioConDescuento(
          item.precio_unitario,
          item.descuento
        );
        return supabase
          .from("articulos")
          .update({
            costunit: item.precio_unitario,
            descuento: item.descuento,
            divisa: item.divisa,
            costunitcdesc: precioConDescuento,
            updated_at: new Date().toISOString(),
            ultimo_prov: proveedorSeleccionado?.nombreprov ?? null,
          })
          .eq("articulo", item.articulo_nombre);
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

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("ordenes_compra")
        .insert({
          cuit: proveedorSeleccionado.cuitprov.toString(),
          proveedor: proveedorSeleccionado.nombreprov,
          direccion: proveedorSeleccionado.direccionprov,
          telefono: proveedorSeleccionado.telefonoprov.toString(),
          lugar_entrega: formData.lugar_entrega,
          sector: formData.sector,
          cod_cta: formData.cod_cta,
          condicion_pago: formData.condicion_pago,
          noc: formData.noc,
          total: totalOrden,
          observaciones: formData.observaciones.trim() === "" ? "-" : formData.observaciones,
          articulos: itemsOrden,
          estado: formData.estado,
        })
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
                {sectoresDisponibles.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                🏭 Sectores disponibles de los artículos aprobados
              </p>
            </div>

            {/* Código de Cuenta */}
            <div>
              <Label htmlFor="cod_cta">Código de Cuenta *</Label>
              <Input
                id="cod_cta"
                type="text"
                value={formData.cod_cta}
                onChange={(e) => setFormData({ ...formData, cod_cta: e.target.value })}
                placeholder="Ingrese el código de cuenta"
                required
                className="w-full"
              />
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
                        <h4 className="font-medium">{item.articulo_nombre}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-sm">Cantidad</Label>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleCantidadChange(item.articulo_id, parseInt(e.target.value))}
                            min="1"
                            className="w-20"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Precio Unit.</Label>
                          <Input
                            type="number"
                            value={item.precio_unitario}
                            onChange={(e) => handlePrecioChange(item.articulo_id, parseNumero(e.target.value))}
                            min="0"
                            step="0.01"
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
                          <select
                            value={item.divisa}
                            onChange={(e) =>
                              setItemsOrden(itemsOrden.map(current =>
                                current.articulo_id === item.articulo_id
                                  ? { ...current, divisa: e.target.value as ItemOrden["divisa"] }
                                  : current
                              ))
                            }
                            className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="ARS">ARS</option>
                          </select>
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
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-lg mb-2">Resumen de la Orden</h4>
                <p><strong>Total de Artículos:</strong> {itemsOrden.length}</p>
                <p><strong>Total de la Orden:</strong> <span className="text-2xl font-bold text-green-600">${totalOrden.toLocaleString('es-AR')}</span></p>
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

