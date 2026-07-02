"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-4 md:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  warning,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  warning?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {warning && <p className="text-xs text-red-600">{warning}</p>}
      {hint && !warning && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FormularioCrearArticulo() {
  const supabase = createClient();
  const router = useRouter();

  const [codint, setCodint] = useState("");
  const [articulo, setArticulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [existencia, setExistencia] = useState<number>(0);
  const [provsug, setProvsug] = useState("");
  const [codprovsug, setCodprovsug] = useState("");
  const [familia, setFamilia] = useState("");
  const [situacion, setSituacion] = useState("activo");
  const [cc, setCc] = useState<number>(0);
  const [costunit, setCostunit] = useState<number>(0);
  const [descuento, setDescuento] = useState("");
  const [divisa, setDivisa] = useState("");
  const [articuloCommaWarning, setArticuloCommaWarning] = useState("");
  const [descripcionCommaWarning, setDescripcionCommaWarning] = useState("");
  const [descuentoCommaWarning, setDescuentoCommaWarning] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingArticulo, setPendingArticulo] = useState<{
    codint: string;
    articulo: string;
    descripcion: string;
    presentacion: string | null;
    existencia: number;
    provsug: string | null;
    codprovsug: string | null;
    familia: string | null;
    situacion: string;
    cc: number;
    costunit: number;
    descuento: string | null;
    costunitcdesc: string | null;
    divisa: string | null;
  } | null>(null);

  const parseNumero = (valor?: string | number) => {
    if (valor === undefined || valor === null || valor === "") return 0;
    const normalizado = String(valor).replace(",", ".");
    const numero = parseFloat(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  };

  const calcularCostunitcdesc = () => {
    const cost = costunit || 0;
    const porcentaje = parseNumero(descuento);
    if (!cost || !descuento.trim()) return null;
    return (cost - (cost * porcentaje) / 100).toFixed(2);
  };

  const crearArticulo = async (nuevoArticulo: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from("articulos")
        .insert([nuevoArticulo]);

      if (error) {
        console.error("Error al crear artículo:", error);
        setMessage("❌ Error al crear el artículo: " + error.message);
      } else {
        setMessage("✅ Artículo creado exitosamente");

        setCodint("");
        setArticulo("");
        setDescripcion("");
        setPresentacion("");
        setExistencia(0);
        setProvsug("");
        setCodprovsug("");
        setFamilia("");
        setSituacion("activo");
        setCc(0);
        setCostunit(0);
        setDescuento("");
        setDivisa("");

        setTimeout(() => {
          router.push("/auth/lista-articulos");
        }, 2000);
      }
    } catch (error) {
      console.error("Error inesperado:", error);
      setMessage("❌ Error inesperado al crear el artículo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!codint.trim() || !articulo.trim()) {
      setMessage("❌ El código interno y nombre del artículo son obligatorios");
      setLoading(false);
      return;
    }

    try {
      const { data: articuloExistente, error: errorBusqueda } = await supabase
        .from("articulos")
        .select("codint, articulo")
        .eq("codint", codint.trim())
        .single();

      if (errorBusqueda && errorBusqueda.code !== "PGRST116") {
        console.error("Error al buscar artículo existente:", errorBusqueda);
        setMessage("❌ Error al verificar artículo existente");
        setLoading(false);
        return;
      }

      if (articuloExistente) {
        setMessage("❌ Ya existe un artículo con el código interno: " + codint.trim());
        setLoading(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ Error: Usuario no autenticado");
        setLoading(false);
        return;
      }

      const { data: articuloMismoNombre, error: errorNombre } = await supabase
        .from("articulos")
        .select("codint, articulo")
        .eq("articulo", articulo.trim())
        .single();

      if (errorNombre && errorNombre.code !== "PGRST116") {
        console.error("Error al buscar artículo con mismo nombre:", errorNombre);
        setMessage("❌ Error al verificar artículo existente");
        setLoading(false);
        return;
      }

      if (articuloMismoNombre) {
        setPendingArticulo({
          codint: codint.trim(),
          articulo: articulo.trim(),
          descripcion: descripcion.trim(),
          presentacion: presentacion.trim() || null,
          existencia: existencia || 0,
          provsug: provsug.trim() || null,
          codprovsug: codprovsug.trim() || null,
          familia: familia.trim() || null,
          situacion: situacion,
          cc: cc || 0,
          costunit: costunit || 0,
          descuento: descuento.trim() || null,
          costunitcdesc: calcularCostunitcdesc(),
          divisa: divisa.trim() || null,
        });

        setShowConfirmDialog(true);
        setLoading(false);
        return;
      }

      const nuevoArticulo = {
        codint: codint,
        articulo: articulo.trim(),
        descripcion: descripcion.trim(),
        presentacion: presentacion.trim() || null,
        existencia: existencia || 0,
        provsug: provsug.trim() || null,
        codprovsug: codprovsug.trim() || null,
        familia: familia.trim() || null,
        situacion: situacion,
        uuid: user.id,
        cc: cc || 0,
        costunit: costunit || 0,
        descuento: descuento.trim() || null,
        costunitcdesc: calcularCostunitcdesc(),
        divisa: divisa.trim() || null,
      };

      await crearArticulo(nuevoArticulo);
    } catch (error) {
      console.error("Error inesperado:", error);
      setMessage("❌ Error inesperado al crear el artículo");
    }

    setLoading(false);
  };

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Crear nuevo artículo</CardTitle>
              <CardDescription className="mt-1">
                Complete los datos para registrar un artículo en el catálogo.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/auth/lista-articulos")}
            >
              Volver a la lista
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {message && (
            <div
              className={`mb-6 rounded-md border px-4 py-3 text-sm ${
                message.includes("✅")
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FormSection
              title="Identificación"
              description="Datos principales del artículo."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Código interno *"
                  htmlFor="codint"
                  hint="Ej: 23-0411-0348-02"
                >
                  <Input
                    id="codint"
                    value={codint}
                    onChange={(e) => setCodint(e.target.value)}
                    placeholder="Código interno"
                    required
                  />
                </Field>

                <Field label="Nombre del artículo *" htmlFor="articulo" warning={articuloCommaWarning}>
                  <Input
                    id="articulo"
                    value={articulo}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes(",")) {
                        setArticuloCommaWarning("No se permiten comas, use punto.");
                        setArticulo(value.replace(/,/g, ""));
                        return;
                      }
                      setArticuloCommaWarning("");
                      setArticulo(value);
                    }}
                    placeholder="Ej: Tornillos M8x20"
                    required
                  />
                </Field>

                <Field
                  label="Descripción"
                  htmlFor="descripcion"
                  warning={descripcionCommaWarning}
                >
                  <Input
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes(",")) {
                        setDescripcionCommaWarning("No se permiten comas, use punto.");
                        setDescripcion(value.replace(/,/g, ""));
                        return;
                      }
                      setDescripcionCommaWarning("");
                      setDescripcion(value);
                    }}
                    placeholder="Descripción detallada (opcional)"
                  />
                </Field>

                <Field label="Presentación" htmlFor="presentacion">
                  <Input
                    id="presentacion"
                    value={presentacion}
                    onChange={(e) => setPresentacion(e.target.value)}
                    placeholder="Presentación del artículo (opcional)"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Stock y clasificación"
              description="Existencia inicial, familia y estado del artículo."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Existencia" htmlFor="existencia">
                  <Input
                    id="existencia"
                    type="number"
                    value={existencia}
                    onChange={(e) => setExistencia(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </Field>

                <Field label="Familia" htmlFor="familia">
                  <Input
                    id="familia"
                    value={familia}
                    onChange={(e) => setFamilia(e.target.value)}
                    placeholder="Ej: Herramientas, Materiales"
                  />
                </Field>

                <Field label="Situación" htmlFor="situacion">
                  <select
                    id="situacion"
                    value={situacion}
                    onChange={(e) => setSituacion(e.target.value)}
                    className={selectClass}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Proveedor sugerido"
              description="Referencia de proveedor para futuras compras."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Proveedor sugerido" htmlFor="provsug">
                  <Input
                    id="provsug"
                    value={provsug}
                    onChange={(e) => setProvsug(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </Field>

                <Field label="Código del proveedor" htmlFor="codprovsug">
                  <Input
                    id="codprovsug"
                    value={codprovsug}
                    onChange={(e) => setCodprovsug(e.target.value)}
                    placeholder="Código interno del proveedor"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Costos"
              description="Centro de costo, precios y divisa."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Centro de costo" htmlFor="cc">
                  <Input
                    id="cc"
                    type="number"
                    value={cc}
                    onChange={(e) => setCc(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </Field>

                <Field label="Costo unitario" htmlFor="costunit">
                  <Input
                    id="costunit"
                    type="number"
                    value={costunit}
                    onChange={(e) => setCostunit(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </Field>

                <Field label="% Desc" htmlFor="descuento" warning={descuentoCommaWarning}>
                  <Input
                    id="descuento"
                    value={descuento}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes(",")) {
                        setDescuentoCommaWarning("No se permiten comas, use punto.");
                        setDescuento(value.replace(/,/g, ""));
                        return;
                      }
                      setDescuentoCommaWarning("");
                      setDescuento(value);
                    }}
                    placeholder="0"
                  />
                </Field>

                <Field label="Cost. unit. c/ desc." htmlFor="costunitcdesc">
                  <Input
                    id="costunitcdesc"
                    readOnly
                    value={calcularCostunitcdesc() ?? ""}
                    className="bg-muted"
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Divisa" htmlFor="divisa">
                  <select
                    id="divisa"
                    value={divisa}
                    onChange={(e) => setDivisa(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Seleccionar divisa</option>
                    <option value="USD">USD - Dólar estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="ARS">ARS - Peso argentino</option>
                    <option value="CLP">CLP - Peso chileno</option>
                    <option value="PEN">PEN - Sol peruano</option>
                    <option value="MXN">MXN - Peso mexicano</option>
                  </select>
                </Field>
              </div>
            </FormSection>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/auth/lista-articulos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear artículo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-red-600">
              Artículo con nombre duplicado
            </h3>
            <p className="mb-2 text-sm text-muted-foreground">
              Ya existe un artículo con el nombre{" "}
              <strong className="text-foreground">{pendingArticulo?.articulo}</strong>.
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Código del artículo existente:{" "}
              <strong className="text-foreground">{pendingArticulo?.codint}</strong>
              <br />
              ¿Desea continuar creando este nuevo artículo?
            </p>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingArticulo(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (pendingArticulo) {
                    setShowConfirmDialog(false);
                    setLoading(true);
                    await crearArticulo(pendingArticulo);
                    setPendingArticulo(null);
                    setLoading(false);
                  }
                }}
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
