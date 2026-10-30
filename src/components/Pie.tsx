import Link from "next/link";
import { URL_INSTAGRAM, URL_X, instagramActivo, xActivo } from "@/lib/donar";
import { marco } from "@/lib/diseno";
import { TITULAR, titularCompleto } from "@/lib/titular";
import { Icono } from "./Icono";
import { IconoBase, type IdIconoBase } from "./IconoBase";
import styles from "./pie.module.css";

const ENLACES: { id: IdIconoBase; texto: string; href: string }[] = [
  { id: "legal", texto: "Avisos legales", href: "/aviso-legal" },
  { id: "privacidad", texto: "Política de privacidad", href: "/privacidad" },
  { id: "legal", texto: "Condiciones de uso", href: "/condiciones" },
  { id: "cookies", texto: "Cookies", href: "/cookies" },
];

/** Pie de página del juego: enlaces legales, redes y copyright. Va debajo de la cámara de cultivo. */
export function Pie() {
  const boton = marco("boton_oscuro", "var(--u)");
  const redes = [
    { id: "instagram" as const, texto: "Instagram", href: URL_INSTAGRAM, activa: instagramActivo },
    { id: "x_red" as const, texto: "X", href: URL_X, activa: xActivo },
  ].filter((r) => r.activa);

  return (
    <footer className={styles.pie}>
      <div className={styles.fila}>
        <div className={styles.marca}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo/tpp-logo-horizontal-oscuro-1x.png" alt="Tu Propia Planta" className={styles.logo} />
          <span className={styles.mayores}>+18</span>
        </div>
        {titularCompleto && (
          <nav className={styles.enlaces} aria-label="Enlaces legales">
            {ENLACES.map((e) => (
              <Link key={e.href} href={e.href} className={styles.enlace}>
                <IconoBase id={e.id} k="var(--ik)" />
                <span>{e.texto}</span>
                <span className={styles.flecha} aria-hidden>
                  ›
                </span>
              </Link>
            ))}
            <a className={styles.enlace} href={`mailto:${TITULAR.email}`}>
              <Icono id="email" />
              <span>Contacto</span>
              <span className={styles.flecha} aria-hidden>
                ›
              </span>
            </a>
          </nav>
        )}
        {redes.length > 0 && (
          <div className={styles.redes}>
            <span className={styles.sigue}>Síguenos</span>
            <div className={styles.redesFila}>
              {redes.map((r) => (
                <a
                  key={r.id}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.texto}
                  className={styles.red}
                  style={boton}
                >
                  <IconoBase id={r.id} k="var(--ik)" />
                  <span className={styles.redTexto}>{r.texto}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className={styles.legal}>
        <span>© 2026 Tu Propia Planta. Todos los derechos reservados.</span>
        <span>Juego solo para mayores de 18 años.</span>
      </div>
    </footer>
  );
}
