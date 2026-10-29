"use client";

import { SinConexion } from "@/components/paginas/SinConexion";

/** Si algo falla al pintar una página, se enseña «Sin conexión» y se reintenta. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <SinConexion alReintentar={reset} />;
}
