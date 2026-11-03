"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import {
  COLUMNA_EVENTO,
  ETIQUETA_RESULTADO,
  EVENTOS,
  ICONOS_EVENTO,
  cuando,
  type Chip,
  type DatosVuelta,
  type Decidido,
  type IconoEvento,
  type TipoEvento,
} from "@/lib/vuelta";
import styles from "./vuelta.module.css";

function Icono({ id, k = 2 }: { id: IconoEvento; k?: number }) {
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: 16 * k,
        height: 16 * k,
        backgroundImage: "url(/assets/eventos/tpp-eventos-iconos-16-1x.png)",
        backgroundSize: `${256 * k}px ${16 * k}px`,
        backgroundPosition: `-${ICONOS_EVENTO.indexOf(id) * 16 * k}px 0`,
      }}
    />
  );
}

function Ilustracion({ tipo, fila, k = 2 }: { tipo: TipoEvento; fila: 0 | 1; k?: number }) {
  return (
    <span
      className="pixel"
      role="img"
      aria-label={EVENTOS[tipo].t}
      style={{
        display: "block",
        flex: "none",
        width: 64 * k,
        height: 64 * k,
        backgroundImage: "url(/assets/eventos/tpp-eventos-ilustraciones-64-1x.png)",
        backgroundSize: `${384 * k}px ${128 * k}px`,
        backgroundPosition: `-${COLUMNA_EVENTO[tipo] * 64 * k}px -${fila * 64 * k}px`,
      }}
    />
  );
}

function Chips({ chips }: { chips: Chip[] }) {
  return (
    <span className={styles.chips}>
      {chips.map(([icono, texto, malo]) => (
        <span key={icono + texto} className={styles.chip} style={{ background: malo ? "#f7b072" : "#c9f26b" }}>
          <Icono id={icono} />
          {texto}
        </span>
      ))}
    </span>
  );
}

function Insignia({ resultado }: { resultado: Decidido["resultado"] }) {
  const [texto, color] = ETIQUETA_RESULTADO[resultado];
  return (
    <span className={styles.insignia} style={{ background: color }}>
      {texto}
    </span>
  );
}

interface Props {
  modo: "vuelta" | "registro";
  datos: DatosVuelta | null;
  monedas: number;
  ocupado: boolean;
  alDecidir: (id: number, opcion: number) => Promise<{ ok: boolean; falta?: number; resultado?: string }>;
  alCerrar: () => void;
  alVerRegistro: () => void;
}

/** Bloque 8f: «Mientras no estabas…» y registro de los 30 últimos eventos. */
export function EventosVuelta(props: Props) {
  const { datos, modo } = props;
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>{modo === "vuelta" ? "Mientras no estabas…" : "Registro de eventos"}</h1>
        <p className={styles.nota}>Cargando…</p>
      </div>
    );
  }
  return modo === "registro" ? (
    <Registro datos={datos} />
  ) : (
    <Vuelta key={datos.pendientes.map((p) => p.id).join()} {...props} datos={datos} />
  );
}

