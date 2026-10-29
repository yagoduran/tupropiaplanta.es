"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { hacerAccion, obtenerEstado, plantarSemilla } from "@/app/juego/acciones";
import { marco, type IdIcono } from "@/lib/diseno";
import { fijarVolumenEfectos, sonar } from "@/lib/sonido";
import {
  MENSAJES_ERROR,
  formatoVida,
  medidoresDe,
  type Accion,
  type EstadoJuego,
  type RespuestaAccion,
} from "@/lib/juego";
import { Bocadillo } from "./Bocadillo";
import { Escena } from "./Escena";
import { EstadoCompacto } from "./EstadoCompacto";
import { JuegoLayout } from "./JuegoLayout";
import { PanelAcciones } from "./PanelAcciones";
import { PanelEstado } from "./PanelEstado";
import { Planta } from "./Planta";
import styles from "./juego.module.css";

const REVISION_MS = 60_000;
const AVISO_MS = 4_000;

interface Aviso {
  texto: string;
  icono: IdIcono;
}

export function Juego({ inicial }: { inicial: EstadoJuego }) {
  const [estado, setEstado] = useState(inicial);
  const [recibidoEn, setRecibidoEn] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enCurso, iniciar] = useTransition();

  const aplicar = useCallback((nuevo: EstadoJuego) => {
    setEstado({ perfil: nuevo.perfil, planta: nuevo.planta });
    const ahoraMs = Date.now();
    setRecibidoEn(ahoraMs);
    setAhora(ahoraMs);
  }, []);

  // Reloj de la pantalla: cuenta atrás de esperas y tiempo de vida.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Vuelve a pedir el estado real cada minuto y al volver a la pestaña.
  useEffect(() => {
    const revisar = async () => {
      const nuevo = await obtenerEstado();
      if (nuevo) aplicar(nuevo);
    };
    const id = setInterval(revisar, REVISION_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [aplicar]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), AVISO_MS);
    return () => clearTimeout(id);
  }, [aviso]);

  const tratar = useCallback(
    (r: RespuestaAccion | { ok: false; error: string }, exito?: Aviso) => {
      if ("perfil" in r) aplicar(r);
      if (r.ok) {
        if (exito) setAviso(exito);
      } else {
        setAviso({ texto: MENSAJES_ERROR[r.error ?? "red"] ?? MENSAJES_ERROR.red, icono: "aviso" });
      }
    },
    [aplicar],
  );

  useEffect(() => {
    fijarVolumenEfectos(estado.perfil.ajustes.volumen_efectos);
  }, [estado.perfil.ajustes.volumen_efectos]);

  const accionar = (accion: Accion) => {
    iniciar(async () => {
      const r = await hacerAccion(accion);
      sonar(r.ok ? (accion === "ajustar_luz" ? "ajustar-luz" : accion) : "error");
      const recompensa = "recompensa" in r ? r.recompensa : undefined;
      tratar(r, accion === "cosechar" ? { texto: `¡Cosecha! +${recompensa ?? 0} monedas`, icono: "moneda" } : undefined);
    });
  };

  const plantar = () => {
    iniciar(async () => {
      const r = await plantarSemilla();
      tratar(r, { texto: "¡Semilla plantada!", icono: "cultivo" });
    });
  };

  const { perfil, planta } = estado;
  const transcurrido = Math.max(0, (ahora - recibidoEn) / 1000);
  const viva = planta?.vida === "viva";

  const esperas: Partial<Record<Accion, number>> = {};
  if (planta && viva) {
    for (const [k, v] of Object.entries(planta.esperas)) {
      const resta = Math.ceil((v ?? 0) - transcurrido);
      if (resta > 0) esperas[k as Accion] = resta;
    }
  }

  const bloqueadas: Partial<Record<Accion, boolean>> = {};
  for (const a of ["regar", "abonar", "podar", "ajustar_luz", "cosechar"] as Accion[]) {
    bloqueadas[a] =
      enCurso || !planta || !viva || (a === "cosechar" && planta.fase < 8) || (a === "podar" && planta.fase < 3);
  }

  const medidores = planta ? medidoresDe(planta) : [];
  const vida = planta ? planta.segundos_vida + (viva ? transcurrido : 0) : 0;
  const sedienta = !!planta && viva && planta.agua < 35;

  const botonPlantar = marco("boton", "var(--u)");

  return (
    <JuegoLayout
      perfil={perfil}
      panelEstado={<PanelEstado medidores={medidores} tiempoDeVida={formatoVida(vida)} fase={planta?.fase ?? 1} />}
      estadoCompacto={<EstadoCompacto medidores={medidores} />}
      escena={
        <Escena>
          {planta && <Planta fase={planta.fase} estado={planta.estado} />}
          {aviso ? (
            <Bocadillo texto={aviso.texto} icono={aviso.icono} />
          ) : sedienta ? (
            <Bocadillo texto="¡Tu planta necesita agua!" />
          ) : planta?.vida === "muerta" ? (
            <Bocadillo texto="Tu planta ha muerto..." icono="aviso" />
          ) : null}
          {planta && !viva && (
            <button type="button" className={styles.plantar} style={botonPlantar} disabled={enCurso} onClick={plantar}>
              {planta.vida === "cosechada" ? "Plantar otra semilla" : "Empezar de nuevo"}
            </button>
          )}
        </Escena>
      }
      panelAcciones={<PanelAcciones esperas={esperas} bloqueadas={bloqueadas} alAccionar={accionar} />}
    />
  );
}
