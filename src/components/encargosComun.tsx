"use client";

import { useEffect, useState } from "react";
import { formatoTiempo, type DatosEncargos, type Encargo } from "@/lib/encargos";
import { VARIEDAD_POR_ID } from "@/lib/variedades";

export const nombreVariedad = (id: string) => VARIEDAD_POR_ID[id]?.nombre ?? id;
export const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Segundos que han pasado desde que se recibieron los encargos. Se actualiza cada segundo. */
export function useSegundosTranscurridos(datos: DatosEncargos | null) {
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return datos?.recibido && ahora > datos.recibido ? Math.floor((ahora - datos.recibido) / 1000) : 0;
}

export type EstadoVisual = "nuevo" | "aceptado" | "urge";

export const ESTADOS: Record<EstadoVisual, { texto: string; fondo: string; borde: string }> = {
  nuevo: { texto: "Nuevo", fondo: "#f4d36a", borde: "#d9a43a" },
  aceptado: { texto: "Aceptado", fondo: "#c9f26b", borde: "#36a33b" },
  urge: { texto: "A punto de caducar", fondo: "#f7b072", borde: "#b9512a" },
};

/** Estado de un encargo abierto; «urge» cuando al aceptado le queda menos de una hora. */
export function estadoVisual(e: Encargo, restan: number): EstadoVisual {
  if ((e.estado ?? "aceptado") === "nuevo") return "nuevo";
  return restan < 3600 ? "urge" : "aceptado";
}

export function textoTiempo(e: Encargo, restan: number) {
  return (e.estado ?? "aceptado") === "nuevo"
    ? `Responde en ${formatoTiempo(restan)}`
    : `Entrega en ${formatoTiempo(restan)}`;
}

export function textoMensaje(e: Encargo) {
  return (e.mensaje ?? "Hola, ¿me puedes conseguir {g} g de {v}? ¡Te lo pago bien!")
    .replace("{g}", String(e.g))
    .replace("{v}", nombreVariedad(e.variedad));
}

export const resumen = (e: Pick<Encargo, "g" | "variedad">) => `${e.g} g de ${nombreVariedad(e.variedad)}`;
