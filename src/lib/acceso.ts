/** Estado que devuelven las acciones de entrada y registro. */
export interface EstadoAcceso {
  error?: string;
  aviso?: string;
  /** Email al que se ha mandado el enlace de verificación (enseña la pantalla «Verifica tu email»). */
  verificar?: string;
}

/** Traduce los errores de Supabase Auth a mensajes claros. */
export function mensajeDeError(codigo: string | undefined, mensaje: string): string {
  switch (codigo) {
    case "invalid_credentials":
      return "El email o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de entrar. Te hemos enviado un enlace.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese email.";
    case "weak_password":
      return "La contraseña es demasiado débil. Usa al menos 8 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un poco y vuelve a probar.";
    default:
      return mensaje || "No se ha podido completar la operación. Inténtalo de nuevo.";
  }
}
