export const panolesEmails = [
  "paniol@perfilesyservicios.com.ar",
  "panolgascon@perfilesyservicios.com.ar",
  "elifred21@hotmail.com",
  "asist.controlstock@perfilesyservicios.com.ar",
];

export const isPanolEmail = (email?: string | null) =>
  !!email && panolesEmails.includes(email);
