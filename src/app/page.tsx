import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Juego } from "@/components/Juego";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoJuego } from "@/lib/juego";

export default function Home() {
  return (
    <Suspense fallback={<Cargando />}>
      <JuegoDelJugador />
    </Suspense>
  );
}

async function JuegoDelJugador() {
  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) redirect("/login");

  const { data, error } = await supabase.rpc("tpp_estado");
  if (error || !data) {
    return <Cargando mensaje="No se ha podido cargar tu planta. Recarga la página en un momento." />;
  }
  return <Juego inicial={data as EstadoJuego} />;
}

function Cargando({ mensaje = "Cargando tu planta..." }: { mensaje?: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        textAlign: "center",
        fontFamily: "var(--fuente-pixel)",
        fontSize: 24,
      }}
    >
      {mensaje}
    </main>
  );
}
