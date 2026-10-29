import type { Metadata } from "next";
import Link from "next/link";
import { CambiarCookies } from "@/components/CambiarCookies";
import styles from "@/components/cookies.module.css";

export const metadata: Metadata = { title: "Cookies | Tu Propia Planta" };

export default function Cookies() {
  return (
    <main className={styles.pagina}>
      <h1>Cookies</h1>
      <p>Las cookies son pequeños archivos que la página guarda en tu navegador.</p>

      <h2>Las que usamos siempre</h2>
      <p>
        Son necesarias para que puedas entrar con tu cuenta y mantener tu sesión abierta. Sin ellas el juego no
        funciona, por eso no hace falta pedirte permiso.
      </p>

      <h2>Los anuncios</h2>
      <p>
        El juego muestra anuncios para poder seguir siendo gratis. Los pone un tercero (la red publicitaria Adsterra),
        que puede guardar sus propias cookies en tu navegador.
      </p>
      <ul>
        <li>Si aceptas, verás los anuncios, y la red podrá usar sus cookies.</li>
        <li>Si rechazas, no se carga ningún anuncio de terceros y el juego funciona igual.</li>
      </ul>
      <p>El anuncio de ayuda extra del botón del juego es de prueba y no usa cookies de terceros.</p>

      <h2>Tu elección</h2>
      <CambiarCookies />

      <Link href="/" className={styles.volver} style={{ textDecoration: "none" }}>
        Volver al juego
      </Link>
    </main>
  );
}
