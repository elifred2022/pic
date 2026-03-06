export const panolesEmails = [
  "paniol@perfilesyservicios.com.ar",
  "panolgascon@perfilesyservicios.com.ar",
  "elifred21@hotmail.com",
  "asist.controlstock@perfilesyservicios.com.ar",
  "controldecalidad@perfilesyservicios.com.ar",
  "asistordenes@perfilesyservicios.com.ar",
  "pvcordenes@perfilesyservicios.com.ar",
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
 
];

export const isPanolEmail = (email?: string | null) =>
  !!email && panolesEmails.includes(email);

export const isTabletEmail = (email?: string | null) =>
  !!email && tabletEmails.includes(email);

export const canAccessOrdenesProduccion = (email?: string | null) =>
  !!email && (panolesEmails.includes(email) || adminEmails.includes(email) || aprobEmails.includes(email) || tabletEmails.includes(email));
