"use client";

import { useState } from "react";
import { cerrarSesion } from "@/app/acciones";
import { marco } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import { avatarDe } from "@/lib/perfil";
import type { ReactNode } from "react";
import { Beta } from "./Beta";
import { URL_DONAR, donarActivo } from "@/lib/donar";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./juego.module.css";

const OPCIONES_MENU = [
  ["perfil", "Mi perfil"],
  ["plantas", "Mis plantas"],
  ["inventario", "Inventario"],
  ["estadisticas", "Estadísticas"],
  ["coleccion", "Colección"],
  ["titulos", "Títulos y marcos"],
  ["misiones", "Misiones"],
  ["encargos", "Móvil"],
  ["eventos", "Eventos"],
  ["pase", "Pase de temporada"],
  ["amigos", "Amigos"],
  ["mercado", "Mercado"],
  ["desafios", "Desafíos"],
  ["armario", "Mejoras del armario"],
  ["habitaciones", "Habitaciones"],
  ["laboratorio", "Laboratorio de cruces"],
  ["maestria", "Maestría"],
  ["prestigio", "Prestigio"],
] as const;

interface Props {
  monedas: number;
  nivel: number;
  prestigio?: number;
  xp: number;
  usuario: string;
  avatar?: string;
  /** Misiones completadas por reclamar. */
  misionesListas?: number;
  /** Campana de avisos. */
  campana?: ReactNode;
  alAbrir: (pantalla: PantallaJuego) => void;
}

export function Cabecera({
  monedas,
  nivel,
  prestigio = 0,
  xp,
  usuario,
  avatar,
  misionesListas = 0,
  campana,
  alAbrir,
}: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const panel = marco("panel", "var(--u)");
  const barra = marco("barra", "var(--u)");

  return (
    <header className={styles.cabecera}>
      <div className={styles.cabeceraLogo} style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo/tpp-logo-horizontal-oscuro-1x.png" alt="Tu Propia Planta" />
        <Beta pequena />
      </div>

      <div className={styles.cabeceraCentro}>
        <div className={styles.cabeceraDato} data-tut="monedas">
          <Icono id="moneda" />
          <span className="numero">{monedas.toLocaleString("es-ES", { useGrouping: "always" })}</span>
        </div>
        <div className={`${styles.cabeceraDato} ${styles.datoNivel}`}>
          <Icono id="nivel" />
          <span className="numero">
            Nv. {nivel}
            {prestigio > 0 ? ` · P${prestigio}` : ""}
          </span>
          <div className={styles.xp} style={{ ...barra, background: barra.background }}>
            <div className={styles.xpRelleno} style={{ width: `${xp}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.cabeceraUsuario}>
        {campana}
        <button
          type="button"
          className={styles.usuarioBoton}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          <span className={styles.avatar} style={panel}>
            <IconoObjeto celda={avatarDe(avatar).celda} k="var(--ik)" tamano={16} />
          </span>
          <span className={styles.nombreUsuario}>{usuario}</span>
          <Icono id="menu" />
        </button>
        {menuAbierto && (
          <ul className={styles.menu} style={panel}>
            {OPCIONES_MENU.map(([id, texto]) => (
              <li key={id}>
                <button
                  type="button"
                  className={styles.menuOpcion}
                  onClick={() => {
                    setMenuAbierto(false);
                    alAbrir(id);
                  }}
                >
                  {texto}
                  {id === "misiones" && misionesListas > 0 ? ` (${misionesListas})` : ""}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={styles.menuOpcion}
                onClick={() => {
                  setMenuAbierto(false);
                  alAbrir("ajustes");
                }}
              >
                Ajustes
              </button>
            </li>
            {donarActivo && (
              <li>
                <a
                  className={styles.menuOpcion}
                  href={URL_DONAR}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuAbierto(false)}
                >
                  Apoyar el juego
                </a>
              </li>
            )}
            <li>
              <form action={cerrarSesion}>
                <button type="submit" className={styles.menuOpcion}>
                  Cerrar sesión
                </button>
              </form>
            </li>
          </ul>
        )}
      </div>
    </header>
  );
}
