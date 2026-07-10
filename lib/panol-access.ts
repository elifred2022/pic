export const panolesEmails = [
  "paniol@perfilesyservicios.com.ar",
  "panolgascon@perfilesyservicios.com.ar",
  "asist.controlstock@perfilesyservicios.com.ar",
   "recepcioncardales@perfilesyservicios.com.ar",
  "elifred21@hotmail.com"
];

export const produccionEmails = [
  
  "controldecalidad@perfilesyservicios.com.ar",
  "asistordenes@perfilesyservicios.com.ar",
  "pvcordenes@perfilesyservicios.com.ar",
  "supervisorpys@gmail.com", //pablo cruz
  "gonzalo@perfilesyservicios.com.ar",
 
];

export const adminEmails = [
  "asistentecompras@perfilesyservicios.com.ar",
  "victor@perfilesyservicios.com.ar",
  "joseluis@perfilesyservicios.com.ar",
  "recepcion@perfilesyservicios.com.ar", //fatima
  "recepcioncardales@perfilesyservicios.com.ar" //luciana torres
];

export const aprobEmails = [
  "juanstok@perfilesyservicios.com.ar",
  "luciana.ledesma@perfilesyservicios.com.ar",
  "carolina@perfilesyservicios.com.ar",
  "eduardo@perfilesyservicios.com.ar",
  "pedro@perfilesyservicios.com.ar",
  "sofiastok@perfilesyservicios.com.ar",
  "elifredmason@gmail.com",
  // "julio@perfilesyservicios.com.ar", se dio de baja el 04/06/2026
];

export const finanzasEmails: string[] = [];

export const SIN_ROL = "sin_rol";

export const rolOpciones = [
  { value: "panolesEmails", label: "Pañol" },
  { value: "produccionEmails", label: "Producción" },
  { value: "adminEmails", label: "Administrador" },
  { value: "finanzasEmails", label: "Finanzas" },
  { value: "aprobEmails", label: "Aprobación" },
  { value: "tabletEmails", label: "Tablet" },
  { value: "inventariopvc", label: "Inventario PVC" },
] as const;

export type RolKey = (typeof rolOpciones)[number]["value"];

/** Opciones del formulario de usuarios (incluye sin rol). */
export const rolOpcionesForm = [
  { value: SIN_ROL, label: "Sin rol" },
  ...rolOpciones,
] as const;

export const isSinRol = (rol?: string | null) =>
  rol === SIN_ROL || rol === "";

export const hasRolAsignado = (rol?: string | null): rol is RolKey =>
  !!rol && rol !== SIN_ROL && rolOpciones.some((opcion) => opcion.value === rol);

export const soloPedidosGeneralesPorRol = (rol?: string | null) =>
  isSinRol(rol) || !hasRolAsignado(rol);

/** Fallback por email solo cuando el rol en BD no está definido (null). */
const useEmailFallback = (rol?: string | null) =>
  rol === null || rol === undefined;

export const tabletEmails = [
  "tabletpys331@gmail.com",
   "tabletpyspaez@gmail.com", 
"tabletpysherrera@gmail.com",
"tabletpysfleitas@gmail.com",
"tabletpyscruz@gmail.com",
"tabletpysalfonso@gmail.com",
"orlandojosemartinez1946@gmail.com",
"tabletpysignacio@gmail.com",
"tabletpyscardozo@gmail.com",
"tabletpyssantini@gmail.com",
//"asistentecompras@perfilesyservicios.com.ar",

];

export const inventariopvcEmails: string[] = [];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hasRol = (rol: string | null | undefined, expected: RolKey) =>
  rol === expected;

const emailInList = (email: string | null | undefined, list: string[]) => {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return list.some((e) => normalizeEmail(e) === normalized);
};

export const isPanolRol = (rol?: string | null) => hasRol(rol, "panolesEmails");
export const isProduccionRol = (rol?: string | null) =>
  hasRol(rol, "produccionEmails");
export const isAdminRol = (rol?: string | null) => hasRol(rol, "adminEmails");
export const isFinanzasRol = (rol?: string | null) => hasRol(rol, "finanzasEmails");
export const isAprobRol = (rol?: string | null) => hasRol(rol, "aprobEmails");
export const isTabletRol = (rol?: string | null) => hasRol(rol, "tabletEmails");
export const isInventarioPvcRol = (rol?: string | null) =>
  hasRol(rol, "inventariopvc");

export const isPanolEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isPanolRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, panolesEmails);
  return false;
};

/** Órdenes de producción: solo consulta, sin edición ni carga de datos. */
export const isOrdenesProduccionSoloVista = (
  email?: string | null,
  rol?: string | null,
) =>
  isPanolEmail(email, rol) ||
  isInventarioPvcEmail(email, rol) ||
  isFinanzasEmail(email, rol);

export const isTabletEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isTabletRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, tabletEmails);
  return false;
};

