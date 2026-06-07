export type UsuarioChat = {
  uuid: string;
  nombre: string;
  email: string;
};

export type Mensaje = {
  id: string;
  conversacion_id: string;
  remitente_uuid: string;
  contenido: string;
  created_at: string;
  updated_at: string;
};

export type ConversacionResumen = {
  id: string;
  tipo: string;
  updated_at: string;
  otro_usuario: UsuarioChat | null;
  ultimo_mensaje: Mensaje | null;
  no_leidos: number;
};
