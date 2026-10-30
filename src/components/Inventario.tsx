"use client";

import { FASES, marco } from "@/lib/diseno";
import type { PantallaJuego, PerfilJuego } from "@/lib/juego";
import type { DatosPerfil } from "@/lib/perfil";
import { OBJETO_POR_ID } from "@/lib/tienda";
import { VARIEDAD_POR_ID, hojaDe } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./progresion.module.css";

interface Props {
  perfil: PerfilJuego;
  plantas: DatosPerfil["plantas"] | null;
  ocupado: boolean;
  alIrAHueco: (hueco: number, destino: PantallaJuego) => void;
  alAmpliar: () => void;
  alIrATienda: () => void;
}

/** Inventario: tus huecos de cultivo y los objetos que tienes. */
export function Inventario({ perfil, plantas, ocupado, alIrAHueco, alAmpliar, alIrATienda }: Props) {
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const { huecos, inventario } = perfil;
  const objetos = Object.entries(inventario)
    .filter(([id, n]) => n > 0 && OBJETO_POR_ID[id])
    .map(([id, n]) => ({ objeto: OBJETO_POR_ID[id], n }));

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Huecos de cultivo</h1>
        <span className={styles.resumen}>
          {huecos.desbloqueados} de {huecos.maximo} desbloqueados
        </span>
      </div>
      <div className={styles.inventario}>
        <div className={styles.huecos}>
          {huecos.lista.map((h) => {
            const planta = h.vida === "viva" ? plantas?.find((p) => p.hueco === h.hueco && p.vida === "viva") : null;
            const variedad = planta ? VARIEDAD_POR_ID[planta.variedad] : null;
            const activo = huecos.activo === h.hueco;
            const clase = `${styles.hueco} ${activo ? styles.huecoActivo : ""}`;
            if (h.vida === "viva") {
              return (
                <button
                  key={h.hueco}
                  type="button"
                  className={clase}
                  disabled={ocupado}
                  onClick={() => alIrAHueco(h.hueco, "cultivo")}
                >
                  <span className={styles.huecoCabeza}>
                    <span>Hueco {h.hueco}</span>
                    <span>{h.plaga ? "Con plaga" : "Ocupado"}</span>
                  </span>
                  <span className={styles.huecoDibujo}>
                    {planta ? (
                      <span
                        className="pixel"
                        aria-hidden
                        style={{
                          display: "block",
                          width: 128,
                          height: 128,
                          backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(planta.variedad)}-1x.png)`,
                          backgroundSize: "768px 1024px",
                          backgroundPosition: `0 ${-(planta.fase - 1) * 128}px`,
                        }}
                      />
                    ) : (
                      <Icono id="cultivo" k={6} />
                    )}
                  </span>
                  <span className={styles.huecoNombre}>{variedad?.nombre ?? "Planta"}</span>
                  <span className={styles.huecoDetalle}>
                    {planta ? `Fase ${planta.fase} · ${FASES[planta.fase - 1]}` : "Cargando…"}
                  </span>
                </button>
              );
            }
            return (
              <div key={h.hueco} className={clase}>
                <span className={styles.huecoCabeza}>
                  <span>Hueco {h.hueco}</span>
                  <span>{h.vida === "muerta" ? "Planta muerta" : "Libre"}</span>
                </span>
                <span className={styles.huecoDibujo}>
                  <span
                    className="pixel"
                    aria-hidden
                    style={{
                      display: "block",
                      width: 128,
                      height: 128,
                      backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png?v=2)",
                      backgroundSize: "1024px 128px",
                      backgroundPosition: "-128px 0",
                    }}
                  />
                </span>
                <span className={styles.huecoNombre}>{h.vida === "muerta" ? "Hueco por limpiar" : "Hueco libre"}</span>
                <span className={styles.huecoDetalle}>Planta una semilla aquí.</span>
                <button
                  type="button"
                  className={styles.accion}
                  style={boton}
                  disabled={ocupado}
                  onClick={() => alIrAHueco(h.hueco, "semillas")}
                >
                  Plantar
                </button>
              </div>
            );
          })}
          {huecos.desbloqueados < huecos.maximo && (
            <div className={`${styles.hueco} ${styles.huecoSiguiente}`}>
              <span className={styles.huecoCabeza}>
                <span>Hueco {huecos.desbloqueados + 1}</span>
                <span>Siguiente</span>
              </span>
              <span className={styles.huecoDibujo}>
                <Icono id="candado" k={8} />
              </span>
              <span className={styles.huecoNombre}>Más huecos</span>
              <span className={styles.huecoDetalle}>Desbloquea habitaciones y mejora la capacidad del armario.</span>
              <button type="button" className={styles.accion} style={boton} disabled={ocupado} onClick={alAmpliar}>
                Ver habitaciones
              </button>
            </div>
          )}
        </div>
        <section className={styles.tarjeta} style={panel} aria-label="Objetos">
          <p className={styles.subtitulo}>Inventario</p>
          {objetos.length === 0 ? (
            <p className={styles.nota}>Todavía no tienes objetos. Compra abonos, herramientas y más en la Tienda.</p>
          ) : (
            <div className={styles.objetos}>
              {objetos.map(({ objeto, n }) => (
                <button
                  key={objeto.id}
                  type="button"
                  className={styles.objeto}
                  title={objeto.nombre}
                  aria-label={`${objeto.nombre}, ${n}`}
                  onClick={alIrATienda}
                >
                  <IconoObjeto celda={objeto.celda} k={1.5} />
                  <span className={styles.cantidad}>×{n}</span>
                </button>
              ))}
            </div>
          )}
          <p className={styles.nota}>Los objetos se usan y se equipan desde la Tienda.</p>
        </section>
      </div>
    </div>
  );
}
