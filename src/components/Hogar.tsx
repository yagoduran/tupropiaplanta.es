"use client";

import { useState } from "react";
import { HABITACIONES, HABITACION_POR_ID, PLANTAS_CASA, type Habitacion } from "@/lib/casa";
import { calidadPrevista } from "@/lib/calidad";
import { FASES, marco } from "@/lib/diseno";
import type { PantallaJuego, PerfilJuego } from "@/lib/juego";
import { RAREZAS, VARIEDAD_POR_ID, hojaDe } from "@/lib/variedades";
import { ArmarioCultivo } from "./ArmarioCultivo";
import { Estrellas } from "./Estrellas";
import { Icono } from "./Icono";
import { IconoHogar } from "./IconoHogar";
import styles from "./hogar.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alIrAHueco: (hueco: number, destino: PantallaJuego) => void;
  alMover: (desde: number, hacia: number) => void;
  alDesbloquear: (id: string) => void;
}

type Sitio = PerfilJuego["huecos"]["lista"][number];

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function Miniatura({ sitio, tam }: { sitio: Sitio; tam: number }) {
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        width: tam,
        height: tam,
        backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(sitio.variedad ?? "")}-1x.png)`,
        backgroundSize: "600% 800%",
        backgroundPosition: `0 ${(((sitio.fase ?? 1) - 1) / 7) * 100}%`,
      }}
    />
  );
}

function Barra({ nombre, valor, color }: { nombre: string; valor: number; color: string }) {
  return (
    <div className={styles.barra}>
      <span>{nombre}</span>
      <span className={styles.pista}>
        <span style={{ width: `${Math.max(0, Math.min(100, valor))}%`, background: color }} />
      </span>
      <span className="numero">{Math.round(valor)} %</span>
    </div>
  );
}

/** El hogar en corte: todas las habitaciones con sus plantas, y un modo para moverlas. */
export function Hogar({ perfil, ocupado, alIrAHueco, alMover, alDesbloquear }: Props) {
  const [planta, setPlanta] = useState<Habitacion["planta"]>(HABITACION_POR_ID[perfil.casa.habitacion]?.planta ?? "p1");
  const [editando, setEditando] = useState(false);
  const [origen, setOrigen] = useState<number | null>(null);
  const [ultimo, setUltimo] = useState<{ desde: number; hacia: number } | null>(null);
  const [ficha, setFicha] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<Habitacion | null>(null);

  const { huecos, casa } = perfil;
  const sitios = huecos.lista;
  const deHabitacion = (id: string) => sitios.filter((s) => s.habitacion === id).sort((a, b) => a.sitio - b.sitio);
  const viva = (s: Sitio) => s.vida === "viva";
  const fichaSitio = ficha !== null ? sitios.find((s) => s.hueco === ficha && viva(s)) : undefined;

  const mover = (desde: number, hacia: number) => {
    if (desde === hacia || ocupado) return;
    setUltimo({ desde, hacia });
    setOrigen(null);
    alMover(desde, hacia);
  };

  const pulsar = (s: Sitio) => {
    if (editando) {
      if (origen === null) {
        if (viva(s)) setOrigen(s.hueco);
      } else if (origen === s.hueco) setOrigen(null);
      else mover(origen, s.hueco);
      return;
    }
    if (viva(s)) setFicha(s.hueco);
    else alIrAHueco(s.hueco, "semillas");
  };

  const terminar = () => {
    setEditando(false);
    setOrigen(null);
    setUltimo(null);
  };

  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const panel = marco("panel", "var(--u)");

  const requisitos = (h: Habitacion) => {
    const nivelOk = perfil.nivel >= h.nivel;
    const monedasOk = perfil.monedas >= h.precio;
    const llave = !h.bloqueada || !!perfil.prestigio.bonos.key;
    return { nivelOk, monedasOk, llave, puede: nivelOk && monedasOk && llave };
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Hogar</h1>
        <div className={styles.herramientas}>
          {editando && (
            <button
              type="button"
              className={styles.boton}
              style={ultimo && !ocupado ? secundario : apagado}
              disabled={!ultimo || ocupado}
              onClick={() => {
                if (!ultimo) return;
                alMover(ultimo.hacia, ultimo.desde);
                setUltimo(null);
              }}
            >
              Deshacer
            </button>
          )}
          <button
            type="button"
            className={styles.boton}
            style={editando ? boton : secundario}
            aria-pressed={editando}
            onClick={() => (editando ? terminar() : setEditando(true))}
          >
            {editando ? "Hecho" : "Editar hogar"}
          </button>
        </div>
      </div>
      {editando && (
        <p className={styles.ayuda} role="status">
          {origen === null
            ? "Elige una planta y luego el sitio al que quieres llevarla. Si está ocupado, se intercambian."
            : "Ahora toca el sitio de destino (o arrastra la planta)."}
        </p>
      )}

      <div className={styles.pestanas} role="tablist" aria-label="Plantas de la casa">
        {PLANTAS_CASA.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={planta === p.id}
            className={styles.pestana}
            style={marco(planta === p.id ? "pestana_activa" : "pestana", "var(--u)")}
            onClick={() => setPlanta(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div className={styles.casa}>
        {PLANTAS_CASA.map((p) => (
          <div key={p.id} className={`${styles.piso} ${planta === p.id ? styles.pisoVisible : ""}`}>
            <span className={styles.etiquetaPiso}>{p.nombre}</span>
            <div className={styles.habitaciones}>
              {HABITACIONES.filter((h) => h.planta === p.id).map((h) => {
                const mia = casa.habitaciones.includes(h.id);
                const lista = deHabitacion(h.id);
                const req = requisitos(h);
                const usados = lista.filter(viva).length;
                return (
                  <section
                    key={h.id}
                    className={styles.habitacion}
                    style={{
                      gridColumn: h.columnas,
                      background: h.pared,
                      color: h.texto,
                      boxShadow: `inset 0 calc(var(--u) * -6) 0 ${h.suelo}`,
                    }}
                    aria-label={h.nombre}
                  >
                    <header className={styles.cabeceraHab}>
                      <strong className={styles.nombreHab}>
                        <IconoHogar id={h.id} k={1.5} />
                        {h.nombre}
                      </strong>
                      {mia && (
                        <span className="numero">
                          {usados}/{lista.length}
                        </span>
                      )}
                    </header>
                    {mia ? (
                      <>
                        <div className={styles.sitios}>
                          {lista.map((s) => {
                            const v = viva(s);
                            const sel = origen === s.hueco;
                            const destino = editando && origen !== null && !sel;
                            return (
                              <button
                                key={s.hueco}
                                type="button"
                                className={[
                                  styles.sitio,
                                  v ? styles.sitioOcupado : styles.sitioVacio,
                                  sel ? styles.sitioSel : "",
                                  destino ? styles.sitioDestino : "",
                                  huecos.activo === s.hueco ? styles.sitioActivo : "",
                                ].join(" ")}
                                disabled={ocupado}
                                draggable={editando && v}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", String(s.hueco));
                                  setOrigen(s.hueco);
                                }}
                                onDragOver={(e) => editando && e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const d = Number(e.dataTransfer.getData("text/plain"));
                                  if (editando && Number.isFinite(d)) mover(d, s.hueco);
                                }}
                                onClick={() => pulsar(s)}
                                aria-label={
                                  v
                                    ? `${VARIEDAD_POR_ID[s.variedad ?? ""]?.nombre ?? "Planta"}, sitio ${s.sitio}`
                                    : `Sitio ${s.sitio} libre`
                                }
                              >
                                {v ? <Miniatura sitio={s} tam={48} /> : <span className={styles.mas}>+</span>}
                                {v && (s.plaga || (s.agua ?? 100) < 25) && (
                                  <span className={styles.insignia} aria-hidden>
                                    <Icono id={s.plaga ? "aviso" : "agua"} k={1} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <p className={styles.bono}>{h.descripcion}</p>
                      </>
                    ) : (
                      <div className={styles.candado}>
                        <Icono id="candado" k={2} />
                        <ul className={styles.req}>
                          <li className={req.nivelOk ? styles.ok : styles.no}>Nivel {h.nivel}</li>
                          {h.precio > 0 && (
                            <li className={req.monedasOk ? styles.ok : styles.no}>{miles(h.precio)} monedas</li>
                          )}
                          {h.bloqueada && <li className={req.llave ? styles.ok : styles.no}>{h.bloqueada}</li>}
                        </ul>
                        <button
                          type="button"
                          className={styles.boton}
                          style={req.puede && !ocupado ? boton : apagado}
                          disabled={!req.puede || ocupado}
                          onClick={() => setConfirmar(h)}
                        >
                          {req.puede
                            ? `Desbloquear${h.precio > 0 ? ` · ${miles(h.precio)}` : ""}`
                            : !req.nivelOk
                              ? `Nivel ${h.nivel}`
                              : !req.monedasOk
                                ? `Te faltan ${miles(h.precio - perfil.monedas)}`
                                : "Bloqueada"}
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ArmarioCultivo sitios={deHabitacion("armario")} maceta={perfil.equipo.maceta} alPulsar={pulsar} />

      {fichaSitio && !editando && (
        <div className={styles.velo} onClick={() => setFicha(null)}>
          <div
            className={styles.ficha}
            style={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Ficha de la planta"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const v = VARIEDAD_POR_ID[fichaSitio.variedad ?? ""];
              const r = v ? RAREZAS[v.rareza] : null;
              return (
                <>
                  <div className={styles.fichaCabeza}>
                    <Miniatura sitio={fichaSitio} tam={80} />
                    <div className={styles.fichaTexto}>
                      {r && (
                        <span className={styles.chip} style={{ background: r.fondo, color: r.texto }}>
                          {r.etiqueta}
                        </span>
                      )}
                      <h2 className={styles.fichaNombre}>{v?.nombre ?? "Planta"}</h2>
                      <span>
                        Fase {fichaSitio.fase} · {FASES[(fichaSitio.fase ?? 1) - 1]}
                      </span>
                      <span>
                        {HABITACION_POR_ID[fichaSitio.habitacion]?.nombre} · sitio {fichaSitio.sitio}
                      </span>
                    </div>
                  </div>
                  {fichaSitio.plaga && <p className={styles.alerta}>Tiene plaga: trátala cuanto antes.</p>}
                  <Barra nombre="Agua" valor={fichaSitio.agua ?? 0} color="#4aa3e0" />
                  <Barra nombre="Nutrientes" valor={fichaSitio.nutrientes ?? 0} color="#8bc34a" />
                  <Barra nombre="Luz" valor={fichaSitio.luz ?? 0} color="#f4d36a" />
                  <Barra nombre="Salud" valor={fichaSitio.salud ?? 0} color="#e0635a" />
                  <div className={styles.calidad}>
                    <span>Calidad prevista</span>
                    <Estrellas calidad={calidadPrevista(fichaSitio.salud ?? 0)} k={2} />
                  </div>
                  <p className={styles.cuidado}>Quién la cuida: Tú · Riegas y abonas a mano.</p>
                  <div className={styles.botones}>
                    <button type="button" className={styles.boton} style={secundario} onClick={() => setFicha(null)}>
                      Cerrar
                    </button>
                    <button
                      type="button"
                      className={styles.boton}
                      style={secundario}
                      onClick={() => {
                        setEditando(true);
                        setOrigen(fichaSitio.hueco);
                        setFicha(null);
                      }}
                    >
                      <IconoHogar id="mover" k={1} /> Mover
                    </button>
                    <button
                      type="button"
                      className={styles.boton}
                      style={boton}
                      onClick={() => {
                        const h = fichaSitio.hueco;
                        setFicha(null);
                        alIrAHueco(h, "cultivo");
                      }}
                    >
                      Cultivar esta planta
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {confirmar && (
        <div className={styles.velo} onClick={() => setConfirmar(null)}>
          <div
            className={styles.ficha}
            style={panel}
            role="dialog"
            aria-modal="true"
            aria-label={`Desbloquear ${confirmar.nombre}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.fichaNombre}>Desbloquear {confirmar.nombre}</h2>
            <p>{confirmar.descripcion}</p>
            <p>
              <strong>{confirmar.macetas}</strong> sitios para plantas
              {confirmar.precio > 0 && (
                <>
                  {" "}
                  · cuesta <span className="numero">{miles(confirmar.precio)}</span> monedas
                </>
              )}
              .
            </p>
            <div className={styles.botones}>
              <button type="button" className={styles.boton} style={secundario} onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.boton}
                style={boton}
                disabled={ocupado}
                onClick={() => {
                  alDesbloquear(confirmar.id);
                  setConfirmar(null);
                }}
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
