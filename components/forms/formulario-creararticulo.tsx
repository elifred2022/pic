"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function FormularioCrearArticulo() {
  const supabase = createClient();
  const router = useRouter();

  // Estados para los campos del formulario
  const [codint, setCodint] = useState("");
  const [articulo, setArticulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [existencia, setExistencia] = useState<number>(0);
  const [provsug, setProvsug] = useState("");
  const [codprovsug, setCodprovsug] = useState("");
  const [familia, setFamilia] = useState("");
  const [situacion, setSituacion] = useState("activo");
  const [cc, setCc] = useState<number>(0);
  const [costunit, setCostunit] = useState<number>(0);
  const [divisa, setDivisa] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingArticulo, setPendingArticulo] = useState<Record<string, unknown> | null>(null);
  const [pendingUser, setPendingUser] = useState<{ id: string; email?: string } | null>(null);

  // El código interno se ingresa manualmente

  const crearArticulo = async (nuevoArticulo: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from("articulos")
        .insert([nuevoArticulo]);

      if (error) {
        console.error('Error al crear artículo:', error);
        setMessage("❌ Error al crear el artículo: " + error.message);
      } else {
        setMessage("✅ Artículo creado exitosamente");
        
        // Reset del formulario
        setCodint("");
        setArticulo("");
        setDescripcion("");
        setExistencia(0);
        setProvsug("");
        setCodprovsug("");
        setFamilia("");
        setSituacion("activo");
        setCc(0);
        setCostunit(0);
        setDivisa("");

        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push("/auth/lista-articulos");
        }, 2000);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      setMessage("❌ Error inesperado al crear el artículo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validaciones básicas
    if (!codint.trim() || !articulo.trim()) {
      setMessage("❌ El código interno y nombre del artículo son obligatorios");
      setLoading(false);
      return;
    }

    try {
      // Verificar si ya existe un artículo con el mismo código interno
      const { data: articuloExistente, error: errorBusqueda } = await supabase
        .from("articulos")
        .select("codint, articulo")
        .eq("codint", codint.trim())
        .single();

      if (errorBusqueda && errorBusqueda.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error al buscar artículo existente:', errorBusqueda);
        setMessage("❌ Error al verificar artículo existente");
        setLoading(false);
        return;
      }

      if (articuloExistente) {
        setMessage("❌ Ya existe un artículo con el código interno: " + codint.trim());
        setLoading(false);
        return;
      }

      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setMessage("❌ Error: Usuario no autenticado");
        setLoading(false);
        return;
      }

      // Verificar si ya existe un artículo con el mismo nombre (opcional, para evitar duplicados)
      const { data: articuloMismoNombre, error: errorNombre } = await supabase
        .from("articulos")
        .select("codint, articulo")
        .eq("articulo", articulo.trim())
        .single();

      if (errorNombre && errorNombre.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error al buscar artículo con mismo nombre:', errorNombre);
        setMessage("❌ Error al verificar artículo existente");
        setLoading(false);
        return;
      }

      if (articuloMismoNombre) {
        // Guardar los datos pendientes y mostrar diálogo de confirmación
        setPendingArticulo({
          codint: codint.trim(),
          articulo: articulo.trim(),
          descripcion: descripcion.trim(),
          existencia: existencia || 0,
          provsug: provsug.trim() || null,
          codprovsug: codprovsug.trim() || null,
          familia: familia.trim() || null,
          situacion: situacion,
          cc: cc || 0,
          costunit: costunit || 0,
          divisa: divisa.trim() || null,
        });
        setPendingUser(user);
        setShowConfirmDialog(true);
        setLoading(false);
        return;
      }

      const nuevoArticulo = {
        codint: codint, // Código interno para uso del usuario
        articulo: articulo.trim(),
        descripcion: descripcion.trim(),
        existencia: existencia || 0,
        provsug: provsug.trim() || null,
        codprovsug: codprovsug.trim() || null,
        familia: familia.trim() || null,
        situacion: situacion,
        uuid: user.id, // ID del usuario que crea el artículo
        cc: cc || 0,
        costunit: costunit || 0,
        divisa: divisa.trim() || null,
        // ID y fecha de creación se generan automáticamente en Supabase
      };

      await crearArticulo(nuevoArticulo);
    } catch (error) {
      console.error('Error inesperado:', error);
      setMessage("❌ Error inesperado al crear el artículo");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded text-black">
      <h2 className="text-2xl font-bold mb-6 text-center">Crear Nuevo Artículo</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded text-center ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Código Interno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="codint" className="text-sm font-medium text-gray-700">
              Código Interno *
            </Label>
                         <input
               type="text"
               id="codint"
               value={codint}
               onChange={(e) => setCodint(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               placeholder="Ej: 23-0411-0348-02"
               required
             />
            <p className="text-xs text-gray-500 mt-1">Ingrese el código interno del artículo</p>
          </div>
        </div>

        {/* Campos principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="articulo" className="text-sm font-medium text-gray-700">
              Nombre del Artículo *
            </Label>
            <input
              type="text"
              id="articulo"
              value={articulo}
              onChange={(e) => setArticulo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Tornillos M8x20"
              required
            />
          </div>

                     <div>
             <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700">
               Descripción
             </Label>
             <input
               type="text"
               id="descripcion"
               value={descripcion}
               onChange={(e) => setDescripcion(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               placeholder="Descripción detallada del artículo (opcional)"
             />
           </div>
        </div>

        {/* Existencia y Familia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="existencia" className="text-sm font-medium text-gray-700">
              Existencia
            </Label>
            <input
              type="number"
              id="existencia"
              value={existencia}
              onChange={(e) => setExistencia(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="familia" className="text-sm font-medium text-gray-700">
              Familia
            </Label>
            <input
              type="text"
              id="familia"
              value={familia}
              onChange={(e) => setFamilia(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Herramientas, Materiales"
            />
          </div>
        </div>

        {/* Proveedor Sugerido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="provsug" className="text-sm font-medium text-gray-700">
              Proveedor Sugerido
            </Label>
            <input
              type="text"
              id="provsug"
              value={provsug}
              onChange={(e) => setProvsug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del proveedor"
            />
          </div>

          <div>
            <Label htmlFor="codprovsug" className="text-sm font-medium text-gray-700">
              Código del Proveedor
            </Label>
            <input
              type="text"
              id="codprovsug"
              value={codprovsug}
              onChange={(e) => setCodprovsug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Código interno del proveedor"
            />
          </div>
        </div>

        {/* Costos y Divisa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cc" className="text-sm font-medium text-gray-700">
              Centro de Costo
            </Label>
            <input
              type="number"
              id="cc"
              value={cc}
              onChange={(e) => setCc(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="costunit" className="text-sm font-medium text-gray-700">
              Costo Unitario
            </Label>
            <input
              type="number"
              id="costunit"
              value={costunit}
              onChange={(e) => setCostunit(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="divisa" className="text-sm font-medium text-gray-700">
              Divisa
            </Label>
            <select
              id="divisa"
              value={divisa}
              onChange={(e) => setDivisa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar divisa</option>
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="EUR">EUR - Euro</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="PEN">PEN - Sol Peruano</option>
              <option value="MXN">MXN - Peso Mexicano</option>
            </select>
          </div>
        </div>

        {/* Situación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="situacion" className="text-sm font-medium text-gray-700">
              Situación
            </Label>
            <select
              id="situacion"
              value={situacion}
              onChange={(e) => setSituacion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-center gap-4 pt-6">
          <Button
            type="button"
            onClick={() => router.push("/auth/lista-articulos")}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500"
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Artículo"}
          </Button>
                 </div>
       </form>

       {/* Diálogo de confirmación para artículos con nombre duplicado */}
       {showConfirmDialog && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
           <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
             <h3 className="text-lg font-bold mb-4 text-red-600">⚠️ Artículo con nombre duplicado</h3>
             <p className="mb-4 text-gray-700">
               Ya existe un artículo con el nombre: <strong>{pendingArticulo?.articulo}</strong>
             </p>
             <p className="mb-4 text-sm text-gray-600">
               Código del artículo existente: <strong>{pendingArticulo?.codint}</strong>
             </p>
             <p className="mb-6 text-sm text-gray-600">
               ¿Desea continuar creando este nuevo artículo?
             </p>
             
             <div className="flex justify-end gap-3">
               <Button
                 type="button"
                 onClick={() => {
                   setShowConfirmDialog(false);
                   setPendingArticulo(null);
                   setPendingUser(null);
                 }}
                 className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
               >
                 Cancelar
               </Button>
               
               <Button
                 type="button"
                 onClick={async () => {
                   if (pendingArticulo && pendingUser) {
                     setShowConfirmDialog(false);
                     setLoading(true);
                     await crearArticulo(pendingArticulo, pendingUser);
                     setPendingArticulo(null);
                     setPendingUser(null);
                   }
                 }}
                 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
               >
                 Continuar
               </Button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
