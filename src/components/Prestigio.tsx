"use client";

import { useState } from "react";
import { BONOS_PRESTIGIO, type DatosPrestigio } from "@/lib/prestigio";
import { marco } from "@/lib/diseno";
import { IconoProgresion } from "./IconoProgresion";
import anuncio from "./anuncio.module.css";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosPrestigio | null;
  ocupado: boolean;
  alComprar: (id: string) => void;
  alRenacer: (confirmacion: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Prestigio: reinicia el progreso a cambio de puntos para bonificaciones permanentes. */
export function Prestigio({ datos, ocupado, alComprar, alRenacer }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Prestigio · Renacer</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const puede = datos.nivel >= datos.nivel_minimo;
  const confirmado = texto.trim().toUpperCase() === "RENACER";
  const g = datos.ganar;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Prestigio · Renacer</h1>
        <span className={styles.resumen}>Reinicia tu progreso a cambio de puntos permanentes.</span>
      </div>

      <div className={styles.desafios}>
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Renacer">
          <div className={styles.vista}>
            <IconoProgresion celda={[3, 1]} k={2} />
            <div>
              <p className={styles.pequeno}>Prestigio actual</p>
              <p className={styles.vistaNombre}>
                {datos.prestigio} → {datos.prestigio + 1}
              </p>
              <p className={styles.vistaTitulo}>
                {puede ? `+${g.total} puntos de prestigio que ganarás` : `Necesitas el nivel ${datos.nivel_minimo}`}
              </p>
            </div>
          </div>
          <ul className={styles.bonos}>
            {[
              [`Nivel ${datos.nivel}`, g.nivel],
              [`${g.n_variedades} variedades descubiertas`, g.variedades],
              [`${g.n_legendarias} cosechas legendarias`, g.legendarias],
            ].map(([k, v]) => (
              <li key={k} className={styles.bono} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <span>{k}</span>
                <strong>+{v}</strong>
              </li>
            ))}
          </ul>
          <p className={styles.nota}>
            Al renacer vuelves al nivel 1 con una planta nueva. Los puntos sirven para comprar bonificaciones que duran
            para siempre.
          </p>
          <div className={styles.listasPrestigio}>
            <div>
              <p className={styles.subtitulo}>Se conserva</p>
              <ul className={styles.requisitos}>
                <li>✓ Colección y variedades · {datos.conserva.variedades} de 12</li>
                <li>✓ Títulos y marcos</li>
                <li>✓ Maestrías · {datos.conserva.maestrias}</li>
                <li>✓ Bonificaciones de prestigio · {datos.conserva.bonos}</li>
                <li>✓ Logros, estadísticas y perfil</li>
              </ul>
            </div>
            <div>
              <p className={styles.subtitulo}>Se pierde</p>
              <ul className={styles.requisitos}>
                <li>✕ Monedas · {miles(datos.pierde.monedas)}</li>
                <li>✕ Nivel de jugador · {datos.nivel} → 1</li>
                <li>✕ Mejoras del armario · {datos.pierde.mejoras}</li>
                <li>✕ Habitaciones extra · {datos.pierde.habitaciones}</li>
                <li>✕ Plantas, objetos y semillas · {datos.pierde.plantas}</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            className={styles.accion}
            style={marco(puede && !ocupado ? "boton_secundario" : "boton_desactivado", "var(--u)")}
            disabled={!puede || ocupado}
            onClick={() => {
              setTexto("");
              setAbierto(true);
            }}
          >
            Renacer…
          </button>
        </section>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Bonificaciones permanentes">
          <p className={styles.subtitulo}>
            Bonificaciones permanentes<span>Tienes {datos.puntos} puntos</span>
          </p>
          <div className={styles.reglas}>
            {BONOS_PRESTIGIO.map((col, i) => (
              <div key={i} className={styles.rama}>
                {col.map((b) => {
                  const hecho = datos.bonos[b.id];
                  const abierto = !hecho && (b.requiere === null || datos.bonos[b.requiere]);
                  const disponible = abierto && datos.puntos >= b.coste;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={styles.nodo}
                      style={marco(hecho ? "boton" : disponible ? "dorado" : "apagado", "var(--u)")}
                      disabled={!disponible || ocupado}
                      onClick={() => alComprar(b.id)}
                    >
                      <IconoProgresion celda={b.celda} k={1} />
                      <strong>{b.nombre}</strong>
                      <span className={styles.hitoEstado}>
                        {hecho
                          ? "✓ Activa"
                          : disponible
                            ? `Comprar · ${b.coste} pts`
                            : abierto
                              ? `${b.coste} pts · te faltan ${b.coste - datos.puntos}`
                              : `${b.coste} pts · bloqueada`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      {abierto && (
        <div className={anuncio.capa} role="dialog" aria-modal="true" aria-label="Confirmar renacer">
          <div className={anuncio.caja} style={marco("panel", "var(--u)")}>
            <span className={anuncio.etiqueta}>¿Seguro que quieres renacer?</span>
            <p className={anuncio.texto}>
              Perderás tus monedas, tu nivel, tus mejoras, habitaciones, plantas y objetos. Ganarás {g.total} puntos de
              prestigio. Esto no se puede deshacer.
            </p>
            <label className={anuncio.texto}>
              Escribe RENACER para confirmar
              <input
                className={styles.campoNombre}
                value={texto}
                maxLength={12}
                autoFocus
                onChange={(e) => setTexto(e.target.value)}
              />
            </label>
            <div className={anuncio.botones}>
              <button
                type="button"
                className={anuncio.btn}
                style={marco(confirmado && !ocupado ? "boton" : "boton_desactivado", "var(--u)")}
                disabled={!confirmado || ocupado}
                onClick={() => {
                  setAbierto(false);
                  alRenacer(texto);
                }}
              >
                Renacer ahora
              </button>
              <button
                type="button"
                className={anuncio.btn}
                style={marco("boton_secundario", "var(--u)")}
                disabled={ocupado}
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
