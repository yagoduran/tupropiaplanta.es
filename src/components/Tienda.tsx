"use client";

import { useState } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import {
  CATALOGO,
  CATEGORIAS,
  RAREZAS,
  rarezaDe,
  type CategoriaTienda,
  type ObjetoTienda,
  type Rareza,
} from "@/lib/tienda";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./tienda.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alComprar: (id: string) => void;
  alEquipar: (id: string) => void;
  alUsar: (id: string) => void;
  aviso?: { texto: string; icono: IdIcono } | null;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

type Estilo = "boton" | "secundario" | "apagado";

interface Estado {
  etiqueta: { texto: string; fondo: string; color?: string } | null;
  principal: { texto: string; numero?: string; estilo: Estilo; accion?: () => void };
  bloqueado: boolean;
  lo_tiene: boolean;
  falta: number;
  cantidad: number;
  consumible: boolean;
  gratis: boolean;
}

type Acciones = Pick<Props, "alComprar" | "alEquipar" | "alUsar">;

function estadoDe(objeto: ObjetoTienda, perfil: PerfilJuego, { alComprar, alEquipar }: Acciones): Estado {
  const { equipo, inventario, monedas, nivel } = perfil;
  const consumible = objeto.tipo === "consumible";
  const gratis = objeto.precio === 0;
  const cantidad = inventario[objeto.id] ?? 0;
  const lo_tiene = gratis || cantidad > 0;
  const bloqueado = nivel < objeto.nivel;
  const falta = objeto.precio - monedas;
  const puesto =
    objeto.tipo === "maceta"
      ? equipo.maceta === objeto.id
      : objeto.tipo === "luz"
        ? equipo.luz === objeto.id
        : objeto.tipo === "decoracion"
          ? equipo.decoracion.includes(objeto.id)
          : false;

  let etiqueta: Estado["etiqueta"] = null;
  let principal: Estado["principal"];

  if (!consumible && lo_tiene) {
    if (objeto.tipo === "herramienta") {
      etiqueta = { texto: "Tuya", fondo: "#c9f26b", color: "#1c1626" };
      principal = { texto: "La tienes", estilo: "apagado" };
    } else if (objeto.tipo === "decoracion") {
      etiqueta = { texto: puesto ? "Puesta" : "Tuya", fondo: "#c9f26b", color: "#1c1626" };
      principal = { texto: puesto ? "Quitar" : "Poner", estilo: "secundario", accion: () => alEquipar(objeto.id) };
    } else {
      etiqueta = puesto
        ? { texto: "En uso", fondo: "#c9f26b", color: "#1c1626" }
        : gratis
          ? null
          : { texto: "Tuya", fondo: "#c9f26b", color: "#1c1626" };
      principal = puesto
        ? { texto: "En uso", estilo: "apagado" }
        : { texto: "Poner", estilo: "secundario", accion: () => alEquipar(objeto.id) };
    }
  } else if (bloqueado) {
    etiqueta = { texto: `Nivel ${objeto.nivel}`, fondo: "#f7b072", color: "#1c1626" };
    principal = { texto: `Se abre en nivel ${objeto.nivel}`, estilo: "apagado" };
  } else if (falta > 0) {
    principal = { texto: "Te faltan", numero: miles(falta), estilo: "apagado" };
  } else {
    principal = { texto: "Comprar", estilo: "boton", accion: () => alComprar(objeto.id) };
  }
  if (consumible && cantidad > 0) etiqueta = { texto: `Tienes ${cantidad}`, fondo: "#ffffff", color: "#1c1626" };

  return { etiqueta, principal, bloqueado, lo_tiene, falta, cantidad, consumible, gratis };
}

const rareza = (id: Rareza) => RAREZAS.find((r) => r.id === id)!;

function Tarjeta({ objeto, estado, alAbrir }: { objeto: ObjetoTienda; estado: Estado; alAbrir: () => void }) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const r = rareza(rarezaDe(objeto));
  const { etiqueta, bloqueado, lo_tiene, falta, gratis } = estado;
  const sinDinero = falta > 0 && !lo_tiene && !bloqueado;

  return (
    <button
      type="button"
      className={`${styles.tarjeta} ${styles[`rareza_${r.id}`] ?? ""}`}
      style={tarjeta}
      onClick={alAbrir}
      aria-label={`${bloqueado && !lo_tiene ? "Objeto bloqueado" : objeto.nombre}, ${r.nombre}`}
    >
      <span className={styles.franja} style={{ background: r.borde }} />
      <span className={styles.contenido}>
        <span className={styles.baldosa} style={{ boxShadow: `inset 0 0 0 calc(var(--u) * 1.5) ${r.borde}` }}>
          <IconoObjeto celda={objeto.celda} k="var(--ik)" apagado={bloqueado && !lo_tiene} />
          {etiqueta && (
            <span className={styles.etiqueta} style={{ background: etiqueta.fondo, color: etiqueta.color }}>
              {etiqueta.texto}
            </span>
          )}
        </span>
        <span className={styles.nombre}>{bloqueado && !lo_tiene ? "???" : objeto.nombre}</span>
        <span
          className={styles.precio}
          style={{ color: sinDinero ? "#b9512a" : lo_tiene && !gratis ? "#1d6630" : undefined }}
        >
          <Icono id="moneda" k={1.5} />
          <span className={gratis ? undefined : "numero"}>{gratis ? "Gratis" : miles(objeto.precio)}</span>
        </span>
      </span>
    </button>
  );
}