function Vuelta({ datos, monedas, ocupado, alDecidir, alCerrar, alVerRegistro }: Props & { datos: DatosVuelta }) {
  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  // Los eventos que había al abrir la pantalla; los resueltos se quedan para enseñar el resultado.
  const [cola] = useState(datos.pendientes);
  const [paso, setPaso] = useState<"resumen" | number | "fin">(cola.length ? "resumen" : "fin");
  const [elegida, setElegida] = useState<Record<number, number>>({});
  const [falta, setFalta] = useState<number | null>(null);
  const [hechas, setHechas] = useState<Decidido[]>([]);

  const r = datos.resumen;
  const horas = r ? Math.floor(r.horas) : 0;
  const minutos = r ? Math.round((r.horas - horas) * 60) : 0;

  if (paso === "resumen") {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Mientras no estabas…</h1>
        <section className={styles.bloque} style={panel}>
          <div className={styles.estadisticas}>
            <span className={styles.estadistica}>
              <Icono id="tiempo" />
              <strong>
                {horas} h {minutos} min
              </strong>
              <small>fuera</small>
            </span>
            <span className={styles.estadistica}>
              <Icono id="crecimiento" />
              <strong>+{r?.crecimiento ?? 0} h</strong>
              <small>de crecimiento</small>
            </span>
            <span className={styles.estadistica}>
              <Icono id="agua" />
              <strong>{r?.agua ?? 0} %</strong>
              <small>de agua</small>
            </span>
            <span className={styles.estadistica}>
              <Icono id="ok" />
              <strong>{r?.secado_listos ?? 0}</strong>
              <small>secando, listas</small>
            </span>
          </div>
          <div className={styles.lista}>
            <p className={styles.subtitulo}>Eventos de esta vuelta</p>
            {cola.map((e) => (
              <span key={e.id} className={styles.fila}>
                <Icono id={e.tipo} />
                {EVENTOS[e.tipo].t}
              </span>
            ))}
          </div>
          <button type="button" className={styles.accion} style={boton} onClick={() => setPaso(0)}>
            Ver el primer evento
          </button>
        </section>
      </div>
    );
  }

  if (paso === "fin") {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Todo al día</h1>
        <section className={styles.bloque} style={panel}>
          <p className={styles.nota}>
            {hechas.length ? "Has resuelto los eventos de esta ausencia." : "No hay eventos pendientes."}
          </p>
          {hechas.map((h, i) => (
            <span key={i} className={styles.fila}>
              <Icono id={h.tipo} />
              <span className={styles.filaTexto}>
                <strong>{EVENTOS[h.tipo].t}</strong>
                <small>{EVENTOS[h.tipo].ops[h.op].l}</small>
              </span>
              <Insignia resultado={h.resultado} />
            </span>
          ))}
          <div className={styles.botones}>
            <button type="button" className={styles.accion} style={boton} onClick={alCerrar}>
              Volver a casa
            </button>
            <button type="button" className={styles.accion} style={secundario} onClick={alVerRegistro}>
              Ver registro
            </button>
          </div>
        </section>
      </div>
    );
  }

  const evento = cola[paso];
  const def = EVENTOS[evento.tipo];
  const op = elegida[evento.id];
  const resuelto = op !== undefined ? def.ops[op] : null;
  const siguiente = () => (paso + 1 < cola.length ? setPaso(paso + 1) : setPaso("fin"));

  const decidir = async (i: number) => {
    setFalta(null);
    const res = await alDecidir(evento.id, i);
    if (!res.ok) {
      if (res.falta) setFalta(res.falta);
      return;
    }
    setElegida((e) => ({ ...e, [evento.id]: i }));
    const coste = def.ops[i].coste;
    setHechas((h) => [
      ...h,
      {
        tipo: evento.tipo,
        op: i,
        coste,
        resultado: (res.resultado as Decidido["resultado"]) ?? "resuelto",
        en: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className={styles.contenedor}>
      <h1 className={styles.titulo}>
        Evento {paso + 1} de {cola.length}
      </h1>
      <section className={styles.bloque} style={panel}>
        <div className={styles.cabeza}>
          <Ilustracion tipo={evento.tipo} fila={resuelto ? resuelto.img : 0} />
          <div className={styles.cabezaTexto}>
            <span className={styles.subtitulo}>
              <Icono id={evento.tipo} />
              {resuelto ? "Resultado" : "Ha pasado"}
            </span>
            <h2 className={styles.evento}>{resuelto ? resuelto.rt : def.t}</h2>
            <p className={styles.texto}>{resuelto ? resuelto.rd : def.d}</p>
          </div>
        </div>
        {!resuelto && def.ya.length > 0 && (
          <div className={styles.ya}>
            <span className={styles.subtitulo}>Ya ha pasado</span>
            <Chips chips={def.ya} />
          </div>
        )}
        {resuelto ? (
          <>
            <Chips chips={resuelto.fx} />
            <p className={styles.nota}>Queda guardado en el registro.</p>
            <button type="button" className={styles.accion} style={boton} onClick={siguiente}>
              {paso + 1 < cola.length ? "Siguiente evento" : "Terminar"}
            </button>
          </>
        ) : (
          <div className={styles.opciones}>
            {def.ops.map((o, i) => {
              const sinDinero = o.coste > monedas;
              return (
                <button
                  key={o.l}
                  type="button"
                  className={styles.opcion}
                  style={sinDinero ? marco("boton_desactivado", "var(--u)") : tarjeta}
                  disabled={ocupado || sinDinero}
                  onClick={() => decidir(i)}
                >
                  <span className={styles.opcionCabeza}>
                    <strong>{o.l}</strong>
                    <span className={styles.coste}>
                      {o.coste > 0 ? (
                        <>
                          <Icono id="monedas" k={1} />
                          {o.coste.toLocaleString("es-ES")}
                        </>
                      ) : o.costeTexto ? (
                        <>
                          <Icono id={o.costeIcono ?? "tiempo"} k={1} />
                          {o.costeTexto}
                        </>
                      ) : (
                        "Gratis"
                      )}
                    </span>
                  </span>
                  <span className={styles.opcionEf}>{o.ef}</span>
                  {sinDinero && <span className={styles.falta}>Te faltan {o.coste - monedas} monedas</span>}
                </button>
              );
            })}
          </div>
        )}
        {falta !== null && <p className={styles.falta}>Te faltan {falta} monedas.</p>}
      </section>
    </div>
  );
}

type Filtro = "todos" | Decidido["resultado"];

function Registro({ datos }: { datos: DatosVuelta }) {
  const panel = marco("panel", "var(--u)");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ahora] = useState(() => Date.now());
  const filtros: [Filtro, string][] = [
    ["todos", "Todos"],
    ["resuelto", "Resueltos"],
    ["gasto", "Con gasto"],
    ["asumido", "Asumidos"],
  ];
  const lista = datos.registro.filter((r) => filtro === "todos" || r.resultado === filtro);
  return (
    <div className={styles.contenedor}>
      <h1 className={styles.titulo}>Registro de eventos</h1>
      <section className={styles.bloque} style={panel}>
        <div className={styles.filtros}>
          {filtros.map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              className={`${styles.filtro} ${filtro === id ? styles.filtroOn : ""}`}
              onClick={() => setFiltro(id)}
            >
              {nombre}
            </button>
          ))}
        </div>
        {lista.length === 0 && <p className={styles.nota}>Ningún evento con este filtro.</p>}
        {lista.map((r, i) => (
          <span key={i} className={styles.fila}>
            <Icono id={r.tipo} />
            <span className={styles.filaTexto}>
              <strong>{EVENTOS[r.tipo].t}</strong>
              <small>
                {cuando(r.en, ahora)} · Elegiste: {EVENTOS[r.tipo].ops[r.op]?.l}
              </small>
            </span>
            <Insignia resultado={r.resultado} />
          </span>
        ))}
        <p className={styles.nota}>Se guardan los 30 últimos.</p>
      </section>
    </div>
  );
}
