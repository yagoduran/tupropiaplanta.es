"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  borrarDatosDelJuego,
  guardarAjustes,
  guardarTutorial,
  comprarObjeto,
  equiparObjeto,
  usarObjeto,
  hacerAccion,
  obtenerEstado,
  obtenerMiPerfil,
  obtenerRanking,
  plantarSemilla,
  reclamarDiaria,
  verAnuncio,
  elegirHueco,
  comprarHueco,
} from "@/app/juego/acciones";
import { marco, type IdIcono } from "@/lib/diseno";
import { horaDelDia } from "@/lib/hora";
import { cambiarMomento, fijarVolumenMusica, iniciarMusica, pausarMusica, reanudarMusica } from "@/lib/musica";
import { fijarVolumenEfectos, sonar } from "@/lib/sonido";
import {
  MENSAJES_ERROR,
  formatoVida,
  medidoresDe,
  type Accion,
  type AjustesJuego,
  type DatosRanking,
  type PantallaJuego,
  type EstadoJuego,
  type RespuestaAccion,
} from "@/lib/juego";
import { tamanoPlanta } from "@/lib/crecimiento";
import { LOGRO_POR_ID } from "@/lib/logros";
import { PLAGAS, TRATAMIENTOS } from "@/lib/plagas";
import type { Efecto } from "@/lib/sonido";
import type { DatosPerfil } from "@/lib/perfil";
import { Ajustes } from "./Ajustes";
import { Bocadillo } from "./Bocadillo";
import { Escena } from "./Escena";
import { EstadoCompacto } from "./EstadoCompacto";
import { JuegoLayout } from "./JuegoLayout";
import { AmpliarHueco } from "./AmpliarHueco";
import { AnuncioPrueba } from "./AnuncioPrueba";
import { PanelAcciones } from "./PanelAcciones";
import { SelectorHuecos } from "./SelectorHuecos";
import { PanelEstado } from "./PanelEstado";
import { Planta } from "./Planta";
import { Plaga } from "./Plaga";
import { Decoracion } from "./Decoracion";
import { Logros } from "./Logros";
import { MisPlantas } from "./MisPlantas";
import { Perfil } from "./Perfil";
import { Ranking } from "./Ranking";
import { Semillas } from "./Semillas";
import { Tienda } from "./Tienda";
import { Tutorial } from "./Tutorial";
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
  const router = useRouter();
  const [enCurso, iniciar] = useTransition();

  /** Como `iniciar`, pero si no hay conexión avisa al jugador en lugar de romper la pantalla. */
  const ejecutar = (tarea: () => Promise<void>) =>
    iniciar(async () => {
      try {
        await tarea();
      } catch {
        setAviso({ texto: MENSAJES_ERROR.red, icono: "aviso" });
      }
    });
  const [pantalla, setPantalla] = useState<PantallaJuego>("cultivo");
  const [tutorial, setTutorial] = useState(!inicial.perfil.tutorial_hecho);
  const [repeticion, setRepeticion] = useState(false);
  const [anuncioAbierto, setAnuncioAbierto] = useState(false);
  const [ampliando, setAmpliando] = useState(false);
  const [ranking, setRanking] = useState<DatosRanking | null>(null);
  const [datosPerfil, setDatosPerfil] = useState<DatosPerfil | null>(null);

  const aplicar = useCallback((nuevo: EstadoJuego) => {
    setEstado({ perfil: nuevo.perfil, planta: nuevo.planta });
    const ahoraMs = Date.now();
    setRecibidoEn(ahoraMs);
    setAhora(ahoraMs);
  }, []);

  // Reloj de la pantalla: cuenta atrás de esperas y tiempo de vida.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setAhora(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Vuelve a pedir el estado real cada minuto y al volver a la pestaña.
  useEffect(() => {
    const revisar = async () => {
      try {
        const nuevo = await obtenerEstado();
        if (nuevo) aplicar(nuevo);
      } catch {
        // Sin conexión: se vuelve a intentar en la siguiente revisión.
      }
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
      const nuevos = "perfil" in r ? r.perfil.logros_nuevos.map((id) => LOGRO_POR_ID[id]).filter(Boolean) : [];
      if (r.ok && nuevos.length) {
        const premio = nuevos.reduce((suma, l) => suma + l.premio, 0);
        sonar("logro");
        setAviso({ texto: `¡Logro: ${nuevos.map((l) => l.nombre).join(", ")}! +${premio} monedas`, icono: "logros" });
      } else if (r.ok) {
        if (exito) setAviso(exito);
      } else {
        if (r.error === "sesion") router.replace("/login");
        setAviso({ texto: MENSAJES_ERROR[r.error ?? "red"] ?? MENSAJES_ERROR.red, icono: "aviso" });
      }
    },
    [aplicar, router],
  );

  useEffect(() => {
    fijarVolumenEfectos(estado.perfil.ajustes.volumen_efectos);
  }, [estado.perfil.ajustes.volumen_efectos]);

  // Música de fondo: empieza con el primer gesto del jugador y sigue el momento del día.
  const volumenMusica = estado.perfil.ajustes.volumen_musica;
  useEffect(() => {
    fijarVolumenMusica(volumenMusica);
  }, [volumenMusica]);

  useEffect(() => {
    cambiarMomento(horaDelDia(new Date()));
    const vigilar = setInterval(() => cambiarMomento(horaDelDia(new Date())), 60_000);
    const empezar = () => iniciarMusica();
    const visibilidad = () => (document.hidden ? pausarMusica() : reanudarMusica());
    window.addEventListener("pointerdown", empezar, { once: true });
    document.addEventListener("visibilitychange", visibilidad);
    return () => {
      clearInterval(vigilar);
      window.removeEventListener("pointerdown", empezar);
      document.removeEventListener("visibilitychange", visibilidad);
      pausarMusica();
    };
  }, []);

  const cambiarAjustes = (cambios: Partial<AjustesJuego>) => {
    setEstado((e) => ({ ...e, perfil: { ...e.perfil, ajustes: { ...e.perfil.ajustes, ...cambios } } }));
    guardarAjustes(cambios)
      .then((r) => {
        if (!r.ok) setAviso({ texto: MENSAJES_ERROR[r.error ?? "red"] ?? MENSAJES_ERROR.red, icono: "aviso" });
      })
      .catch(() => setAviso({ texto: MENSAJES_ERROR.red, icono: "aviso" }));
  };

  const borrarDatos = async () => {
    try {
      const { ok } = await borrarDatosDelJuego();
      if (!ok) throw new Error("borrar");
      const nuevo = await obtenerEstado();
      if (nuevo) aplicar(nuevo);
      setPantalla("cultivo");
    } catch {
      setAviso({ texto: MENSAJES_ERROR.red, icono: "aviso" });
    }
  };

  const verTutorial = () => {
    setRepeticion(true);
    setTutorial(true);
    setPantalla("cultivo");
  };

  const cambiarPasoTutorial = (paso: number) => {
    if (!repeticion) guardarTutorial(paso).catch(() => {});
  };

  const saltarTutorial = () => {
    setTutorial(false);
    if (!repeticion) {
      guardarTutorial(0).catch(() => {});
      setAviso({ texto: "Tutorial saltado. Puedes verlo otra vez en Ajustes.", icono: "aviso" });
    }
  };

  const terminarTutorial = () => {
    setTutorial(false);
    if (repeticion) return;
    ejecutar(async () => {
      const r = await guardarTutorial(8, true);
      tratar(r);
      if (r.ok && "recompensa" in r && r.recompensa) {
        sonar("moneda");
        setAviso({ texto: `¡Regalo de bienvenida! +${r.recompensa} monedas`, icono: "moneda" });
      }
    });
  };

  const activarAvisos = async () => {
    if (typeof Notification === "undefined") return false;
    const permiso = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permiso === "granted") cambiarAjustes({ avisos: true });
    return permiso === "granted";
  };

  const elegirPantalla = (id: PantallaJuego) => {
    if (
      id === "perfil" ||
      id === "plantas" ||
      id === "cultivo" ||
      id === "ajustes" ||
      id === "tienda" ||
      id === "semillas" ||
      id === "logros" ||
      id === "ranking"
    ) {
      sonar("pestana");
      setPantalla(id);
      if (id === "perfil" || id === "plantas")
        obtenerMiPerfil()
          .then(setDatosPerfil)
          .catch(() => setDatosPerfil(null));
      if (id === "ranking")
        obtenerRanking()
          .then(setRanking)
          .catch(() => setRanking(null));
    }
  };

  const accionar = (accion: Accion) => {
    ejecutar(async () => {
      const r = await hacerAccion(accion);
      sonar(r.ok ? (accion === "ajustar_luz" ? "ajustar-luz" : accion) : "error");
      const recompensa = "recompensa" in r ? r.recompensa : undefined;
      const ganadas = "ganadas" in r ? r.ganadas : undefined;
      tratar(
        r,
        accion === "cosechar"
          ? { texto: `¡Cosecha! +${recompensa ?? 0} monedas`, icono: "moneda" }
          : ganadas
            ? { texto: `+${ganadas} ${ganadas === 1 ? "moneda" : "monedas"}`, icono: "moneda" }
            : undefined,
      );
    });
  };

  const gestionarObjeto = (
    llamar: (id: string) => ReturnType<typeof comprarObjeto>,
    id: string,
    exito: string,
    sonido: Efecto,
  ) => {
    ejecutar(async () => {
      const r = await llamar(id);
      sonar(r.ok ? sonido : "compra-rechazada");
      tratar(r, { texto: exito, icono: "tienda" });
    });
  };

  const comprar = (id: string) => gestionarObjeto(comprarObjeto, id, "¡Compra hecha!", "comprar");
  const equipar = (id: string) => gestionarObjeto(equiparObjeto, id, "Hecho", "clic");
  const usar = (id: string) => gestionarObjeto(usarObjeto, id, "¡Abono aplicado!", "clic");
  const tratarPlaga = (id: string) => gestionarObjeto(usarObjeto, id, "¡Plaga eliminada!", "plaga-eliminada");

  const reclamar = () => {
    ejecutar(async () => {
      const r = await reclamarDiaria();
      sonar(r.ok ? "cofre" : "error");
      const recompensa = "recompensa" in r ? r.recompensa : 0;
      tratar(r, { texto: `¡Regalo diario! +${recompensa} monedas`, icono: "moneda" });
    });
  };

  const cambiarHueco = (hueco: number) => {
    if (hueco === estado.perfil.huecos.activo) return;
    ejecutar(async () => {
      const r = await elegirHueco(hueco);
      sonar(r.ok ? "pestana" : "error");
      tratar(r);
    });
  };

  const ampliar = () => {
    ejecutar(async () => {
      const r = await comprarHueco();
      sonar(r.ok ? "comprar" : "compra-rechazada");
      if (r.ok) setAmpliando(false);
      tratar(r, { texto: "¡Nuevo hueco de cultivo!", icono: "cultivo" });
    });
  };

  const recogerAyuda = () => {
    ejecutar(async () => {
      const r = await verAnuncio();
      sonar(r.ok ? "cofre" : "error");
      setAnuncioAbierto(false);
      const recompensa = "recompensa" in r ? r.recompensa : 0;
      tratar(r, { texto: `¡Ayuda extra! +${recompensa} monedas y sin esperas`, icono: "moneda" });
    });
  };

  const plantar = (variedad: string) => {
    ejecutar(async () => {
      const r = await plantarSemilla(variedad);
      tratar(r, { texto: "¡Semilla plantada!", icono: "cultivo" });
      if (r.ok) setPantalla("cultivo");
    });
  };

  const { perfil, planta } = estado;
  const plaga = planta?.vida === "viva" ? (planta.plaga ?? null) : null;

  // Suena un aviso cuando aparece una plaga nueva mientras se juega.
  const plagaAntes = useRef(plaga?.tipo);
  useEffect(() => {
    if (plaga && !plagaAntes.current) sonar("plaga-aparece");
    plagaAntes.current = plaga?.tipo;
  }, [plaga]);
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

  const medidores = planta
    ? medidoresDe(planta, {
        termometro: (perfil.inventario.termometro ?? 0) > 0,
        medidorPh: (perfil.inventario.medidor_ph ?? 0) > 0,
      })
    : [];
  const vida = planta ? planta.segundos_vida + (viva ? transcurrido : 0) : 0;
  const sedienta = !!planta && viva && planta.agua < 35;

  const botonPlantar = marco("boton", "var(--u)");
  const producto = plaga ? PLAGAS[plaga.tipo].tratamiento : null;
  const tieneProducto = !!producto && (perfil.inventario[producto] ?? 0) > 0;

  return (
    <JuegoLayout
      perfil={perfil}
      pantalla={pantalla}
      marcada={perfil.diaria.disponible && !tutorial ? "logros" : undefined}
      superposicion={
        tutorial && pantalla === "cultivo" && planta ? (
          <Tutorial
            key={repeticion ? "repeticion" : "inicial"}
            pasoInicial={repeticion ? 1 : inicial.perfil.tutorial_paso}
            agua={planta.agua}
            alCambiarPaso={cambiarPasoTutorial}
            alSaltar={saltarTutorial}
            alTerminar={terminarTutorial}
            alActivarAvisos={activarAvisos}
          />
        ) : ampliando ? (
          <AmpliarHueco perfil={perfil} ocupado={enCurso} alComprar={ampliar} alCerrar={() => setAmpliando(false)} />
        ) : anuncioAbierto ? (
          <AnuncioPrueba
            monedas={perfil.anuncios.monedas}
            ocupado={enCurso}
            alRecoger={recogerAyuda}
            alCerrar={() => setAnuncioAbierto(false)}
          />
        ) : undefined
      }
      alElegirPantalla={elegirPantalla}
      secundaria={
        pantalla === "ajustes" ? (
          <Ajustes
            ajustes={perfil.ajustes}
            alCambiar={cambiarAjustes}
            alVerTutorial={verTutorial}
            alBorrar={borrarDatos}
          />
        ) : pantalla === "tienda" ? (
          <Tienda
            perfil={perfil}
            ocupado={enCurso}
            aviso={aviso}
            alComprar={comprar}
            alEquipar={equipar}
            alUsar={usar}
          />
        ) : pantalla === "logros" ? (
          <Logros perfil={perfil} ocupado={enCurso} aviso={aviso} alReclamar={reclamar} />
        ) : pantalla === "ranking" ? (
          <Ranking datos={ranking} />
        ) : pantalla === "perfil" ? (
          <Perfil
            usuario={perfil.usuario}
            nivel={perfil.nivel}
            xp={perfil.xp}
            xpPct={perfil.xp_pct}
            avatar={perfil.ajustes.avatar}
            datos={datosPerfil}
            alElegirAvatar={(avatar) => cambiarAjustes({ avatar })}
          />
        ) : pantalla === "plantas" ? (
          <MisPlantas datos={datosPerfil} />
        ) : pantalla === "semillas" ? (
          <Semillas
            nivel={perfil.nivel}
            enUso={planta && viva ? planta.variedad : null}
            ocupado={enCurso}
            aviso={aviso}
            alPlantar={plantar}
          />
        ) : undefined
      }
      panelEstado={<PanelEstado medidores={medidores} tiempoDeVida={formatoVida(vida)} fase={planta?.fase ?? 1} />}
      estadoCompacto={<EstadoCompacto medidores={medidores} />}
      escena={
        <Escena luz={perfil.equipo.luz}>
          <Decoracion puestos={perfil.equipo.decoracion} />
          <SelectorHuecos
            huecos={perfil.huecos}
            ocupado={enCurso}
            alElegir={cambiarHueco}
            alAmpliar={() => setAmpliando(true)}
          />
          {planta && (
            <Planta
              fase={planta.fase}
              estado={planta.estado}
              tamano={tamanoPlanta(planta.fase, vida, planta.variedad)}
              variedad={planta.variedad}
              maceta={perfil.equipo.maceta}
            />
          )}
          {plaga && <Plaga plaga={plaga} />}
          {aviso ? (
            <Bocadillo texto={aviso.texto} icono={aviso.icono} />
          ) : plaga && producto ? (
            <Bocadillo
              texto={`${PLAGAS[plaga.tipo].aviso} Trátala con ${TRATAMIENTOS[producto].toLowerCase()}.`}
              icono="aviso"
            />
          ) : sedienta ? (
            <Bocadillo texto="¡Tu planta necesita agua!" />
          ) : !planta ? (
            <Bocadillo texto="Este hueco está vacío. ¡Planta una semilla!" />
          ) : planta?.vida === "muerta" ? (
            <Bocadillo texto="Tu planta ha muerto..." icono="aviso" />
          ) : null}
          {plaga && producto && (
            <button
              type="button"
              className={styles.plantar}
              style={botonPlantar}
              disabled={enCurso}
              onClick={() => (tieneProducto ? tratarPlaga(producto) : elegirPantalla("tienda"))}
            >
              {tieneProducto
                ? `Tratar con ${TRATAMIENTOS[producto].toLowerCase()}`
                : `Comprar ${TRATAMIENTOS[producto].toLowerCase()}`}
            </button>
          )}
          {!planta && (
            <button
              type="button"
              className={styles.plantar}
              style={botonPlantar}
              disabled={enCurso}
              onClick={() => elegirPantalla("semillas")}
            >
              Plantar una semilla
            </button>
          )}
          {planta && !viva && (
            <button
              type="button"
              className={styles.plantar}
              style={botonPlantar}
              disabled={enCurso}
              onClick={() => elegirPantalla("semillas")}
            >
              Elegir otra semilla
            </button>
          )}
        </Escena>
      }
      panelAcciones={
        <PanelAcciones
          esperas={esperas}
          bloqueadas={bloqueadas}
          alAccionar={accionar}
          ayudasRestantes={perfil.anuncios.restantes}
          alVerAnuncio={() => setAnuncioAbierto(true)}
        />
      }
    />
  );
}
