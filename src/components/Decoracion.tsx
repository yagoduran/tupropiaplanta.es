import { IconoObjeto } from "./IconoObjeto";
import { OBJETO_POR_ID } from "@/lib/tienda";
import { Gato } from "./Gato";

/** Posición de cada decoración en la rejilla de la escena (96x80). */
const POSICIONES: Record<string, { x: number; y: number }> = {
  poster: { x: 30, y: 14 },
  planta_adorno: { x: 76, y: 62 },
  radio: { x: 80, y: 28 },
};

/** Objetos de decoración puestos en la escena, a 16 px nativos. */
export function Decoracion({ puestos }: { puestos: string[] }) {
  return (
    <>
      {puestos.includes("gato") && <Gato />}
      {puestos.map((id) => {
        const objeto = OBJETO_POR_ID[id];
        const pos = POSICIONES[id];
        if (!objeto || !pos) return null;
        return (
          <span
            key={id}
            style={{
              position: "absolute",
              left: `calc(${pos.x}px * var(--s))`,
              top: `calc(${pos.y}px * var(--s))`,
              zIndex: 1,
            }}
          >
            <IconoObjeto celda={objeto.celda} tamano={16} k="var(--s)" />
          </span>
        );
      })}
    </>
  );
}
