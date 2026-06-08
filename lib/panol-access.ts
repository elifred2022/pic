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
  "supervisorpys@gmail.com",
  "gonzalo@perfilesyservicios.com.ar",
 
];

export const adminEmails = [
  "asistentecompras@perfilesyservicios.com.ar",
  "victor@perfilesyservicios.com.ar",
  "joseluis@perfilesyservicios.com.ar",
  "recepcion@perfilesyservicios.com.ar", //fatima
  "recepcioncardales@perfilesyservicios.com.ar"
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

export const tabletEmails = [
  "tabletpys331@gmail.com",
    "supervisorpys@gmail.com", 
"tabletpyspaez@gmail.com", 
"tabletpysherrera@gmail.com",
"tabletpysfleitas@gmail.com",
"tabletpyscruz@gmail.com",
"tabletpysalfonso@gmail.com",
"orlandojosemartinez1946@gmail.com",
"tabletpysignacio@gmail.com",
"tabletpyscardozo@gmail.com",
"tabletpyssantini@gmail.com",


];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isPanolEmail = (email?: string | null) =>
  !!email && panolesEmails.includes(email);

export const isTabletEmail = (email?: string | null) => {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return tabletEmails.some((e) => normalizeEmail(e) === normalized);
};

export const canUseChat = (email?: string | null) => !isTabletEmail(email);

export const isChatContactEmail = (email?: string | null) =>
  !isTabletEmail(email);

export const isAprobEmail = (email?: string | null) =>
  !!email && aprobEmails.includes(email);

/** Ver presupuestos (comparativa) y factura adjunta en OC. */
export const canViewAdjuntosCompras = (email?: string | null) =>
  !!email && (adminEmails.includes(email) || aprobEmails.includes(email));

export const isProduccionEmail = (email?: string | null) =>
  !!email && produccionEmails.includes(email);

export const isAdminEmail = (email?: string | null) =>
  !!email && adminEmails.includes(email);

export const canAccessOrdenesProduccion = (email?: string | null) =>
  !!email && (panolesEmails.includes(email) || produccionEmails.includes(email) || adminEmails.includes(email) || aprobEmails.includes(email) || tabletEmails.includes(email));
