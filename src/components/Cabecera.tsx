"use client";

import { useState } from "react";
import { cerrarSesion } from "@/app/acciones";
import { marco } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

const OPCIONES_MENU = ["Mi perfil", "Mis plantas"];

interface Props {
  monedas: number;
  nivel: number;
  xp: number;
  usuario: string;
  alAbrirAjustes: () => void;
}

export function Cabecera({ monedas, nivel, xp, usuario, alAbrirAjustes }: Props) {
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
          <span>{monedas.toLocaleString("es-ES", { useGrouping: "always" })}</span>
        </div>
        <div className={`${styles.cabeceraDato} ${styles.datoNivel}`}>
          <Icono id="nivel" />
          <span>Nv. {nivel}</span>
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
            <Icono id="cultivo" />
          </span>
          <span className={styles.nombreUsuario}>{usuario}</span>
          <Icono id="menu" />
        </button>
        {menuAbierto && (
          <ul className={styles.menu} style={panel}>
            {OPCIONES_MENU.map((o) => (
              <li key={o}>
                <button type="button" className={styles.menuOpcion}>
                  {o}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={styles.menuOpcion}
                onClick={() => {
                  setMenuAbierto(false);
                  alAbrirAjustes();
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
