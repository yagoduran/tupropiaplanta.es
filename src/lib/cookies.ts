import { useSyncExternalStore } from "react";

const CLAVE = "tpp_cookies";

export type EleccionCookies = "aceptadas" | "rechazadas";

/** Lo que eligió el jugador sobre los anuncios personalizados. null si aún no ha elegido. */
export function leerEleccionCookies(): EleccionCookies | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === "aceptadas" || v === "rechazadas" ? v : null;
  } catch {
    return null;
  }
}

export function guardarEleccionCookies(eleccion: EleccionCookies | null) {
  try {
    if (eleccion) localStorage.setItem(CLAVE, eleccion);
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: se vuelve a preguntar la próxima vez.
  }
  window.dispatchEvent(new Event(EVENTO));
}

const EVENTO = "tpp-cookies";

const suscribir = (avisar: () => void) => {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
};

/** La elección del jugador; "cargando" mientras se prepara la página; null si aún no ha elegido. */
export function useEleccionCookies(): EleccionCookies | null | "cargando" {
  return useSyncExternalStore(suscribir, leerEleccionCookies, () => "cargando" as const);
}
