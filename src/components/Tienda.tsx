"use client";

import { useState } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { CATALOGO, CATEGORIAS, type CategoriaTienda, type ObjetoTienda } from "@/lib/tienda";
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

function Tarjeta({ objeto, perfil, ocupado, alComprar, alEquipar, alUsar }: Props & { objeto: ObjetoTienda }) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");

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

  let etiqueta: { texto: string; fondo: string } | null = null;
  let principal: { texto: string; numero?: string; estilo: "boton" | "secundario" | "apagado"; accion?: () => void };

  if (!consumible && lo_tiene) {
    if (objeto.tipo === "herramienta") {
      etiqueta = { texto: "Comprado", fondo: "#1d6630" };
      principal = { texto: "La tienes", estilo: "apagado" };
    } else if (objeto.tipo === "decoracion") {
      etiqueta = puesto ? { texto: "Puesto", fondo: "#1d6630" } : { texto: "Comprado", fondo: "#1d6630" };
      principal = { texto: puesto ? "Quitar" : "Poner", estilo: "secundario", accion: () => alEquipar(objeto.id) };
    } else {
      etiqueta = puesto
        ? { texto: "En uso", fondo: "#1d6630" }
        : gratis
          ? null
          : { texto: "Comprado", fondo: "#1d6630" };
      principal = puesto
        ? { texto: "En uso", estilo: "apagado" }
        : { texto: "Poner", estilo: "secundario", accion: () => alEquipar(objeto.id) };
    }
  } else if (bloqueado) {
    etiqueta = { texto: `Nivel ${objeto.nivel}`, fondo: "#4b3a5e" };
    principal = { texto: `Nivel ${objeto.nivel}`, estilo: "apagado" };
  } else if (falta > 0) {
    etiqueta = { texto: "Monedas insuficientes", fondo: "#b9512a" };
    principal = { texto: "Faltan", numero: miles(falta), estilo: "apagado" };
  } else {
    principal = { texto: "Comprar", estilo: "boton", accion: () => alComprar(objeto.id) };
  }

  const estiloBoton = { boton, secundario, apagado }[principal.estilo];
  const inactivo = ocupado || !principal.accion;

  return (
    <article className={styles.tarjeta} style={tarjeta}>
      <div className={styles.cabecera}>
        <IconoObjeto celda={objeto.celda} k="var(--ik)" apagado={bloqueado && !lo_tiene} />
        {etiqueta && (
          <span className={styles.etiqueta} style={{ background: etiqueta.fondo }}>
            {etiqueta.texto}
          </span>
        )}
      </div>
      <h3 className={styles.nombre}>{bloqueado && !lo_tiene ? "???" : objeto.nombre}</h3>
      <p className={styles.efecto}>{objeto.efecto}</p>
      <div className={styles.precio} style={{ color: falta > 0 && !lo_tiene && !bloqueado ? "#b9512a" : undefined }}>
        <Icono id="moneda" k={1.5} />
        <span className={gratis ? undefined : "numero"}>{gratis ? "Gratis" : miles(objeto.precio)}</span>
        {consumible && cantidad > 0 && <span className={styles.cantidad}>Tienes {cantidad}</span>}
      </div>
      <div className={styles.botones}>
        <button
          type="button"
          className={styles.boton}
          style={{ ...estiloBoton, color: principal.estilo === "apagado" ? "#4b3a5e" : "#1c1626" }}
          disabled={inactivo}
          onClick={principal.accion}
        >
          {principal.texto}
          {principal.numero && <span className="numero"> {principal.numero}</span>}
        </button>
        {consumible && cantidad > 0 && objeto.categoria !== "fertilizantes" && (
          <button
            type="button"
            className={styles.boton}
            style={{ ...secundario, color: "#1c1626" }}
            disabled={ocupado}
            onClick={() => alUsar(objeto.id)}
          >
            Usar
          </button>
        )}
      </div>
    </article>
  );
}

export function Tienda(props: Props) {
  const [categoria, setCategoria] = useState<CategoriaTienda>("macetas");
  const normal = marco("pestana", "var(--u)");
  const activa = marco("pestana_activa", "var(--u)");

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
      <div className={styles.rejilla}>
        {CATALOGO.filter((o) => o.categoria === categoria && !o.exclusivo).map((o) => (
          <Tarjeta key={o.id} objeto={o} {...props} />
        ))}
      </div>
    </div>
  );
}
