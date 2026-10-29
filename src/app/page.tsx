import { Suspense } from "react";
import { Juego } from "@/components/Juego";
import { Inicio } from "@/components/paginas/Inicio";
import { PantallaCarga } from "@/components/paginas/PantallaCarga";
import { SinConexion } from "@/components/paginas/SinConexion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoJuego } from "@/lib/juego";

export default function Home() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <JuegoDelJugador />
    </Suspense>
  );
}

async function JuegoDelJugador() {
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return <Inicio />;

  const { data, error } = await supabase.rpc("tpp_estado");
  if (error || !data) {
    return <SinConexion />;
  }
  return <Juego inicial={data as EstadoJuego} />;
}
