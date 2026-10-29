/**
 * Datos del titular del sitio para las páginas legales. Se rellenan aquí, en un solo sitio.
 * Mientras falte alguno, las páginas legales no se enlazan desde el juego y no salen en buscadores.
 */
export const TITULAR = {
  nombre: "",
  nif: "",
  direccion: "",
  email: "",
};

export const PENDIENTE = "[pendiente de rellenar]";

export const titularCompleto = Object.values(TITULAR).every((v) => v.trim() !== "");

export const dato = (v: string) => (v.trim() === "" ? PENDIENTE : v);
