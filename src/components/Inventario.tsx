"use client";

import { HABITACION_POR_ID } from "@/lib/casa";
import { FASES, marco } from "@/lib/diseno";
import { duracionCorta, textoEfecto, type PantallaJuego, type PerfilJuego } from "@/lib/juego";
import type { DatosPerfil } from "@/lib/perfil";
import { OBJETO_POR_ID, usoDe } from "@/lib/tienda";
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
  alVender: (variedad: string, gramos: number | null) => void;
  alIrAEncargos: () => void;
  alUsar: (id: string) => void;
  alEquipar: (id: string) => void;
  alIrAAbonos: () => void;
}

/** Inventario: tus huecos de cultivo y los objetos que tienes. */
export function Inventario({
  perfil,
  plantas,
  ocupado,
  alIrAHueco,
  alAmpliar,
  alIrATienda,
  alVender,
  alIrAEncargos,
  alUsar,
  alEquipar,
  alIrAAbonos,
}: Props) {
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const { huecos, inventario } = perfil;
  const gramos = Object.entries(perfil.almacen ?? {}).filter(([id, g]) => g > 0 && VARIEDAD_POR_ID[id]);
  const objetos = Object.entries(inventario)
    .filter(([id, n]) => n > 0 && OBJETO_POR_ID[id])
    .map(([id, n]) => ({ objeto: OBJETO_POR_ID[id], n }));

  // Objetos de los eventos al volver: semillas regaladas, abono casero y ventilador.
  const semillas = Object.entries(inventario)
    .filter(([id, n]) => n > 0 && id.startsWith("semilla:"))
    .map(([id, n]) => ({ id, n, variedad: VARIEDAD_POR_ID[id.split(":")[1]]?.nombre ?? id.split(":")[1] }));

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
                    <span>
                      {HABITACION_POR_ID[h.habitacion]?.nombre} · {h.sitio}
                    </span>
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
                  <span>
                    {HABITACION_POR_ID[h.habitacion]?.nombre} · {h.sitio}
                  </span>
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
                <span>Casa</span>
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
        <section className={styles.tarjeta} style={panel} aria-label="Gramos guardados">
          <p className={styles.subtitulo}>Gramos guardados</p>
          {gramos.length === 0 ? (
            <p className={styles.nota}>
              No tienes gramos guardados. Al cosechar puedes elegir guardarlos para los encargos.
            </p>
          ) : (
            <div className={styles.gramos}>
              {gramos.map(([id, g]) => (
                <div key={id} className={styles.gramosFila}>
                  <span className={styles.gramosDatos}>
                    <span>
                      <strong>{VARIEDAD_POR_ID[id].nombre}</strong>
                      <span className="numero"> · {g} g</span>
                    </span>
                    <span className={styles.gramosPrecio}>
                      {Math.round(6 * VARIEDAD_POR_ID[id].recompensa)} monedas/g
                    </span>
                  </span>
                  <span className={styles.gramosBotones}>
                    <button
                      type="button"
                      className={styles.accion}
                      style={secundario}
                      disabled={ocupado || g < 10}
                      onClick={() => alVender(id, 10)}
                    >
                      Vender 10 g
                    </button>
                    <button
                      type="button"
                      className={styles.accion}
                      style={secundario}
                      disabled={ocupado}
                      onClick={() => alVender(id, null)}
                    >
                      Vender todo
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className={styles.nota}>
            Cada variedad se vende a un precio por gramo distinto: cuanto más rara, más vale. En un encargo se paga casi
            el doble y da experiencia.
          </p>
          <button type="button" className={styles.accion} style={secundario} onClick={alIrAEncargos}>
            Ver encargos
          </button>
        </section>
        <section className={styles.tarjeta} style={panel} aria-label="Objetos">
          <p className={styles.subtitulo}>Inventario</p>
          <p className={styles.nota}>
            Ánimo de la casa: <strong>{perfil.animo ?? 0}</strong> · experiencia ×
            {(perfil.xp_mult ?? 1).toLocaleString("es-ES", { minimumFractionDigits: 2 })}. La decoración colocada da
            ánimo, y cada punto es +1 % de experiencia.
          </p>
          {(perfil.efectos ?? []).length > 0 && (
            <div className={styles.gramos} aria-label="Efectos activos">
              {(perfil.efectos ?? []).map((e, i) => {
                const t = textoEfecto(e);
                return (
                  <div key={i} className={styles.gramosFila}>
                    <span className={styles.gramosDatos}>
                      <strong style={{ color: t.bueno ? "#2d7a2f" : "#b9512a" }}>{t.texto}</strong>
                      <span className={styles.gramosPrecio}>quedan {duracionCorta(e.resta)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {objetos.length === 0 && semillas.length === 0 ? (
            <p className={styles.nota}>Todavía no tienes objetos. Compra abonos, herramientas y más en la Tienda.</p>
          ) : (
            <div className={styles.gramos}>
              {objetos.map(({ objeto, n }) => {
                const uso = usoDe(objeto);
                const puesto = objeto.tipo === "decoracion" ? perfil.equipo.decoracion.includes(objeto.id) : false;
                const accion =
                  uso === "casa"
                    ? { texto: "Usar", hacer: () => alUsar(objeto.id) }
                    : uso === "planta"
                      ? { texto: "Aplicar", hacer: alIrAAbonos }
                      : uso === "plaga"
                        ? { texto: "Tratar plaga", hacer: () => alUsar(objeto.id) }
                        : objeto.tipo === "maceta"
                          ? { texto: "Poner", hacer: () => alEquipar(objeto.id) }
                          : objeto.tipo === "decoracion"
                            ? { texto: puesto ? "Quitar" : "Colocar", hacer: () => alEquipar(objeto.id) }
                            : null;
                return (
                  <div key={objeto.id} className={styles.gramosFila}>
                    <IconoObjeto celda={objeto.celda} hoja={objeto.hoja} k={1.5} />
                    <span className={styles.gramosDatos}>
                      <strong>
                        {objeto.nombre} ×{n}
                        {puesto ? " · colocado" : ""}
                      </strong>
                      <span className={styles.gramosPrecio}>{objeto.efecto}</span>
                    </span>
                    {accion && (
                      <button
                        type="button"
                        className={styles.accion}
                        style={secundario}
                        disabled={ocupado}
                        onClick={accion.hacer}
                      >
                        {accion.texto}
                      </button>
                    )}
                  </div>
                );
              })}
              {semillas.map((x) => (
                <div key={x.id} className={styles.gramosFila}>
                  <span className={styles.gramosDatos}>
                    <strong>
                      Semilla de {x.variedad} ×{x.n}
                    </strong>
                    <span className={styles.gramosPrecio}>
                      Se planta gratis desde Semillas, aunque no tengas el nivel.
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className={styles.nota}>
            Las herramientas hacen efecto solo con tenerlas. Las macetas se ponen en el hueco activo.
          </p>
          <button type="button" className={styles.accion} style={secundario} onClick={alIrATienda}>
            Ir a la Tienda
          </button>
        </section>
      </div>
    </div>
  );
}
