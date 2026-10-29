"use client";

import { marco } from "@/lib/diseno";
import type { DatosEstadisticas } from "@/lib/perfil";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./progresion.module.css";

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });
const dia = (iso: string) => new Date(`${iso}T12:00:00`).getDate();
const semana = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

/** Estadísticas del jugador: totales y gráficas de los últimos días. */
export function Estadisticas({ datos }: { datos: DatosEstadisticas | null }) {
  const panel = marco("panel", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Estadísticas</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const maxSemana = Math.max(1, ...datos.semanas.map((s) => s.n));
  const totalSemanas = datos.semanas.reduce((a, s) => a + s.n, 0);
  const maxDia = Math.max(1, ...datos.dias.map((d) => d.monedas));
  const mediaDia = Math.round(datos.dias.reduce((a, d) => a + d.monedas, 0) / datos.dias.length);
  const maxVariedad = Math.max(1, ...datos.variedades.map((v) => v.n));

  // Línea en escalones de los últimos 14 días.
  const ancho = 140;
  const alto = 60;
  const paso = ancho / datos.dias.length;
  const puntos = datos.dias
    .map((d, i) => {
      const y = alto - 4 - ((alto - 12) * d.monedas) / maxDia;
      return `${(i * paso).toFixed(1)},${y.toFixed(1)} ${((i + 1) * paso).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const totales = [
    { icono: <IconoObjeto celda={[3, 5]} k={1} />, valor: miles(datos.cosechas), nombre: "Cosechas totales" },
    { icono: <IconoObjeto celda={[0, 5]} k={1} />, valor: miles(datos.monedas_ganadas), nombre: "Monedas ganadas*" },
    { icono: <Icono id="tiempo" k={3} />, valor: `${datos.dias_cuenta} días`, nombre: "Con tu cuenta" },
    { icono: <IconoObjeto celda={[8, 5]} k={1} />, valor: `${datos.racha_max} días`, nombre: "Racha más larga" },
  ];

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Estadísticas</h1>
        <span className={styles.resumen}>Desde que empezaste a jugar · {datos.dias_cuenta} días</span>
      </div>
      <div className={styles.totales}>
        {totales.map((t) => (
          <div key={t.nombre} className={styles.total} style={marco("tarjeta", "var(--u)")}>
            {t.icono}
            <div>
              <strong className="numero">{t.valor}</strong>
              <span>{t.nombre}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.graficas}>
        <section className={styles.tarjeta} style={panel} aria-label="Cosechas por semana">
          <p className={styles.subtitulo}>
            Cosechas por semana
            <span>
              Total {totalSemanas} · media{" "}
              {(totalSemanas / datos.semanas.length).toLocaleString("es-ES", { maximumFractionDigits: 1 })}
            </span>
          </p>
          <div className={styles.barras}>
            {datos.semanas.map((s) => (
              <div key={s.inicio} className={styles.barraColumna}>
                {s.n > 0 && <span>{s.n}</span>}
                <div className={styles.barra} style={{ height: `${(100 * s.n) / maxSemana}%` }} />
              </div>
            ))}
          </div>
          <div className={styles.etiquetas}>
            {datos.semanas.map((s) => (
              <span key={s.inicio}>{semana(s.inicio)}</span>
            ))}
          </div>
        </section>
        <section className={styles.tarjeta} style={panel} aria-label="Monedas por día">
          <p className={styles.subtitulo}>
            Monedas por día<span>Últimos 14 días · media {miles(mediaDia)}</span>
          </p>
          <svg
            className={styles.linea}
            viewBox={`0 0 ${ancho} ${alto}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Monedas ganadas por día"
          >
            <polyline points={puntos} fill="none" stroke="#2f6fb0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={styles.etiquetas}>
            {datos.dias.map((d, i) => (
              <span key={d.dia}>{i % 2 === 0 ? dia(d.dia) : ""}</span>
            ))}
          </div>
        </section>
        <section className={styles.tarjeta} style={panel} aria-label="Variedades más cultivadas">
          <p className={styles.subtitulo}>
            Variedades más cultivadas<span>Cosechas por variedad</span>
          </p>
          {datos.variedades.length === 0 ? (
            <p className={styles.vacio}>Cuando coseches tu primera planta saldrá aquí.</p>
          ) : (
            <div className={styles.ranking}>
              {datos.variedades.map((v) => (
                <div key={v.variedad} className={styles.filaVariedad}>
                  <span>{VARIEDAD_POR_ID[v.variedad]?.nombre ?? v.variedad}</span>
                  <div className={styles.pista}>
                    <div className={styles.relleno} style={{ width: `${(100 * v.n) / maxVariedad}%` }} />
                  </div>
                  <span className="numero">{v.n}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className={styles.resumen}>
        *Las monedas y las gráficas se cuentan desde que se activaron las estadísticas
        {datos.desde ? ` (${new Date(`${datos.desde}T12:00:00`).toLocaleDateString("es-ES")})` : ""}.
      </p>
    </div>
  );
}
