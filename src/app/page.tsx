import { Escena } from "@/components/Escena";
import { JuegoLayout } from "@/components/JuegoLayout";

export default function Home() {
  return <JuegoLayout panelEstado={null} escena={<Escena />} panelAcciones={null} />;
}
