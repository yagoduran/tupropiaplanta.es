"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import type { Hora } from "@/lib/diseno";
import { horaDelDia } from "@/lib/hora";
import { HABITACION_POR_ID } from "@/lib/casa";
import { estacionDelAnio, type Estacion } from "@/lib/estacion";
import { Lampara } from "./Lampara";
import styles from "./juego.module.css";

const CAPAS = ["pared", "ventana", "suelo", "estantes", "lampara"] as const;
const REVISION_MS = 60_000;

/** Cámara de cultivo: capas de la habitación según la hora real, con la planta encima. */
export function Escena({
  hora,
  luz,
  habitacion,
  children,
}: {
  hora?: Hora;
  luz?: string;
  habitacion?: string;
  children?: ReactNode;
}) {
  const [horaReal, setHoraReal] = useState<Hora>("dia");
  const [temporada, setTemporada] = useState<Estacion | null>(null);

  useEffect(() => {
    const actualizar = () => {
      setTemporada(estacionDelAnio(new Date()));
      if (hora) return;
      setHoraReal(horaDelDia(new Date()));
    };
    actualizar();
    const id = setInterval(actualizar, REVISION_MS);
    return () => clearInterval(id);
  }, [hora]);

  const momento = hora ?? horaReal;
  const fondo = habitacion ? HABITACION_POR_ID[habitacion]?.escena : null;
  const estacion = (capa: string) =>
    temporada && (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.capa} src={`/assets/temporadas/capa-${capa}-${temporada}-1x.png`} alt="" />
    );

  return (
    <>
      {fondo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.capa} src={fondo} alt="" />
      ) : (
        CAPAS.map((capa) => (
          <Fragment key={capa}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.capa} src={`/assets/escena/capa-${capa}-${momento}-1x.png`} alt="" />
            {capa === "ventana" && estacion("ventana")}
          </Fragment>
        ))
      )}
      {estacion("decoracion")}
      {momento !== "noche" && !fondo && estacion("luz")}
      {luz && <Lampara luz={luz} apagada={momento === "noche"} />}
      {children}
    </>
  );
}
