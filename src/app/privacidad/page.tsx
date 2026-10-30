import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { TITULAR, dato, titularCompleto } from "@/lib/titular";

export const metadata: Metadata = {
  title: "Privacidad | Tu Propia Planta",
  robots: titularCompleto ? undefined : { index: false },
};

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="octubre de 2026">
      <h2>Quién cuida tus datos</h2>
      <p>
        {dato(TITULAR.nombre)}. Puedes escribirnos a {dato(TITULAR.email)}.
      </p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          Tu correo y tu contraseña (la contraseña se guarda cifrada) o tu cuenta de Google, para que puedas entrar.
        </li>
        <li>Tu nombre de usuario.</li>
        <li>Tu partida: tus plantas, monedas, nivel, objetos, logros y ajustes.</li>
        <li>Que has confirmado que eres mayor de 18 años.</li>
      </ul>
      <p>No te pedimos nombre real, teléfono ni dirección.</p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Para que puedas entrar y seguir tu partida desde cualquier equipo.</li>
        <li>
          Para mostrar el ranking: solo salen tu nombre de usuario y tu nivel, nunca tu correo. Puedes ocultarte en
          Ajustes.
        </li>
        <li>Para mostrarte anuncios, si aceptas las cookies de anuncios.</li>
      </ul>

      <h2>Con quién se comparten</h2>
      <p>
        Usamos empresas que nos prestan el servicio: Supabase (base de datos y acceso), Vercel (alojamiento de la web) y
        Google (si entras con tu cuenta de Google). No vendemos tus datos.
      </p>

      <h2>Cuánto tiempo</h2>
      <p>Mientras tengas cuenta. Si pides que la borremos, eliminamos tus datos.</p>

      <h2>Tus derechos</h2>
      <ul>
        <li>Puedes borrar tu partida cuando quieras desde Ajustes, con «Borrar datos del juego».</li>
        <li>
          Para ver, corregir o borrar del todo tu cuenta (incluido el correo), escríbenos a {dato(TITULAR.email)} y lo
          hacemos lo antes posible.
        </li>
        <li>
          Si crees que no tratamos bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos
          (aepd.es).
        </li>
      </ul>

      <h2>Menores</h2>
      <p>El juego es solo para mayores de 18 años. Si descubrimos una cuenta de un menor, la borramos.</p>
    </PaginaLegal>
  );
}
