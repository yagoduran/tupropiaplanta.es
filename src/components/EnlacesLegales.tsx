import Link from "next/link";
import { URL_DONAR, donarActivo } from "@/lib/donar";
import { titularCompleto } from "@/lib/titular";
import styles from "./cookies.module.css";

/** Enlaces a las páginas legales. No se muestran hasta que estén los datos del titular. */
export function EnlacesLegales() {
  if (!titularCompleto) return null;
  return (
    <nav className={styles.enlaces} aria-label="Información legal">
      <Link href="/aviso-legal">Aviso legal</Link>
      <Link href="/privacidad">Privacidad</Link>
      <Link href="/condiciones">Condiciones</Link>
      <Link href="/cookies">Cookies</Link>
      {donarActivo && (
        <a href={URL_DONAR} target="_blank" rel="noopener noreferrer">
          Apoyar el juego
        </a>
      )}
    </nav>
  );
}
