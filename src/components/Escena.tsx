"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Hora } from "@/lib/diseno";
import { horaDelDia } from "@/lib/hora";
import { Lampara } from "./Lampara";
import styles from "./juego.module.css";

const CAPAS = ["pared", "ventana", "suelo", "estantes", "lampara"] as const;
const REVISION_MS = 60_000;

/** Cámara de cultivo: capas de la habitación según la hora real, con la planta encima. */
export function Escena({ hora, luz, children }: { hora?: Hora; luz?: string; children?: ReactNode }) {
  const [horaReal, setHoraReal] = useState<Hora>("dia");

  useEffect(() => {
    if (hora) return;
    const actualizar = () => setHoraReal(horaDelDia(new Date()));
    actualizar();
    const id = setInterval(actualizar, REVISION_MS);
    return () => clearInterval(id);
  }, [hora]);

  const momento = hora ?? horaReal;

  return (
    <>
      {CAPAS.map((capa) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={capa} className={styles.capa} src={`/assets/escena/capa-${capa}-${momento}-1x.png`} alt="" />
      ))}
      {luz && <Lampara luz={luz} />}
      {children}
    </>
  );
}
