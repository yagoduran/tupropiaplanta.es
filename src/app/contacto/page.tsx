import type { Metadata } from "next";
import Link from "next/link";
import { FormularioContacto } from "@/components/paginas/FormularioContacto";
import { PaginaSuelta } from "@/components/paginas/PaginaSuelta";
import styles from "@/components/paginas/paginas.module.css";
import { TITULAR } from "@/lib/titular";

export const metadata: Metadata = { title: "Contacto y problemas · Tu Propia Planta" };

export default function Contacto() {
  return (
    <PaginaSuelta ancho={620}>
      <div className={styles.panel}>
        <h1 className={styles.titulo}>Contacto y problemas</h1>
        <p className={styles.texto}>Cuéntanos qué ha pasado. Respondemos en un plazo de 48 horas laborables.</p>
        <FormularioContacto correo={TITULAR.email} />
      </div>
      <nav className={styles.enlaces}>
        <Link href="/">Volver al inicio</Link>
      </nav>
    </PaginaSuelta>
  );
}