function Detalle({
  objeto,
  estado,
  ocupado,
  alCerrar,
  alUsar,
}: {
  objeto: ObjetoTienda;
  estado: Estado;
  ocupado: boolean;
  alCerrar: () => void;
  alUsar: (id: string) => void;
}) {
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const r = rareza(rarezaDe(objeto));
  const { principal, bloqueado, lo_tiene, falta, cantidad, consumible, gratis } = estado;
  const estiloBoton = { boton, secundario, apagado }[principal.estilo];
  const oculto = bloqueado && !lo_tiene;
  const puedeUsar = consumible && cantidad > 0 && objeto.categoria !== "fertilizantes";

  return (
    <div className={styles.velo} onClick={alCerrar}>
      <div
        className={styles.modal}
        style={panel}
        role="dialog"
        aria-modal="true"
        aria-label={oculto ? "Objeto bloqueado" : objeto.nombre}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalCabecera}>
          <span className={styles.modalBaldosa} style={{ boxShadow: `inset 0 0 0 calc(var(--u) * 2) ${r.borde}` }}>
            <IconoObjeto celda={objeto.celda} k="calc(var(--ik) * 1.5)" apagado={oculto} />
          </span>
          <div className={styles.modalTexto}>
            <span className={styles.chipRareza} style={{ background: r.fondo }}>
              {r.nombre}
            </span>
            <h2 className={styles.modalNombre}>{oculto ? "???" : objeto.nombre}</h2>
            <p className={styles.modalEfecto}>
              {oculto ? `Se abre al llegar al nivel ${objeto.nivel}.` : objeto.efecto}
            </p>
          </div>
        </div>
        <div className={styles.modalTotal}>
          <span>{lo_tiene && !consumible ? "Precio" : "Total"}</span>
          <span
            className={styles.precio}
            style={{ color: falta > 0 && !lo_tiene && !bloqueado ? "#b9512a" : undefined }}
          >
            <Icono id="moneda" k={1.5} />
            <span className={gratis ? undefined : "numero"}>{gratis ? "Gratis" : miles(objeto.precio)}</span>
          </span>
        </div>
        <div className={styles.botones}>
          <button type="button" className={styles.boton} style={{ ...secundario, color: "#1c1626" }} onClick={alCerrar}>
            Cerrar
          </button>
          {puedeUsar && (
            <button
              type="button"
              className={styles.boton}
              style={{ ...secundario, color: "#1c1626" }}
              disabled={ocupado}
              onClick={() => {
                alUsar(objeto.id);
                alCerrar();
              }}
            >
              Usar
            </button>
          )}
          <button
            type="button"
            className={styles.boton}
            style={{ ...estiloBoton, color: principal.estilo === "apagado" ? "#4b3a5e" : "#1c1626" }}
            disabled={ocupado || !principal.accion}
            onClick={() => {
              principal.accion?.();
              alCerrar();
            }}
          >
            {principal.texto}
            {principal.numero && <span className="numero"> {principal.numero}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tienda(props: Props) {
  const [categoria, setCategoria] = useState<CategoriaTienda>("macetas");
  const [filtro, setFiltro] = useState<Rareza | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const normal = marco("pestana", "var(--u)");
  const activa = marco("pestana_activa", "var(--u)");
  const acciones = { alComprar: props.alComprar, alEquipar: props.alEquipar, alUsar: props.alUsar };

  const deCategoria = CATALOGO.filter((o) => o.categoria === categoria && !o.exclusivo);
  const visibles = filtro ? deCategoria.filter((o) => rarezaDe(o) === filtro) : deCategoria;
  const objetoAbierto = abierto ? CATALOGO.find((o) => o.id === abierto) : undefined;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabeceraPagina}>
        <h1 className={styles.titulo}>Tienda</h1>
        {props.aviso && (
          <p className={styles.aviso} role="status">
            <Icono id={props.aviso.icono} />
            <span>{props.aviso.texto}</span>
          </p>
        )}
      </div>
      <div className={styles.categorias} role="tablist" aria-label="Categorías">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === categoria}
            className={styles.categoria}
            style={{ ...(c.id === categoria ? activa : normal), color: c.id === categoria ? "#1c1626" : "#f6eed6" }}
            onClick={() => setCategoria(c.id)}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>
      <div className={styles.filtros} role="group" aria-label="Filtrar por rareza">
        <button
          type="button"
          className={styles.chip}
          aria-pressed={filtro === null}
          style={{ background: "#f6eed6" }}
          onClick={() => setFiltro(null)}
        >
          Todas
        </button>
        {RAREZAS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={styles.chip}
            aria-pressed={filtro === r.id}
            style={{ background: r.fondo }}
            onClick={() => setFiltro(filtro === r.id ? null : r.id)}
          >
            {r.nombre}
          </button>
        ))}
      </div>
      {visibles.length === 0 ? (
        <p className={styles.vacio}>
          <span>No hay objetos con esa rareza aquí</span>
          <button type="button" className={styles.quitar} onClick={() => setFiltro(null)}>
            Quitar el filtro
          </button>
        </p>
      ) : (
        <div className={styles.rejilla}>
          {visibles.map((o) => (
            <Tarjeta
              key={o.id}
              objeto={o}
              estado={estadoDe(o, props.perfil, acciones)}
              alAbrir={() => setAbierto(o.id)}
            />
          ))}
        </div>
      )}
      {objetoAbierto && (
        <Detalle
          objeto={objetoAbierto}
          estado={estadoDe(objetoAbierto, props.perfil, acciones)}
          ocupado={props.ocupado}
          alCerrar={() => setAbierto(null)}
          alUsar={props.alUsar}
        />
      )}
    </div>
  );
}
