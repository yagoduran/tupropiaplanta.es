/**
 * Datos del titular del sitio para las páginas legales. Se rellenan aquí, en un solo sitio.
 * Por decisión del titular no se publican el NIF ni la dirección; si algún día hace falta, añadir `nif` y `direccion` aquí
 * y volver a ponerlos en las páginas de aviso legal y privacidad.
 * Mientras falte alguno, las páginas legales no se enlazan desde el juego y no salen en buscadores.
 */
export const TITULAR = {
  nombre: "Yago Duran Ruzo",
  email: "ventoagency0@gmail.com",
};

export const PENDIENTE = "[pendiente de rellenar]";

export const titularCompleto = Object.values(TITULAR).every((v) => v.trim() !== "");

export const dato = (v: string) => (v.trim() === "" ? PENDIENTE : v);
