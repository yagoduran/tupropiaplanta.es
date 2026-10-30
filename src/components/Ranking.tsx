"use client";

import { InsigniaCreador } from "./InsigniaCreador";
import { marco } from "@/lib/diseno";
import type { AmbitoRanking, DatosRanking } from "@/lib/juego";
import { nombreDePais } from "@/lib/paises";
import { Medalla } from "./Medalla";
import styles from "./ranking.module.css";

const MEDALLA = { 1: "oro", 2: "plata", 3: "bronce" } as const;

const AMBITOS: [AmbitoRanking, string][] = [
  ["mundial", "Mundial"],
  ["nacional", "Nacional"],
  ["amigos", "Amigos"],
];

interface Props {
  datos: DatosRanking | null;
  error: boolean;
  ambito: AmbitoRanking;
  alCambiarAmbito: (a: AmbitoRanking) => void;
}

export function Ranking({ datos, error, ambito, alCambiarAmbito }: Props) {
  const panel = marco("tarjeta", "var(--u)");
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Ranking</h1>
        {datos && (
          <span className={styles.resumen}>
            {datos.mia ? (
              <>
                Tu puesto: <strong className="numero">{datos.mia.pos}</strong> de{" "}
                <strong className="numero">{datos.total}</strong>
              </>
            ) : (
              "Estás oculto en el ranking (puedes cambiarlo en Ajustes)."
            )}
          </span>
        )}
      </div>
      <div className={styles.ambitos} role="tablist">
        {AMBITOS.map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={ambito === id}
            className={styles.ambito}
            data-activo={ambito === id}
            onClick={() => alCambiarAmbito(id)}
          >
            {nombre}
          </button>
        ))}
      </div>
      <div className={styles.panel} style={panel}>
        {error ? (
          <p className={styles.vacio}>
            No se ha podido cargar el ranking.{" "}
            <button type="button" className={styles.ambito} onClick={() => alCambiarAmbito(ambito)}>
              Reintentar
            </button>
          </p>
        ) : !datos ? (
          <p className={styles.vacio}>Cargando…</p>
        ) : datos.top.length === 0 ? (
          <p className={styles.vacio}>
            {ambito === "nacional" && !datos.pais
              ? "Elige tu país en Ajustes para ver el ranking nacional."
              : "Todavía no hay nadie en el ranking."}
          </p>
        ) : (
          <ol className={styles.lista}>
            {datos.top.map((f) => (
              <li key={f.pos} className={`${styles.fila} ${f.yo ? styles.yo : ""}`}>
                <span className={styles.puesto}>
                  {f.pos <= 3 ? (
                    <Medalla tipo={MEDALLA[f.pos as 1 | 2 | 3]} k={1} />
                  ) : (
                    <strong className="numero">{f.pos}</strong>
                  )}
                </span>
                <span className={styles.nombre}>
                  {f.usuario}
                  {f.creador && <InsigniaCreador />}
                  {f.yo && " (tú)"}
                </span>
                <span className={styles.nivel}>
                  <strong className="numero">{f.cosechas}</strong> cosechas · Nivel{" "}
                  <strong className="numero">{f.nivel}</strong>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className={styles.nota}>
        Se ordena por cosechas. Se muestran los 50 primeros
        {ambito === "nacional" && datos?.pais ? ` de ${nombreDePais(datos.pais)}` : ""}.
      </p>
    </div>
  );
}
