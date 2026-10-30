import Link from "next/link";
import { Beta } from "../Beta";
import { Icono } from "../Icono";
import { Escena } from "../Escena";
import { Planta } from "../Planta";
import { EnlacesLegales } from "../EnlacesLegales";
import juego from "../juego.module.css";
import type { CSSProperties } from "react";
import { PaginaSuelta } from "./PaginaSuelta";
import styles from "./paginas.module.css";

const VENTAJAS = [
  {
    icono: "tiempo",
    titulo: "Tiempo real",
    texto: "Tu planta vive en el reloj de verdad: crece de día y de noche, aunque cierres el navegador.",
  },
  {
    icono: "semillas",
    titulo: "Colecciona variedades",
    texto: "Desbloquea semillas de cinco rarezas, desde la Verde Clásica hasta el Cristal Helado.",
  },
  {
    icono: "ranking",
    titulo: "Compite en el ranking",
    texto: "Sube de nivel cuidando tu planta y compárate con otros jugadores.",
  },
] as const;

/** Portada para quien todavía no ha entrado. */
export function Inicio() {
  return (
    <PaginaSuelta ancho={1000} logo={false}>
      <div className={styles.heroe}>
        <div className={styles.heroeTexto}>
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 6, maxWidth: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.logo} src="/assets/logo/tpp-logo-horizontal-claro-1x.png" alt="Tu Propia Planta" />
            <Beta />
          </span>
          <h1 className={styles.titular}>Cuida tu planta las 24 horas, aunque no estés</h1>
          <p className={styles.texto}>
            Un juego de cultivo en tiempo real para el navegador. Tu planta crece, tiene sed y da cosecha mientras haces
            otras cosas.
          </p>
          <div className={styles.botones}>
            <Link href="/login" className={styles.principal}>
              Jugar
            </Link>
            <Link href="/registro" className={styles.secundario}>
              Crear cuenta
            </Link>
          </div>
          <p className={styles.mas18}>
            <span className={styles.sello}>+18</span>
            Gratis · Sin descargas · Solo para mayores de 18 años
          </p>
        </div>
        <div className={`juego ${styles.vista}`} style={{ "--s": 4 } as CSSProperties} aria-hidden>
          <section className={juego.escena} style={{ outline: "none" }}>
            <Escena hora="dia" luz="bombilla">
              <Planta fase={3} estado="sana" maceta="maceta_terracota" />
            </Escena>
          </section>
          <span className={styles.pie}>Fase 3 · Plántula</span>
        </div>
      </div>
      <div className={styles.ventajas}>
        {VENTAJAS.map((v) => (
          <div key={v.titulo} className={styles.ventaja}>
            <Icono id={v.icono} k={3} />
            <div>
              <strong>{v.titulo}</strong>
              <span>{v.texto}</span>
            </div>
          </div>
        ))}
      </div>
      <nav className={styles.enlaces} aria-label="Más información">
        <Link href="/contacto">Contacto</Link>
        <EnlacesLegales />
      </nav>
    </PaginaSuelta>
  );
}
