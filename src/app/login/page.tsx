import { Suspense } from "react";
import { FormularioAcceso } from "@/components/acceso/FormularioAcceso";
import { PantallaAcceso } from "@/components/acceso/PantallaAcceso";

export default function Login({ searchParams }: PageProps<"/login">) {
  return (
    <PantallaAcceso>
      <Suspense fallback={<FormularioAcceso modo="entrar" />}>
        <FormularioConError searchParams={searchParams} />
      </Suspense>
    </PantallaAcceso>
  );
}

async function FormularioConError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return (
    <FormularioAcceso
      modo="entrar"
      errorInicial={error === "enlace" ? "El enlace no es válido o ha caducado. Vuelve a intentarlo." : undefined}
    />
  );
}
