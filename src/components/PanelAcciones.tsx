import type { IdIcono } from "@/lib/diseno";
import { ESPERA_TOTAL, type Accion } from "@/lib/juego";
import { BotonAccion } from "./BotonAccion";
import { BotonAnuncio } from "./BotonAnuncio";

const ACCIONES: { id: Accion; etiqueta: string; detalle: string }[] = [
  { id: "regar", etiqueta: "Regar", detalle: "+50 de agua" },
  { id: "abonar", etiqueta: "Abonar", detalle: "+20 nutrientes" },
  { id: "podar", etiqueta: "Podar", detalle: "Mejora la salud" },
  { id: "cosechar", etiqueta: "Cosechar", detalle: "En fase 8" },
];

interface Props {
  /** Segundos de espera que quedan por acción. */
  esperas: Partial<Record<Accion, number>>;
  /** Acciones no disponibles ahora (por fase, planta muerta o petición en curso). */
  bloqueadas: Partial<Record<Accion, boolean>>;
  alAccionar: (accion: Accion) => void;
  /** Horas de luz al día del horario actual y apertura del panel del ciclo de luz. */
  luzHoras: number;
  alCicloLuz: () => void;
  alAbonos: () => void;
  /** Ayudas por anuncio que quedan hoy. */
  ayudasRestantes: number;
  alVerAnuncio: () => void;
}

export function PanelAcciones({
  esperas,
  bloqueadas,
  alAccionar,
  luzHoras,
  alCicloLuz,
  alAbonos,
  ayudasRestantes,
  alVerAnuncio,
}: Props) {
  return (
    <>
      {ACCIONES.map((a) => {
        const resta = esperas[a.id] ?? 0;
        const total = ESPERA_TOTAL[a.id];
        const paso = resta > 0 && total > 0 ? Math.min(8, Math.max(0, Math.floor((1 - resta / total) * 8))) : 0;
        return (
          <BotonAccion
            key={a.id}
            id={a.id as IdIcono}
            etiqueta={a.etiqueta}
            detalle={a.detalle}
            espera={resta}
            pasoAnillo={paso}
            desactivado={bloqueadas[a.id]}
            onClick={() => alAccionar(a.id)}
          />
        );
      })}
      <BotonAccion id="nutrientes" etiqueta="Abonos" detalle="Los que tienes" onClick={alAbonos} />
      <BotonAccion
        id="ajustar_luz"
        etiqueta="Ciclo de luz"
        detalle={`${luzHoras}/${24 - luzHoras}`}
        onClick={alCicloLuz}
      />
      <BotonAnuncio restantes={ayudasRestantes} onClick={alVerAnuncio} />
    </>
  );
}
