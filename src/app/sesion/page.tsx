import type { Metadata } from "next";
import { Suspense } from "react";
import { PantallaAcceso } from "@/components/acceso/PantallaAcceso";
import { SesionCaducada } from "@/components/acceso/SesionCaducada";

export const metadata: Metadata = { title: "Sesión · Tu Propia Planta", robots: { index: false } };

export default function Sesion({ searchParams }: PageProps<"/sesion">) {
  return (
    <PantallaAcceso>
      <Suspense>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PantallaAcceso>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/sesion">, "searchParams">) {
  const { motivo } = await searchParams;
  return <SesionCaducada motivo={motivo === "duplicada" ? "duplicada" : "caducada"} />;
}
