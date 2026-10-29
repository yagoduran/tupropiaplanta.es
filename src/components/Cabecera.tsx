"use client";

import { useState } from "react";
import { cerrarSesion } from "@/app/acciones";
import { marco } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import { avatarDe } from "@/lib/perfil";
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
  ["desafios", "Desafíos"],
  ["armario", "Mejoras del armario"],
  ["habitaciones", "Habitaciones"],
  ["maestria", "Maestría"],
] as const;

interface Props {
  monedas: number;
  nivel: number;
  xp: number;
  usuario: string;
  avatar?: string;
  alAbrir: (pantalla: PantallaJuego) => void;
}

export function Cabecera({ monedas, nivel, xp, usuario, avatar, alAbrir }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const panel = marco("panel", "var(--u)");
  const barra = marco("barra", "var(--u)");

  return (
    <header className={styles.cabecera}>
      <div className={styles.cabeceraLogo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo/tpp-logo-horizontal-oscuro-1x.png" alt="Tu Propia Planta" />
      </div>

      <div className={styles.cabeceraCentro}>
        <div className={styles.cabeceraDato} data-tut="monedas">
          <Icono id="moneda" />
          <span className="numero">{monedas.toLocaleString("es-ES", { useGrouping: "always" })}</span>
        </div>
        <div className={`${styles.cabeceraDato} ${styles.datoNivel}`}>
          <Icono id="nivel" />
          <span className="numero">Nv. {nivel}</span>
          <div className={styles.xp} style={{ ...barra, background: barra.background }}>
            <div className={styles.xpRelleno} style={{ width: `${xp}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.cabeceraUsuario}>
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
