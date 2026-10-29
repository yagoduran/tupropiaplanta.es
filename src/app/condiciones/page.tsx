import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { titularCompleto } from "@/lib/titular";

export const metadata: Metadata = {
  title: "Condiciones de uso | Tu Propia Planta",
  robots: titularCompleto ? undefined : { index: false },
};

export default function Condiciones() {
  return (
    <PaginaLegal titulo="Condiciones de uso" actualizado="noviembre de 2026">
      <h2>Quién puede jugar</h2>
      <p>Solo personas mayores de 18 años. Al crear tu cuenta confirmas que lo eres.</p>

      <h2>Qué es el juego</h2>
      <p>
        Es un simulador de cultivo para divertirse. Las plantas, las monedas y los objetos son del juego y no tienen
        valor real: no se pueden cambiar por dinero. Lo que aprendes en el juego no es una guía para cultivar en la vida
        real.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Cuida tu contraseña. Lo que se haga con tu cuenta es responsabilidad tuya.</li>
        <li>Una persona, una cuenta.</li>
        <li>Elige un nombre de usuario respetuoso. Podemos cambiarlo si no lo es.</li>
      </ul>

      <h2>Cómo jugar limpio</h2>
      <ul>
        <li>No uses trucos, programas ni errores del juego para conseguir ventajas.</li>
        <li>No molestes a otros jugadores ni intentes entrar en sus cuentas.</li>
      </ul>
      <p>Si no se cumple, podemos suspender o borrar la cuenta.</p>

      <h2>Cambios y cortes</h2>
      <p>
        Podemos cambiar el juego, sus precios y sus recompensas, o cerrarlo. Haremos lo posible por avisar con tiempo.
        El juego se ofrece tal cual: puede tener errores o cortes.
      </p>

      <h2>Anuncios</h2>
      <p>
        El juego muestra anuncios. Ver un anuncio para recibir ayuda extra es siempre opcional y tiene un máximo diario.
      </p>

      <h2>Dudas</h2>
      <p>Escríbenos al correo que aparece en el Aviso legal.</p>
    </PaginaLegal>
  );
}
