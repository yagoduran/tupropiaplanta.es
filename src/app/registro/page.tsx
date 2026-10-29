import { FormularioAcceso } from "@/components/acceso/FormularioAcceso";
import { PantallaAcceso } from "@/components/acceso/PantallaAcceso";

export default function Registro() {
  return (
    <PantallaAcceso>
      <FormularioAcceso modo="registro" />
    </PantallaAcceso>
  );
}
