import { useSyncExternalStore } from "react";

const CLAVE = "tpp_cookies";
const CLAVE_ESTADISTICAS = "tpp_cookies_est";

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

/** Si el jugador permite las estadísticas anónimas de uso. */
export function leerEstadisticas(): boolean {
  try {
    return localStorage.getItem(CLAVE_ESTADISTICAS) === "si";
  } catch {
    return false;
  }
}

/** Guarda la elección sobre publicidad y, si se indica, sobre estadísticas. */
export function guardarEleccionCookies(eleccion: EleccionCookies | null, estadisticas?: boolean) {
  try {
    if (eleccion) localStorage.setItem(CLAVE, eleccion);
    else localStorage.removeItem(CLAVE);
    if (eleccion === null) localStorage.removeItem(CLAVE_ESTADISTICAS);
    else if (estadisticas !== undefined) localStorage.setItem(CLAVE_ESTADISTICAS, estadisticas ? "si" : "no");
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
