import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Destino al que vuelve el jugador tras Google o tras pulsar el enlace del correo. */
export async function GET(peticion: NextRequest) {
  const { searchParams, origin } = peticion.nextUrl;
  const codigo = searchParams.get("code");

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
