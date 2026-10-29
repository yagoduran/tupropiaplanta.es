import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { TITULAR, dato, titularCompleto } from "@/lib/titular";

export const metadata: Metadata = {
  title: "Aviso legal | Tu Propia Planta",
  robots: titularCompleto ? undefined : { index: false },
};

export default function AvisoLegal() {
  return (
    <PaginaLegal titulo="Aviso legal" actualizado="noviembre de 2026">
      <h2>Quién es el titular</h2>
      <ul>
        <li>Titular: {dato(TITULAR.nombre)}</li>
        <li>NIF/CIF: {dato(TITULAR.nif)}</li>
        <li>Dirección: {dato(TITULAR.direccion)}</li>
        <li>Correo de contacto: {dato(TITULAR.email)}</li>
        <li>Sitio web: tupropiaplanta.es</li>
      </ul>

      <h2>Qué es este sitio</h2>
      <p>
        Tu Propia Planta es un juego en el navegador. Es un simulador de cultivo: no vende, no regala y no promociona
        ningún producto real. Es solo para mayores de 18 años.
      </p>

      <h2>Anuncios</h2>
      <p>
        El juego puede mostrar anuncios para financiarse. Los anuncios son de terceros y no tenemos relación con lo que
        anuncian. Más información en la página de cookies.
      </p>

      <h2>Propiedad</h2>
      <p>
        Los dibujos, textos, sonidos y el código del juego son del titular. No se pueden copiar ni reutilizar sin
        permiso.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        Hacemos lo posible para que el juego funcione siempre, pero puede haber cortes o errores. No nos hacemos
        responsables de los fallos del servicio ni de las páginas a las que se pueda llegar desde un anuncio.
      </p>

      <h2>Ley aplicable</h2>
      <p>Este sitio se rige por la ley española.</p>
    </PaginaLegal>
  );
}
