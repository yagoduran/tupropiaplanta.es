import { Bocadillo } from "@/components/Bocadillo";
import { Escena } from "@/components/Escena";
import { JuegoLayout } from "@/components/JuegoLayout";
import { PanelAcciones } from "@/components/PanelAcciones";
import { EstadoCompacto } from "@/components/EstadoCompacto";
import { PanelEstado } from "@/components/PanelEstado";
import { Planta } from "@/components/Planta";
import type { Medidor } from "@/lib/estado";

// Valores de prueba: la lógica real y los datos guardados llegan en las fases 2 y 3.
const MEDIDORES: Medidor[] = [
  { id: "agua", nombre: "Agua", porcentaje: 28, valor: "28%", tono: "peligro" },
  { id: "nutrientes", nombre: "Nutrientes", nombreCorto: "Nutr.", porcentaje: 52, valor: "52%", tono: "aviso" },
  { id: "luz", nombre: "Luz", porcentaje: 86, valor: "86%", tono: "bien" },
  { id: "temperatura", nombre: "Temperatura", nombreCorto: "Temp.", porcentaje: 60, valor: "24 °C", valorCorto: "24°", tono: "bien" },
  { id: "ph", nombre: "pH", porcentaje: 55, valor: "6,3", tono: "bien" },
  { id: "salud", nombre: "Salud", porcentaje: 74, valor: "74%", tono: "bien" },
];

export default function Home() {
  return (
    <JuegoLayout
      panelEstado={<PanelEstado medidores={MEDIDORES} tiempoDeVida="12d 04h 31m 08s" fase={5} />}
      estadoCompacto={<EstadoCompacto medidores={MEDIDORES} />}
      escena={
        <Escena>
          <Planta fase={5} estado="sana" />
          <Bocadillo texto="¡Tu planta necesita agua!" />
        </Escena>
      }
      panelAcciones={<PanelAcciones fase={5} esperas={{ abonar: 134 }} />}
    />
  );
}
