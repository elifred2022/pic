export const panolesEmails = [
  "paniol@perfilesyservicios.com.ar",
  "panolgascon@perfilesyservicios.com.ar",
  "asist.controlstock@perfilesyservicios.com.ar",
   "recepcioncardales@perfilesyservicios.com.ar",
  //"elifred21@hotmail.com",
];

export const produccionEmails = [
  
  "controldecalidad@perfilesyservicios.com.ar",
  "asistordenes@perfilesyservicios.com.ar",
  "pvcordenes@perfilesyservicios.com.ar",
  "recepcioncardales@perfilesyservicios.com.ar",
  "elifred21@hotmail.com",
];

export const adminEmails = [
  "asistentecompras@perfilesyservicios.com.ar",
  "victor@perfilesyservicios.com.ar",
  "joseluis@perfilesyservicios.com.ar",
  "recepcion@perfilesyservicios.com.ar",
];

export const aprobEmails = [
  "juanstok@perfilesyservicios.com.ar",
  "julio@perfilesyservicios.com.ar",
  "luciana.ledesma@perfilesyservicios.com.ar",
  "carolina@perfilesyservicios.com.ar",
  "eduardo@perfilesyservicios.com.ar",
  "pedro@perfilesyservicios.com.ar",
  "Sofia sofiastok@perfilesyservicios.com.ar",
  "elifredmason@gmail.com",
];

export const tabletEmails = [
  "tabletpys331@gmail.com",
  "orlandojosemartinez1946@gmail.com",
 //"elifred21@hotmail.com"
];

export const isPanolEmail = (email?: string | null) =>
  !!email && panolesEmails.includes(email);

export const isTabletEmail = (email?: string | null) =>
  !!email && tabletEmails.includes(email);

export const isAprobEmail = (email?: string | null) =>
  !!email && aprobEmails.includes(email);

export const isProduccionEmail = (email?: string | null) =>
  !!email && produccionEmails.includes(email);

export const isAdminEmail = (email?: string | null) =>
  !!email && adminEmails.includes(email);

export const canAccessOrdenesProduccion = (email?: string | null) =>
  !!email && (panolesEmails.includes(email) || produccionEmails.includes(email) || adminEmails.includes(email) || aprobEmails.includes(email) || tabletEmails.includes(email));
