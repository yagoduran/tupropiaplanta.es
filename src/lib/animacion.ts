import { useEffect, useState } from "react";

/**
 * Fotograma actual de una animación. Se para en la pestaña oculta y se queda fija en el primer fotograma
 * si el jugador ha pedido reducir el movimiento.
 */
export function useFotograma(fotogramas: number, ms: number, activa = true): number {
  const [fotograma, setFotograma] = useState(0);

  useEffect(() => {
    if (!activa || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!document.hidden) setFotograma((f) => (f + 1) % fotogramas);
    }, ms);
    return () => clearInterval(id);
  }, [activa, fotogramas, ms]);

  return activa ? fotograma : 0;
}
