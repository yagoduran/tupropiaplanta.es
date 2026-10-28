import type { IdIcono } from "@/lib/diseno";
import { BotonAccion } from "./BotonAccion";
import { BotonAnuncio } from "./BotonAnuncio";

const ACCIONES: { id: IdIcono; etiqueta: string; detalle: string }[] = [
  { id: "regar", etiqueta: "Regar", detalle: "+50 de agua" },
  { id: "abonar", etiqueta: "Abonar", detalle: "+30 nutrientes" },
  { id: "podar", etiqueta: "Podar", detalle: "Mejora la salud" },
  { id: "ajustar_luz", etiqueta: "Ajustar luz", detalle: "Ciclo 18/6" },
  { id: "cosechar", etiqueta: "Cosechar", detalle: "En fase 8" },
];

interface Props {
  fase: number;
  /** Segundos de espera por acción. */
  esperas?: Partial<Record<IdIcono, number>>;
}

export function PanelAcciones({ fase, esperas = {} }: Props) {
  return (
    <>
      {ACCIONES.map((a) => (
        <BotonAccion
          key={a.id}
          {...a}
          espera={esperas[a.id]}
          pasoAnillo={4}
          desactivado={a.id === "cosechar" && fase < 8}
        />
      ))}
      <BotonAnuncio />
    </>
  );
}
