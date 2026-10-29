"use client";

import { marco } from "@/lib/diseno";
import { avatarDe } from "@/lib/perfil";
import { MARCO_POR_ID, MARCOS_PERFIL, TITULO_POR_ID, TITULOS, type DatosProgresion } from "@/lib/progresion";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosProgresion | null;
  usuario: string;
  nivel: number;
  avatar?: string;
  ocupado: boolean;
  alElegir: (cambio: { titulo?: string; marco?: string }) => void;
}

/** Títulos y marcos de perfil: lo que has desbloqueado y lo que llevas puesto. */
export function Titulos({ datos, usuario, nivel, avatar, ocupado, alElegir }: Props) {
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Títulos y marcos de perfil</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const todos = TITULOS.flatMap((c) => c.titulos);
  const tituloActual = datos.titulo && datos.titulos[datos.titulo] ? TITULO_POR_ID[datos.titulo] : null;
  const marcoActual = MARCO_POR_ID[datos.marco] ?? MARCO_POR_ID.madera;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Títulos y marcos de perfil</h1>
        <span className={styles.resumen}>
          {todos.filter((t) => datos.titulos[t.id]).length} de {todos.length} títulos ·{" "}
          {MARCOS_PERFIL.filter((m) => datos.marcos[m.id]).length} de {MARCOS_PERFIL.length} marcos
        </span>
      </div>

      <div className={styles.titulosRejilla}>
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Vista previa del perfil">
          <p className={styles.subtitulo}>Vista previa del perfil</p>
          <div className={styles.vista}>
            <span className={styles.vistaAvatar} style={marco(marcoActual.estilo, "var(--u)")}>
              <IconoObjeto celda={avatarDe(avatar).celda} k={2} />
            </span>
            <div>
              <p className={styles.vistaNombre}>{usuario}</p>
              <p className={styles.vistaTitulo}>{tituloActual ? tituloActual.nombre : "Sin título"}</p>
              <p className={styles.huecoDetalle}>
                Nivel {nivel} · Marco {marcoActual.nombre}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Marcos de avatar">
          <p className={styles.subtitulo}>Marcos de avatar</p>
          <div className={styles.marcos}>
            {MARCOS_PERFIL.map((m) => {
              const libre = datos.marcos[m.id];
              const puesto = datos.marco === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.marcoOpcion} ${puesto ? styles.marcoPuesto : ""}`}
                  disabled={!libre || puesto || ocupado}
                  aria-pressed={puesto}
                  onClick={() => alElegir({ marco: m.id })}
                >
                  <span
                    className={styles.vistaAvatar}
                    style={{ ...marco(m.estilo, "var(--u)"), opacity: libre ? 1 : 0.45 }}
                  >
                    <IconoObjeto celda={avatarDe(avatar).celda} k={1} />
                  </span>
                  <strong>{m.nombre}</strong>
                  <span>{puesto ? "Equipado" : libre ? "Desbloqueado" : m.requisito}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Árbol de títulos">
        <p className={styles.subtitulo}>Árbol de títulos</p>
        <div className={styles.arbol}>
          {TITULOS.map((cat) => (
            <div key={cat.categoria} className={styles.rama}>
              <strong className={styles.ramaNombre}>{cat.categoria}</strong>
              {cat.titulos.map((t) => {
                const libre = datos.titulos[t.id];
                const puesto = datos.titulo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.nodo}
                    style={marco(puesto ? "dorado" : libre ? "tarjeta" : "apagado", "var(--u)")}
                    disabled={!libre || puesto || ocupado}
                    aria-pressed={puesto}
                    onClick={() => alElegir({ titulo: t.id })}
                  >
                    <strong>{t.nombre}</strong>
                    <span>{t.requisito}</span>
                    <span className={styles.hitoEstado}>
                      {puesto ? "★ Equipado" : libre ? "Toca para equipar" : "Bloqueado"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
