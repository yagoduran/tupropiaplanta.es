"use client";

import { marco } from "@/lib/diseno";
import type { DatosPase, PremioPase } from "@/lib/temporada";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosPase | null;
  ocupado: boolean;
  monedas: number;
  alReclamar: (nivel: number, pista: "g" | "s") => void;
  alComprar: () => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function IconoPremio({ tipo }: { tipo: PremioPase["tipo"] }) {
  if (tipo === "monedas") return <Icono id="moneda" k={2} />;
  if (tipo === "xp") return <Icono id="nivel" k={2} />;
  if (tipo === "objeto") return <Icono id="nutrientes" k={2} />;
  if (tipo === "semilla") return <Icono id="semillas" k={2} />;
  return <IconoSocial id="estrella_temporada" k={1.5} />;
}

function Premio({ p, ocupado, alReclamar }: { p: PremioPase; ocupado: boolean; alReclamar: () => void }) {
  const listo = p.estado === "listo";
  const estilo =
    p.estado === "listo" ? "dorado" : p.estado === "reclamado" || p.estado === "bloqueado" ? "apagado" : "tarjeta";
  return (
    <button
      type="button"
      className={styles.pasePremio}
      style={{
        ...marco(estilo, "var(--u)"),
        opacity: p.estado === "reclamado" ? 0.5 : p.estado === "bloqueado" ? 0.45 : 1,
        cursor: listo ? "pointer" : "default",
      }}
      disabled={!listo || ocupado}
      onClick={alReclamar}
    >
      <IconoPremio tipo={p.tipo} />
      <span>{listo ? `Reclamar: ${p.etq}` : p.estado === "reclamado" ? "✓ " + p.etq : p.etq}</span>
    </button>
  );
}

/** Pase de temporada: 30 niveles con una pista gratis y otra especial. */
export function Pase({ datos, ocupado, monedas, alReclamar, alComprar }: Props) {
  const tarjeta = marco("tarjeta", "var(--u)");
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Pase de temporada</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  if (!datos.activo) {
    const dias = datos.proximo_en === null ? null : Math.ceil(datos.proximo_en / 86400);
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Pase de temporada</h1>
        <p className={styles.resumen}>
          Ahora no hay ningún pase en marcha.{dias !== null ? ` El próximo evento empieza en ${dias} días.` : ""}
        </p>
      </div>
    );
  }
  const dias = Math.max(0, Math.ceil(datos.restan / 86400));
  const enNivel = datos.pts - datos.nivel * datos.por_nivel;
  const pct = datos.nivel >= 30 ? 100 : Math.round((enNivel / datos.por_nivel) * 100);
  const sinSaldo = monedas < datos.precio;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Pase de temporada · {datos.evento}</h1>
        <span className={styles.resumen}>Quedan {dias} días</span>
      </div>

      <section className={styles.tarjeta} style={tarjeta}>
        <div className={styles.subtitulo}>
          Nivel {datos.nivel} de 30
          <span>{datos.nivel >= 30 ? "¡Completado!" : `${enNivel}/${datos.por_nivel} puntos para el siguiente`}</span>
        </div>
        <div className={styles.pista} aria-hidden>
          <span className={styles.rellenoVerde} style={{ display: "block", width: `${pct}%` }} />
        </div>
        <p className={styles.resumen} style={{ color: "#1c1626" }}>
          Ganas puntos al reclamar misiones (diaria +20, semanal +60), al completar misiones del evento (+100) y al
          cosechar (+50). Lo que no reclames al terminar la temporada se pierde.
        </p>
        {datos.premium ? (
          <span className={styles.subtitulo}>✓ Pase especial activo</span>
        ) : (
          <button
            type="button"
            className={styles.accion}
            style={marco(ocupado || sinSaldo ? "boton_desactivado" : "dorado", "var(--u)")}
            disabled={ocupado || sinSaldo}
            onClick={alComprar}
          >
            Desbloquear especial · {miles(datos.precio)} monedas
          </button>
        )}
      </section>

      <div className={styles.jugadores}>
        <div className={styles.paseNivel} aria-hidden>
          <span />
          <span className={styles.subtitulo} style={{ color: "#f6eed6" }}>
            Gratis
          </span>
          <span className={styles.subtitulo} style={{ color: "#f6eed6" }}>
            Especial
          </span>
        </div>
        {datos.niveles.map((l) => (
          <div key={l.n} className={styles.paseNivel}>
            <span className={styles.paseNumero} style={marco(l.n <= datos.nivel ? "boton" : "apagado", "var(--u)")}>
              {l.n}
            </span>
            <Premio p={l.g} ocupado={ocupado} alReclamar={() => alReclamar(l.n, "g")} />
            <Premio p={l.s} ocupado={ocupado} alReclamar={() => alReclamar(l.n, "s")} />
          </div>
        ))}
      </div>
    </div>
  );
}
