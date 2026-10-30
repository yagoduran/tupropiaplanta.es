"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { DESAFIOS, DESAFIO_POR_ID, DIFICULTAD, type DatosDesafios } from "@/lib/desafios";
import { Icono } from "./Icono";
import { IconoProgresion } from "./IconoProgresion";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosDesafios | null;
  /** Desafío que se está jugando ahora, si lo hay. */
  enCurso: string | null;
  ocupado: boolean;
  alEmpezar: (id: string) => void;
  alContinuar: () => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function renovacion(segundos: number) {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  return dias > 0 ? `${dias} d ${horas} h` : `${horas} h`;
}

function Escudos({ n }: { n: number }) {
  return (
    <span className={styles.escudos} aria-label={DIFICULTAD[n - 1]}>
      {[1, 2, 3].map((i) => (
        <IconoProgresion key={i} celda={[4, 2]} tamano={16} k={1} apagado={i > n} />
      ))}
    </span>
  );
}

/** Desafíos de la semana: reglas especiales, puntuación y mejores marcas. */
export function Desafios({ datos, enCurso, ocupado, alEmpezar, alContinuar }: Props) {
  const [elegido, setElegido] = useState(DESAFIOS[0].id);
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Desafíos</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const d = DESAFIO_POR_ID[elegido];
  const estado = datos.desafios[d.id];
  const jugandoEste = estado?.activo || enCurso === d.id;
  const hayOtro = !!enCurso && enCurso !== d.id;

  let texto = "Empezar desafío";
  let desactivado = false;
  let accion = () => alEmpezar(d.id);
  if (jugandoEste) {
    texto = "Seguir con el desafío";
    accion = alContinuar;
  } else if (estado?.jugado) {
    texto = `Disponible en ${renovacion(datos.renueva_en)}`;
    desactivado = true;
  } else if (hayOtro) {
    texto = "Ya tienes otro desafío en curso";
    desactivado = true;
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Desafíos con modificadores</h1>
        <span className={styles.resumen}>Nuevos desafíos en {renovacion(datos.renueva_en)}</span>
      </div>

      <div className={styles.desafios}>
        <div className={styles.listaDesafios}>
          {DESAFIOS.map((c) => {
            const e = datos.desafios[c.id];
            return (
              <button
                key={c.id}
                type="button"
                className={styles.desafio}
                style={marco(c.id === elegido ? "dorado" : "tarjeta", "var(--u)")}
                aria-pressed={c.id === elegido}
                onClick={() => setElegido(c.id)}
              >
                <Icono id={c.icono} k={3} />
                <span className={styles.desafioTexto}>
                  <strong>{c.nombre}</strong>
                  <span>{c.reglas.map((r) => r.titulo).join(" · ")}</span>
                  <span className={styles.desafioPie}>
                    <Escudos n={c.dificultad} />
                    {DIFICULTAD[c.dificultad - 1]} · {e?.mejor ? `Récord ${miles(e.mejor)}` : "Sin jugar"}
                  </span>
                </span>
                <span className={styles.multiplicador}>×{c.mult}</span>
              </button>
            );
          })}
        </div>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label={d.nombre}>
          <div className={styles.desafioCabeza}>
            <p className={styles.subtitulo}>
              {d.nombre}
              <span>
                <Escudos n={d.dificultad} /> {DIFICULTAD[d.dificultad - 1]}
              </span>
            </p>
            <p className={styles.pequeno}>{d.descripcion}</p>
          </div>
          <div className={styles.reglas}>
            {d.reglas.map((r) => (
              <div key={r.titulo} className={styles.regla} style={marco("tarjeta", "var(--u)")}>
                <Icono id={r.icono} k={2} />
                <span>
                  <strong>{r.titulo}</strong>
                  <br />
                  {r.texto}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.premio} style={marco("dorado", "var(--u)")}>
            <IconoProgresion celda={[3, 2]} k={1.5} />
            <span>
              <strong>Recompensa mayor</strong>
              <br />
              {miles(1000 * d.mult)} monedas · {miles(200 * d.mult)} XP · insignia del desafío ×{d.mult}
            </span>
          </div>
          <p className={styles.pequeno}>
            Tienes {d.dias} días para cosechar. Puntos = (400 + salud × 6) × dificultad. La planta crece 3 veces más
            rápido y no ocupa tus huecos. Solo se puede jugar una vez por semana.
          </p>

          <p className={styles.subtitulo}>Tus mejores puntuaciones</p>
          {estado && estado.top.length > 0 ? (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Puntos</th>
                  <th>Salud</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {estado.top.map((f, i) => (
                  <tr key={f.fecha} className={i === 0 ? styles.mejorFila : undefined}>
                    <td>{i + 1}</td>
                    <td>{miles(f.puntos)}</td>
                    <td>{f.salud} %</td>
                    <td>{new Date(f.fecha).toLocaleDateString("es-ES")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.nota}>Aún no has completado este desafío. Tu primera puntuación aparecerá aquí.</p>
          )}

          <button
            type="button"
            className={styles.accion}
            style={desactivado ? apagado : boton}
            disabled={ocupado || desactivado}
            onClick={accion}
          >
            {texto}
          </button>
        </section>
      </div>
    </div>
  );
}
