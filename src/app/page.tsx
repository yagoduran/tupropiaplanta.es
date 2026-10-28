import { Escena } from "@/components/Escena";
import { JuegoLayout } from "@/components/JuegoLayout";
import { Planta } from "@/components/Planta";

export default function Home() {
  return (
    <JuegoLayout
      panelEstado={null}
      escena={
        <Escena>
          <Planta fase={5} estado="sana" />
        </Escena>
      }
      panelAcciones={null}
    />
  );
}