export const isInventarioPvcEmail = (
  email?: string | null,
  rol?: string | null,
) => {
  if (isSinRol(rol)) return false;
  if (isInventarioPvcRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, inventariopvcEmails);
  return false;
};

/** Tablet sin rol producción/admin: solo puede marcar checkboxes, no desmarcar. */
export const isTabletOnlyUser = (email?: string | null, rol?: string | null) =>
  isTabletEmail(email, rol) &&
  !isProduccionEmail(email, rol) &&
  !isAdminEmail(email, rol);

export const canUseChat = (_email?: string | null, _rol?: string | null) => true;

export const isChatContactEmail = (_email?: string | null, _rol?: string | null) =>
  true;

export const isAprobEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isAprobRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, aprobEmails);
  return false;
};

/** Ver presupuestos (comparativa) y factura adjunta en OC. */
export const canViewAdjuntosCompras = (
  email?: string | null,
  rol?: string | null,
) =>
  isAdminEmail(email, rol) ||
  isFinanzasEmail(email, rol) ||
  isAprobEmail(email, rol);

export const canAccessUsuarios = (
  email?: string | null,
  rol?: string | null,
) =>
  isAdminEmail(email, rol) ||
  isFinanzasEmail(email, rol) ||
  isAprobEmail(email, rol);

export const canAccessModuloCompras = (
  email?: string | null,
  rol?: string | null,
) =>
  isAdminEmail(email, rol) ||
  isFinanzasEmail(email, rol) ||
  isAprobEmail(email, rol) ||
  isPanolEmail(email, rol);

/** Pañol usa órdenes de recepción: ve todo salvo importes en moneda. */
export const canViewImportesOrdenesCompra = (
  email?: string | null,
  rol?: string | null,
) => !isPanolEmail(email, rol);

/** Admin y pañol pueden registrar entregas del proveedor. */
export const canCargarEntregaOrdenes = (
  email?: string | null,
  rol?: string | null,
) => canEditAsAdmin(email, rol) || isPanolEmail(email, rol);

export const isProduccionEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isProduccionRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, produccionEmails);
  return false;
};

export const isAdminEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isAdminRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, adminEmails);
  return false;
};

export const isFinanzasEmail = (email?: string | null, rol?: string | null) => {
  if (isSinRol(rol)) return false;
  if (isFinanzasRol(rol)) return true;
  if (useEmailFallback(rol)) return emailInList(email, finanzasEmails);
  return false;
};

/** Misma visibilidad que administrador (listas, módulos, adjuntos). */
export const isAdminOrFinanzasEmail = (
  email?: string | null,
  rol?: string | null,
) => isAdminEmail(email, rol) || isFinanzasEmail(email, rol);

/** Solo administrador puede crear, editar o eliminar datos. */
export const canEditAsAdmin = (email?: string | null, rol?: string | null) =>
  isAdminEmail(email, rol);

/** Administrador, finanzas, pañol, producción y usuarios sin rol asignado pueden crear pedidos generales. */
export const canCreatePedidosGenerales = (
  email?: string | null,
  rol?: string | null,
) =>
  isAdminEmail(email, rol) ||
  isFinanzasEmail(email, rol) ||
  isPanolEmail(email, rol) ||
  isProduccionEmail(email, rol) ||
  soloPedidosGeneralesPorRol(rol);

/** Administrador, pañol y aprobación pueden crear pedidos productivos. */
export const canCreatePedidosProductivos = (
  email?: string | null,
  rol?: string | null,
) =>
  canEditAsAdmin(email, rol) ||
  isPanolEmail(email, rol) ||
  isAprobEmail(email, rol);

export const canAccessOrdenesProduccion = (
  email?: string | null,
  rol?: string | null,
) => {
  if (isSinRol(rol)) return false;
  if (hasRolAsignado(rol)) return true;
  if (!useEmailFallback(rol)) return false;

  return (
    emailInList(email, panolesEmails) ||
    emailInList(email, produccionEmails) ||
    emailInList(email, adminEmails) ||
    emailInList(email, aprobEmails) ||
    emailInList(email, tabletEmails) ||
    emailInList(email, inventariopvcEmails)
  );
};

const observacionesObraDeleteEmails = [
  "asistentecompras@perfilesyservicios.com.ar",
  "controldecalidad@perfilesyservicios.com.ar",
  "asistordenes@perfilesyservicios.com.ar",
  "juanstok@perfilesyservicios.com.ar",
];

export const canDeleteObservacionesObra = (
  email?: string | null,
  rol?: string | null,
) => {
  if (isSinRol(rol)) return false;

  if (isAdminRol(rol) || isProduccionRol(rol) || isAprobRol(rol)) {
    return true;
  }

  if (!useEmailFallback(rol)) return false;
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return observacionesObraDeleteEmails.some(
    (e) => normalizeEmail(e) === normalized,
  );
};
