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
        El juego muestra anuncios para poder seguir siendo gratis. Por ahora los huecos de anuncio están vacíos y el
        anuncio de ayuda extra es solo de prueba. Cuando se activen los anuncios reales:
      </p>
      <ul>
        <li>Si aceptas, los anuncios podrán adaptarse a tus intereses.</li>
        <li>Si rechazas, verás anuncios generales y no se usarán tus datos para personalizarlos.</li>
      </ul>

      <h2>Tu elección</h2>
      <CambiarCookies />

      <Link href="/" className={styles.volver} style={{ textDecoration: "none" }}>
        Volver al juego
      </Link>
    </main>
  );
}
