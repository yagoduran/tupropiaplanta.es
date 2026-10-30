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
  obtenerEstadisticas,
  obtenerProgresion,
  obtenerDesafios,
  obtenerMaestria,
  obtenerMisiones,
  obtenerEncargos,
  entregarEncargo,
  obtenerAmigos,
  obtenerEventos,
  obtenerPase,
  reclamarPase,
  comprarPase,
  obtenerRegalos,
  obtenerMercado,
  publicarOferta,
  comprarOferta,
  retirarOferta,
  republicarOferta,
  cobrarOferta,
  enviarRegalo,
  buscarJugadores,
  enviarSolicitud,
  responderSolicitud,
  quitarAmigo,
  bloquearJugador,
  desbloquearJugador,
  obtenerPerfilPublico,
  visitarAmigo,
  saludarAmigo,
  regarVisita,
  reclamarMision,
  obtenerNotificaciones,
  leerNotificaciones,
  obtenerCruces,
  obtenerPrestigio,
  comprarBonoPrestigio,
  renacer,
  iniciarCruce,
  acelerarCruce,
  abrirCruce,
  guardarCruce,
  empezarDesafio,
  reclamarHito,
  acariciarGato,
  obtenerMiPerfil,
  obtenerRanking,
  plantarSemilla,
  reclamarDiaria,
  verRobo,
  verAnuncio,
  recuperarPlanta,
  elegirHueco,
  comprarMejora,
  comprarHabitacion,
  elegirHabitacion,
} from "@/app/juego/acciones";
import { marco, type IdIcono } from "@/lib/diseno";
import { horaDelDia } from "@/lib/hora";
import { cambiarMomento, fijarVolumenMusica, iniciarMusica, pausarMusica, reanudarMusica } from "@/lib/musica";
import { fijarVolumenEfectos, sonar } from "@/lib/sonido";
import {
  HUECO_DESAFIO,
  MENSAJES_ERROR,
  formatoVida,
  medidoresDe,
  type Accion,
  type AjustesJuego,
  type AmbitoRanking,
  type DatosRanking,
  type PantallaJuego,
  type EstadoJuego,
  type RespuestaAccion,
} from "@/lib/juego";
import { tamanoPlanta } from "@/lib/crecimiento";
import { LOGRO_POR_ID } from "@/lib/logros";
import { PLAGAS, TRATAMIENTOS } from "@/lib/plagas";
import type { Efecto } from "@/lib/sonido";
import type { DatosEstadisticas, DatosPerfil } from "@/lib/perfil";
import type { DatosProgresion } from "@/lib/progresion";
import { Cofre, type PremioCofre } from "./Cofre";
import { Robo } from "./Robo";
import { Regadera } from "./Regadera";
import { registrarHibridas } from "@/lib/variedades";
import { DESAFIO_POR_ID, type DatosDesafios } from "@/lib/desafios";
import type { DatosMaestria } from "@/lib/maestria";
import type { DatosMisiones, DatosNotificaciones } from "@/lib/misiones";
import type { DatosPrestigio } from "@/lib/prestigio";
import type { DatosCruces, RespuestaCruce } from "@/lib/cruces";
import { calcularBienvenida, guardarVisita, leerVisita, type Bienvenida as DatosBienvenida } from "@/lib/visita";
import { Ajustes } from "./Ajustes";
import { Bienvenida } from "./Bienvenida";
import { Bocadillo } from "./Bocadillo";
import { Escena } from "./Escena";
import { EstadoCompacto } from "./EstadoCompacto";
import { JuegoLayout } from "./JuegoLayout";
import { Armario } from "./Armario";
import { Habitaciones } from "./Habitaciones";
import { Laboratorio } from "./Laboratorio";
import { Maestria } from "./Maestria";
import { Misiones } from "./Misiones";
import { Encargos } from "./Encargos";
import type { DatosEncargos } from "@/lib/encargos";
import { Amigos } from "./Amigos";
import { Visita } from "./Visita";
import { Eventos } from "./Eventos";
import { Pase } from "./Pase";
import type { DatosEventos, DatosPase } from "@/lib/temporada";
import { Regalo } from "./Regalo";
import { Mercado } from "./Mercado";
import type { DatosMercado } from "@/lib/mercado";
import { PerfilPublico } from "./PerfilPublico";
import type {
  DatosRegalos,
  TipoRegalo,
  DatosAmigos,
  DatosVisita,
  PerfilPublicoDatos,
  Resultado as ResultadoBusqueda,
} from "@/lib/amigos";
import { Campana } from "./Campana";
import { Prestigio } from "./Prestigio";
import { AnuncioPrueba } from "./AnuncioPrueba";
import { PanelAcciones } from "./PanelAcciones";
import { SelectorHuecos } from "./SelectorHuecos";
import { PanelEstado } from "./PanelEstado";
import { Planta } from "./Planta";
import { Plaga } from "./Plaga";
import { Decoracion } from "./Decoracion";
import { Logros } from "./Logros";
import { Coleccion } from "./Coleccion";
import { Desafios } from "./Desafios";
import { Estadisticas } from "./Estadisticas";
import { Inventario } from "./Inventario";
import { MisPlantas } from "./MisPlantas";
import { Perfil } from "./Perfil";
import { Ranking } from "./Ranking";
import { Semillas } from "./Semillas";
import { Tienda } from "./Tienda";
import { Titulos } from "./Titulos";
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
  const [anuncioRecuperar, setAnuncioRecuperar] = useState(false);
  const [regando, setRegando] = useState(false);
  const [cofre, setCofre] = useState<PremioCofre | null>(null);
  const [roboVisto, setRoboVisto] = useState<string | null>(null);
  const [ranking, setRanking] = useState<DatosRanking | null>(null);
  const [ambitoRanking, setAmbitoRanking] = useState<AmbitoRanking>("mundial");
  const [errorRanking, setErrorRanking] = useState(false);
  const [datosPerfil, setDatosPerfil] = useState<DatosPerfil | null>(null);
  const [estadisticas, setEstadisticas] = useState<DatosEstadisticas | null>(null);
  const [progresion, setProgresion] = useState<DatosProgresion | null>(null);
  const [desafios, setDesafios] = useState<DatosDesafios | null>(null);
  const [maestria, setMaestria] = useState<DatosMaestria | null>(null);
  const [amigos, setAmigos] = useState<DatosAmigos | null>(null);
  const [resultadosAmigos, setResultadosAmigos] = useState<ResultadoBusqueda[] | null>(null);
  const [mercado, setMercado] = useState<DatosMercado | null>(null);
  const [mercadoError, setMercadoError] = useState<string | null>(null);
  const [regalos, setRegalos] = useState<DatosRegalos | null>(null);
  const [regaloEnviado, setRegaloEnviado] = useState<TipoRegalo | null>(null);
  const [regaloError, setRegaloError] = useState<string | null>(null);
  const [eventos, setEventos] = useState<DatosEventos | null>(null);
  const [pase, setPase] = useState<DatosPase | null>(null);
  const [vistaDe, setVistaDe] = useState("");
  const [visita, setVisita] = useState<DatosVisita | null>(null);
  const [perfilPublico, setPerfilPublico] = useState<PerfilPublicoDatos | null>(null);
  const [misiones, setMisiones] = useState<DatosMisiones | null>(null);
  const [encargos, setEncargos] = useState<DatosEncargos | null>(null);
  const [notificaciones, setNotificaciones] = useState<DatosNotificaciones | null>(null);
  const [prestigio, setPrestigio] = useState<DatosPrestigio | null>(null);
  const [cruces, setCruces] = useState<DatosCruces | null>(null);
  const [crucesEn, setCrucesEn] = useState(() => Date.now());
  const [bienvenida, setBienvenida] = useState<DatosBienvenida | null>(null);

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

  // Al abrir el juego, si hace más de una hora de la última visita, se enseña qué ha pasado.
  useEffect(() => {
    if (!inicial.perfil.tutorial_hecho) return;
    const datos = calcularBienvenida(leerVisita(), inicial.planta, Date.now());
    if (datos) setTimeout(() => setBienvenida(datos), 0);
  }, [inicial]);

  // Guarda cómo estaba la planta en esta visita (solo con la pestaña a la vista).
  useEffect(() => {
    if (!estado.planta || estado.planta.vida !== "viva" || document.hidden) return;
    guardarVisita(estado.planta, recibidoEn);
  }, [estado.planta, recibidoEn]);

  // Vuelve a pedir el estado real cada minuto y al volver a la pestaña.
  useEffect(() => {
    const revisar = async (alVolverAVer = false) => {
      try {
        const nuevo = await obtenerEstado();
        if (nuevo) {
          if (alVolverAVer && nuevo.perfil.tutorial_hecho) {
            const datos = calcularBienvenida(leerVisita(), nuevo.planta, Date.now());
            if (datos) setBienvenida(datos);
          }
          aplicar(nuevo);
        }
      } catch {
        // Sin conexión: se vuelve a intentar en la siguiente revisión.
      }
    };
    const id = setInterval(() => revisar(), REVISION_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar(true);
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
        if (r.error === "sesion") router.replace("/sesion?motivo=caducada");
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
      id === "inventario" ||
      id === "estadisticas" ||
      id === "coleccion" ||
      id === "titulos" ||
      id === "desafios" ||
      id === "armario" ||
      id === "habitaciones" ||
      id === "maestria" ||
      id === "misiones" ||
      id === "encargos" ||
      id === "amigos" ||
      id === "eventos" ||
      id === "mercado" ||
      id === "pase" ||
      id === "laboratorio" ||
      id === "prestigio" ||
      id === "cultivo" ||
      id === "ajustes" ||
      id === "tienda" ||
      id === "semillas" ||
      id === "logros" ||
      id === "ranking"
    ) {
      sonar("pestana");
      setPantalla(id);
      if (id === "estadisticas")
        obtenerEstadisticas()
          .then(setEstadisticas)
          .catch(() => setEstadisticas(null));
      if (id === "prestigio")
        obtenerPrestigio()
          .then(setPrestigio)
          .catch(() => setPrestigio(null));
      if (id === "laboratorio")
        obtenerCruces()
          .then((r) => recibirCruces(r))
          .catch(() => setCruces(null));
      if (id === "eventos")
        obtenerEventos()
          .then(setEventos)
          .catch(() => setEventos(null));
      if (id === "mercado") {
        setMercadoError(null);
        obtenerMercado()
          .then(setMercado)
          .catch(() => setMercado(null));
      }
      if (id === "pase")
        obtenerPase()
          .then(setPase)
          .catch(() => setPase(null));
      if (id === "amigos") {
        setResultadosAmigos(null);
        obtenerAmigos()
          .then(setAmigos)
          .catch(() => setAmigos(null));
      }
      if (id === "misiones")
        obtenerMisiones()
          .then(setMisiones)
          .catch(() => setMisiones(null));
      if (id === "encargos")
        obtenerEncargos()
          .then(setEncargos)
          .catch(() => setEncargos(null));
      if (id === "maestria")
        obtenerMaestria()
          .then(setMaestria)
          .catch(() => setMaestria(null));
      if (id === "desafios")
        obtenerDesafios()
          .then(setDesafios)
          .catch(() => setDesafios(null));
      if (id === "coleccion" || id === "titulos" || id === "perfil")
        obtenerProgresion()
          .then(setProgresion)
          .catch(() => setProgresion(null));
      if (id === "perfil" || id === "plantas" || id === "inventario")
        obtenerMiPerfil()
          .then(setDatosPerfil)
          .catch(() => setDatosPerfil(null));
      if (id === "ranking") cargarRanking(ambitoRanking);
    }
  };

  const cargarRanking = (ambito: AmbitoRanking) => {
    setAmbitoRanking(ambito);
    setRanking(null);
    setErrorRanking(false);
    obtenerRanking(ambito)
      .then((d) => (d ? setRanking(d) : setErrorRanking(true)))
      .catch(() => setErrorRanking(true));
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

  const acariciar = () => {
    acariciarGato().then((r) => {
      if (r.ok) tratar(r);
    });
  };

  const reclamar = () => {
    ejecutar(async () => {
      const r = await reclamarDiaria();
      sonar(r.ok ? "cofre" : "error");
      const recompensa = "recompensa" in r ? r.recompensa : 0;
      tratar(r, { texto: `¡Regalo diario! +${recompensa} monedas`, icono: "moneda" });
      if (r.ok) setCofre({ texto: `¡Regalo diario! +${recompensa} monedas` });
    });
  };

  const reclamarPremioColeccion = (pct: number) => {
    ejecutar(async () => {
      const r = await reclamarHito(pct);
      sonar(r.ok ? "cofre" : "error");
      tratar(r, { texto: "¡Premio de la colección reclamado!", icono: "logros" });
      if (r.ok) setCofre({ texto: "¡Premio de la colección reclamado!", raro: pct >= 75 });
      setProgresion(await obtenerProgresion());
    });
  };

  /** Avisa del error de una respuesta de amigos; devuelve true si todo fue bien. */
  const aviso_ok = (r: { ok?: boolean; error?: string } | null, texto: string) => {
    if (r?.ok) {
      setAviso({ texto, icono: "cultivo" });
      return true;
    }
    sonar("error");
    setAviso({ texto: MENSAJES_ERROR[r?.error ?? "red"] ?? MENSAJES_ERROR.red, icono: "aviso" });
    return false;
  };

  const moverMercado = (
    accion: () => ReturnType<typeof comprarOferta>,
    texto: string | ((r: { cobrado?: number } | { ok: false; error: string }) => string),
    icono: Aviso["icono"] = "moneda",
  ) => {
    ejecutar(async () => {
      const r = await accion();
      sonar(r.ok ? "cofre" : "error");
      setMercadoError(r.ok ? null : (r.error ?? "red"));
      if ("activas" in r && r.activas !== undefined) setMercado(r as DatosMercado);
      tratar(r, { texto: typeof texto === "function" ? texto(r) : texto, icono });
    });
  };

  const publicarEnMercado = (objeto: string, precio: number) =>
    moverMercado(() => publicarOferta(objeto, precio), "Publicado. Lo verás en Mis ventas.", "cultivo");
  const comprarEnMercado = (id: number) =>
    moverMercado(() => comprarOferta(id), "¡Comprado! Ya está en tu inventario.");
  const retirarDelMercado = (id: number) =>
    moverMercado(() => retirarOferta(id), "Oferta retirada. El objeto vuelve a tu inventario.", "cultivo");
  const republicarEnMercado = (id: number) =>
    moverMercado(() => republicarOferta(id), "Publicado de nuevo por 3 días más.", "cultivo");
  const cobrarDelMercado = (id: number) =>
    moverMercado(
      () => cobrarOferta(id),
      (r) => `¡Cobrado! +${"cobrado" in r ? (r.cobrado ?? 0) : 0} monedas`,
    );

  const buscarAmigos = (texto: string) => {
    ejecutar(async () => setResultadosAmigos((await buscarJugadores(texto)) ?? []));
  };

  const mandarSolicitud = (usuario: string) => {
    ejecutar(async () => {
      const r = await enviarSolicitud(usuario);
      if (!aviso_ok(r, "Solicitud enviada.") || !r) return;
      setAmigos(r);
      const ahoraAmigos = r.amigos.some((a) => a.usuario === usuario);
      setResultadosAmigos((lista) =>
        lista
          ? lista.map((x) => (x.usuario === usuario ? { ...x, relacion: ahoraAmigos ? "amigos" : "enviada" } : x))
          : lista,
      );
      if (perfilPublico?.jugador?.usuario === usuario) setPerfilPublico(await obtenerPerfilPublico(usuario));
    });
  };

  const contestarSolicitud = (usuario: string, aceptar: boolean) => {
    ejecutar(async () => {
      const r = await responderSolicitud(usuario, aceptar);
      if (!aviso_ok(r, aceptar ? "¡Ya sois amigos!" : "Solicitud rechazada.") || !r) return;
      setAmigos(r);
      setResultadosAmigos((lista) =>
        lista
          ? lista.map((x) => (x.usuario === usuario ? { ...x, relacion: aceptar ? "amigos" : "ninguna" } : x))
          : lista,
      );
    });
  };

  const gestionarAmistad = (
    accion: (usuario: string) => Promise<DatosAmigos | null>,
    usuario: string,
    texto: string,
  ) => {
    ejecutar(async () => {
      const r = await accion(usuario);
      if (!aviso_ok(r, texto) || !r) return;
      setAmigos(r);
      setResultadosAmigos(null);
      if (pantalla === "perfil_publico" || pantalla === "visita") setPantalla("amigos");
    });
  };

  const abrirPerfilPublico = (usuario: string) => {
    sonar("pestana");
    setVistaDe(usuario);
    setPerfilPublico(null);
    setPantalla("perfil_publico");
    obtenerPerfilPublico(usuario)
      .then(setPerfilPublico)
      .catch(() => setPerfilPublico(null));
  };

  const abrirVisita = (usuario: string) => {
    sonar("pestana");
    setVistaDe(usuario);
    setVisita(null);
    setPantalla("visita");
    visitarAmigo(usuario)
      .then(async (v) => {
        setVisita(v);
        const nuevo = await obtenerEstado();
        if (nuevo) aplicar(nuevo);
      })
      .catch(() => setVisita(null));
  };

  const reclamarPremioPase = (nivel: number, pista: "g" | "s") => {
    ejecutar(async () => {
      const r = await reclamarPase(nivel, pista);
      sonar(r.ok ? "cofre" : "error");
      tratar(r, { texto: "¡Premio del pase reclamado!", icono: "logros" });
      if (r.ok) setCofre({ texto: "¡Premio del pase reclamado!", raro: pista === "s" });
      setPase(await obtenerPase());
    });
  };

  const desbloquearPase = () => {
    ejecutar(async () => {
      const r = await comprarPase();
      sonar(r.ok ? "comprar" : "compra-rechazada");
      tratar(r, { texto: "¡Pase especial desbloqueado!", icono: "logros" });
      setPase(await obtenerPase());
    });
  };

  const abrirRegalo = (usuario: string) => {
    sonar("pestana");
    setVistaDe(usuario);
    setRegalos(null);
    setRegaloEnviado(null);
    setRegaloError(null);
    setPantalla("regalo");
    obtenerRegalos()
      .then(setRegalos)
      .catch(() => setRegalos(null));
  };

  const mandarRegalo = (tipo: TipoRegalo, saludo: string | null) => {
    ejecutar(async () => {
      const r = await enviarRegalo(vistaDe, tipo, saludo);
      sonar(r.ok ? "cofre" : "error");
      if (r.ok && "restantes" in r && r.restantes !== undefined) {
        setRegalos({ restantes: r.restantes, abonos: r.abonos ?? 0, monedas_hoy: r.monedas_hoy ?? false });
        setRegaloEnviado(tipo);
        setRegaloError(null);
        setAmigos((d) =>
          d
            ? {
                ...d,
                regalos_restantes: r.restantes ?? 0,
                amigos: d.amigos.map((x) => (x.usuario === vistaDe ? { ...x, regalado: true } : x)),
              }
            : d,
        );
      } else {
        setRegaloError(r.ok ? null : (r.error ?? "red"));
      }
      tratar(r);
    });
  };

  const regarAmigo = () => {
    ejecutar(async () => {
      const r = await regarVisita(vistaDe);
      sonar(r.ok ? "regar" : "error");
      tratar(r, { texto: "¡Has regado su planta! +10 monedas", icono: "agua" });
      setVisita(await visitarAmigo(vistaDe));
    });
  };

  const saludarAlAmigo = (emoji: string) => {
    ejecutar(async () => {
      const r = await saludarAmigo(vistaDe, emoji);
      if (aviso_ok(r, "¡Saludo enviado!")) setVisita((v) => (v ? { ...v, saludo: emoji } : v));
    });
  };

  const reclamarLaMision = (id: string) => {
    ejecutar(async () => {
      const r = await reclamarMision(id);
      sonar(r.ok ? "cofre" : "error");
      tratar(r, { texto: "¡Premio de la misión reclamado!", icono: "logros" });
      setMisiones(await obtenerMisiones());
    });
  };

  const entregarElEncargo = (id: string) => {
    ejecutar(async () => {
      const r = await entregarEncargo(id);
      sonar(r.ok ? "cofre" : "error");
      tratar(r, { texto: "¡Encargo entregado!", icono: "logros" });
      setEncargos(await obtenerEncargos());
    });
  };

  const abrirCampana = () => {
    obtenerNotificaciones()
      .then(setNotificaciones)
      .catch(() => setNotificaciones(null));
  };

  const leerAvisos = (id: number | null) => {
    leerNotificaciones(id)
      .then((r) => {
        setNotificaciones(r);
        if (r) setEstado((e) => ({ ...e, perfil: { ...e.perfil, avisos: r.no_leidas } }));
      })
      .catch(() => {});
  };

  const equiparPerfil = (cambio: { titulo?: string; marco?: string }) => {
    cambiarAjustes(cambio);
    setProgresion((p) => (p ? { ...p, ...cambio } : p));
  };

  const empezar = (id: string) => {
    ejecutar(async () => {
      const r = await empezarDesafio(id);
      sonar(r.ok ? "cofre" : "error");
      tratar(r, { texto: "¡Desafío en marcha!", icono: "cultivo" });
      if (r.ok) setPantalla("cultivo");
    });
  };

  const seguirDesafio = () => {
    cambiarHueco(HUECO_DESAFIO);
    setPantalla("cultivo");
  };

  const cambiarHueco = (hueco: number) => {
    if (hueco === estado.perfil.huecos.activo) return;
    ejecutar(async () => {
      const r = await elegirHueco(hueco);
      sonar(r.ok ? "pestana" : "error");
      tratar(r);
    });
  };

  function recibirCruces(r: RespuestaCruce | null) {
    if (!r) {
      setAviso({ texto: MENSAJES_ERROR.red, icono: "aviso" });
      return;
    }
    setCruces({ cosechas: r.cosechas, cruce: r.cruce });
    setCrucesEn(Date.now());
    if (!r.ok && r.error) setAviso({ texto: MENSAJES_ERROR[r.error] ?? MENSAJES_ERROR.red, icono: "aviso" });
  }

  const cruzar = (a: string, b: string) => {
    ejecutar(async () => {
      const r = await iniciarCruce(a, b);
      sonar(r?.ok ? "cofre" : "error");
      recibirCruces(r);
    });
  };

  const acelerarElCruce = () => {
    ejecutar(async () => {
      const r = await acelerarCruce();
      sonar(r?.ok ? "comprar" : "compra-rechazada");
      recibirCruces(r);
      const nuevo = await obtenerEstado();
      if (nuevo) aplicar(nuevo);
    });
  };

  const abrirElCapullo = () => {
    ejecutar(async () => {
      const r = await abrirCruce();
      sonar(r?.ok ? "cofre" : "error");
      recibirCruces(r);
    });
  };

  const guardarLaSemilla = (nombre: string) => {
    ejecutar(async () => {
      const r = await guardarCruce(nombre);
      sonar(r?.ok ? "cofre" : "error");
      recibirCruces(r);
      if (r?.ok) {
        setAviso({ texto: "¡Semilla guardada en tus semillas!", icono: "cultivo" });
        const nuevo = await obtenerEstado();
        if (nuevo) aplicar(nuevo);
      }
    });
  };

  const comprarBono = (id: string) => {
    ejecutar(async () => {
      const r = await comprarBonoPrestigio(id);
      sonar(r?.ok ? "comprar" : "compra-rechazada");
      if (r) setPrestigio(r);
      if (r && !r.ok && r.error) setAviso({ texto: MENSAJES_ERROR[r.error] ?? MENSAJES_ERROR.red, icono: "aviso" });
      const nuevo = await obtenerEstado();
      if (nuevo) aplicar(nuevo);
    });
  };

  const renacerAhora = (confirmacion: string) => {
    ejecutar(async () => {
      const r = await renacer(confirmacion);
      sonar(r?.ok ? "cofre" : "error");
      if (!r?.ok) {
        setAviso({ texto: MENSAJES_ERROR[r?.error ?? "red"] ?? MENSAJES_ERROR.red, icono: "aviso" });
        return;
      }
      setPrestigio(r);
      setDatosPerfil(null);
      setProgresion(null);
      setCruces(null);
      const nuevo = await obtenerEstado();
      if (nuevo) aplicar(nuevo);
      setPantalla("cultivo");
      setAviso({ texto: "¡Has renacido! Tus puntos de prestigio te esperan.", icono: "logros" });
    });
  };

  const mejorar = (rama: string) => {
    ejecutar(async () => {
      const r = await comprarMejora(rama);
      sonar(r.ok ? "comprar" : "compra-rechazada");
      tratar(r, { texto: "¡Mejora comprada!", icono: "tienda" });
    });
  };

  const desbloquearHabitacion = (id: string) => {
    ejecutar(async () => {
      const r = await comprarHabitacion(id);
      sonar(r.ok ? "comprar" : "compra-rechazada");
      tratar(r, { texto: "¡Habitación desbloqueada!", icono: "cultivo" });
    });
  };

  const irAHabitacion = (id: string) => {
    ejecutar(async () => {
      const r = await elegirHabitacion(id);
      sonar(r.ok ? "pestana" : "error");
      tratar(r);
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

  const recuperar = () => {
    ejecutar(async () => {
      const r = await recuperarPlanta();
      sonar(r.ok ? "cofre" : "error");
      setAnuncioAbierto(false);
      setAnuncioRecuperar(false);
      tratar(r, { texto: "¡Tu planta ha vuelto a la vida!", icono: "cultivo" });
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
  registrarHibridas(perfil.hibridas.propias);
  const formatoRestante = (segundos: number) => {
    const s = Math.max(0, Math.floor(segundos));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
  };
  const plaga = planta?.vida === "viva" ? (planta.plaga ?? null) : null;

  // Suena un aviso cuando aparece una plaga nueva mientras se juega.
  const plagaAntes = useRef(plaga?.tipo);
  useEffect(() => {
    if (plaga && !plagaAntes.current) {
      sonar("plaga-aparece");
      if (perfil.equipo.decoracion.includes("gato")) sonar("gato-huye");
    }
    plagaAntes.current = plaga?.tipo;
  }, [plaga, perfil.equipo.decoracion]);
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

  const sensores = perfil.casa.mejoras.sens ?? 0;
  const medidores = planta
    ? medidoresDe(planta, {
        termometro: (perfil.inventario.termometro ?? 0) > 0 || sensores >= 1,
        medidorPh: (perfil.inventario.medidor_ph ?? 0) > 0,
      })
    : [];
  // Avisos de los sensores del armario.
  const avisoSensor =
    planta && viva && !planta.desafio
      ? sensores >= 1 && planta.temperatura > 30
        ? "Hace demasiado calor en el armario."
        : sensores >= 2 && planta.agua > 80 && !plaga
          ? "Demasiada humedad: cuidado con los hongos."
          : sensores >= 3 &&
              planta.fase >= 3 &&
              !plaga &&
              (planta.agua < 40 || planta.nutrientes < 30 || planta.luz < 30)
            ? "Tu planta está descuidada: hay riesgo de plagas."
            : null
      : null;
  const vida = planta ? planta.segundos_vida + (viva ? transcurrido : 0) : 0;
  const sedienta = !!planta && viva && planta.agua < 35;
  const lista = !!planta && viva && planta.fase >= 8;

  // Avisos del navegador (si el jugador los activó): solo cuando la pestaña no está a la vista.
  const avisosActivos = perfil.ajustes.avisos;
  const avisosAntes = useRef({ sedienta, plaga: !!plaga, lista });
  useEffect(() => {
    const antes = avisosAntes.current;
    avisosAntes.current = { sedienta, plaga: !!plaga, lista };
    if (!avisosActivos || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    const avisar = (texto: string) => new Notification("Tu Propia Planta", { body: texto, icon: "/icon.png" });
    if (sedienta && !antes.sedienta) avisar("Tu planta tiene sed: necesita agua.");
    if (plaga && !antes.plaga) avisar("¡Ha aparecido una plaga en tu planta!");
    if (lista && !antes.lista) avisar("Tu planta está lista para cosechar.");
  }, [avisosActivos, sedienta, plaga, lista]);

  const botonPlantar = marco("boton", "var(--u)");
  const producto = plaga ? PLAGAS[plaga.tipo].tratamiento : null;
  const tieneProducto = !!producto && (perfil.inventario[producto] ?? 0) > 0;

  return (
    <JuegoLayout
      perfil={perfil}
      pantalla={pantalla}
      campana={<Campana avisos={perfil.avisos} datos={notificaciones} alAbrir={abrirCampana} alLeer={leerAvisos} />}
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
        ) : bienvenida ? (
          <Bienvenida usuario={perfil.usuario} datos={bienvenida} alContinuar={() => setBienvenida(null)} />
        ) : anuncioAbierto ? (
          <AnuncioPrueba
            monedas={perfil.anuncios.monedas}
            recuperar={anuncioRecuperar}
            ocupado={enCurso}
            alRecoger={anuncioRecuperar ? recuperar : recogerAyuda}
            alCerrar={() => {
              setAnuncioAbierto(false);
              setAnuncioRecuperar(false);
            }}
          />
        ) : perfil.robo && perfil.robo.en !== roboVisto ? (
          <Robo
            monedas={perfil.robo.monedas}
            alCerrar={() => {
              setRoboVisto(perfil.robo?.en ?? null);
              verRobo();
            }}
          />
        ) : cofre ? (
          <Cofre premio={cofre} alCerrar={() => setCofre(null)} />
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
          <Ranking datos={ranking} error={errorRanking} ambito={ambitoRanking} alCambiarAmbito={cargarRanking} />
        ) : pantalla === "perfil" ? (
          <Perfil
            usuario={perfil.usuario}
            nivel={perfil.nivel}
            xp={perfil.xp}
            xpPct={perfil.xp_pct}
            avatar={perfil.ajustes.avatar}
            titulo={perfil.ajustes.titulo}
            marco={perfil.ajustes.marco}
            datos={datosPerfil}
            alElegirAvatar={(avatar) => cambiarAjustes({ avatar })}
          />
        ) : pantalla === "plantas" ? (
          <MisPlantas datos={datosPerfil} />
        ) : pantalla === "inventario" ? (
          <Inventario
            perfil={perfil}
            plantas={datosPerfil?.plantas ?? null}
            ocupado={enCurso}
            alIrAHueco={(hueco, destino) => {
              elegirPantalla(destino);
              cambiarHueco(hueco);
            }}
            alAmpliar={() => elegirPantalla("habitaciones")}
            alIrATienda={() => elegirPantalla("tienda")}
          />
        ) : pantalla === "estadisticas" ? (
          <Estadisticas datos={estadisticas} />
        ) : pantalla === "coleccion" ? (
          <Coleccion datos={progresion} ocupado={enCurso} alReclamar={reclamarPremioColeccion} />
        ) : pantalla === "prestigio" ? (
          <Prestigio datos={prestigio} ocupado={enCurso} alComprar={comprarBono} alRenacer={renacerAhora} />
        ) : pantalla === "laboratorio" ? (
          <Laboratorio
            datos={cruces}
            recibidoEn={crucesEn}
            monedas={perfil.monedas}
            ocupado={enCurso}
            alIniciar={cruzar}
            alAcelerar={acelerarElCruce}
            alAbrir={abrirElCapullo}
            alGuardar={guardarLaSemilla}
          />
        ) : pantalla === "eventos" ? (
          <Eventos datos={eventos} />
        ) : pantalla === "mercado" ? (
          <Mercado
            datos={mercado}
            monedas={perfil.monedas}
            ocupado={enCurso}
            error={mercadoError}
            alPublicar={publicarEnMercado}
            alComprar={comprarEnMercado}
            alRetirar={retirarDelMercado}
            alRepublicar={republicarEnMercado}
            alCobrar={cobrarDelMercado}
          />
        ) : pantalla === "pase" ? (
          <Pase
            datos={pase}
            ocupado={enCurso}
            monedas={perfil.monedas}
            alReclamar={reclamarPremioPase}
            alComprar={desbloquearPase}
          />
        ) : pantalla === "amigos" ? (
          <Amigos
            datos={amigos}
            resultados={resultadosAmigos}
            ocupado={enCurso}
            alBuscar={buscarAmigos}
            alEnviar={mandarSolicitud}
            alResponder={contestarSolicitud}
            alQuitar={(u) => gestionarAmistad(quitarAmigo, u, "Hecho.")}
            alBloquear={(u) => gestionarAmistad(bloquearJugador, u, "Jugador bloqueado.")}
            alDesbloquear={(u) => gestionarAmistad(desbloquearJugador, u, "Jugador desbloqueado.")}
            alVisitar={abrirVisita}
            alPerfil={abrirPerfilPublico}
            alRegalar={abrirRegalo}
          />
        ) : pantalla === "regalo" ? (
          <Regalo
            amigo={amigos?.amigos.find((x) => x.usuario === vistaDe) ?? null}
            datos={regalos}
            monedas={perfil.monedas}
            enviado={regaloEnviado}
            error={regaloError}
            ocupado={enCurso}
            alEnviar={mandarRegalo}
            alVolver={() => elegirPantalla("amigos")}
          />
        ) : pantalla === "visita" ? (
          <Visita
            datos={visita}
            ocupado={enCurso}
            alVolver={() => elegirPantalla("amigos")}
            alRegar={regarAmigo}
            alSaludar={saludarAlAmigo}
            alPerfil={() => abrirPerfilPublico(vistaDe)}
          />
        ) : pantalla === "perfil_publico" ? (
          <PerfilPublico
            datos={perfilPublico}
            ocupado={enCurso}
            alVolver={() => elegirPantalla("amigos")}
            alVisitar={abrirVisita}
            alEnviar={mandarSolicitud}
            alQuitar={(u) => gestionarAmistad(quitarAmigo, u, "Hecho.")}
            alBloquear={(u) => gestionarAmistad(bloquearJugador, u, "Jugador bloqueado.")}
          />
        ) : pantalla === "misiones" ? (
          <Misiones datos={misiones} ocupado={enCurso} alReclamar={reclamarLaMision} />
        ) : pantalla === "encargos" ? (
          <Encargos datos={encargos} ocupado={enCurso} alEntregar={entregarElEncargo} />
        ) : pantalla === "maestria" ? (
          <Maestria datos={maestria} />
        ) : pantalla === "armario" ? (
          <Armario perfil={perfil} ocupado={enCurso} alComprar={mejorar} />
        ) : pantalla === "habitaciones" ? (
          <Habitaciones
            perfil={perfil}
            ocupado={enCurso}
            alComprar={desbloquearHabitacion}
            alElegir={irAHabitacion}
            alMejorar={mejorar}
          />
        ) : pantalla === "desafios" ? (
          <Desafios
            datos={desafios}
            enCurso={perfil.huecos.desafio}
            ocupado={enCurso}
            alEmpezar={empezar}
            alContinuar={seguirDesafio}
          />
        ) : pantalla === "titulos" ? (
          <Titulos
            datos={progresion}
            usuario={perfil.usuario}
            nivel={perfil.nivel}
            avatar={perfil.ajustes.avatar}
            ocupado={enCurso}
            alElegir={equiparPerfil}
          />
        ) : pantalla === "semillas" ? (
          <Semillas
            hibridas={perfil.hibridas.semillas}
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
        <Escena luz={perfil.equipo.luz} habitacion={perfil.casa.habitacion}>
          <Decoracion puestos={perfil.equipo.decoracion} hayPlaga={!!plaga} alAcariciarGato={acariciar} />
          <SelectorHuecos
            huecos={perfil.huecos}
            ocupado={enCurso}
            alElegir={cambiarHueco}
            alAmpliar={() => elegirPantalla("habitaciones")}
            maceta={perfil.equipo.maceta}
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
          {plaga && <Plaga plaga={plaga} variedad={planta?.variedad} />}
          {regando && !bloqueadas.regar && (
            <Regadera
              alTerminar={() => {
                setRegando(false);
                accionar("regar");
              }}
              alCancelar={() => setRegando(false)}
            />
          )}
          {aviso ? (
            <Bocadillo texto={aviso.texto} icono={aviso.icono} />
          ) : plaga && producto ? (
            <Bocadillo
              texto={`${PLAGAS[plaga.tipo].aviso} Trátala con ${TRATAMIENTOS[producto].toLowerCase()}.`}
              icono="aviso"
            />
          ) : sedienta ? (
            <Bocadillo texto="¡Tu planta necesita agua!" />
          ) : avisoSensor ? (
            <Bocadillo texto={avisoSensor} icono="aviso" />
          ) : planta?.desafio && planta.vida === "cosechada" ? (
            <Bocadillo
              texto={`¡Desafío completado! ${(planta.desafio.puntos ?? 0).toLocaleString("es-ES")} puntos`}
              icono="moneda"
            />
          ) : planta?.desafio && planta.vida === "muerta" ? (
            <Bocadillo texto="Desafío fallido. Puedes probar otro o volver a tu cultivo." icono="aviso" />
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
          {planta && planta.desafio && viva && (
            <p className={styles.desafioBanner} style={marco("barra", "var(--u)")}>
              ★ {DESAFIO_POR_ID[planta.desafio.id]?.nombre ?? "Desafío"} · quedan{" "}
              {formatoRestante(planta.desafio.restan - transcurrido)}
            </p>
          )}
          {planta && !viva && planta.desafio && (
            <button
              type="button"
              className={styles.plantar}
              style={botonPlantar}
              disabled={enCurso}
              onClick={() => cambiarHueco(1)}
            >
              Volver a mi cultivo
            </button>
          )}
          {planta && !viva && !planta.desafio && planta.vida === "muerta" && perfil.anuncios.recuperar && (
            <button
              type="button"
              className={`${styles.plantar} ${styles.recuperar}`}
              style={marco("boton_secundario", "var(--u)")}
              disabled={enCurso}
              onClick={() => {
                setAnuncioRecuperar(true);
                setAnuncioAbierto(true);
              }}
            >
              Ver anuncio y recuperar la planta
            </button>
          )}
          {planta && !viva && !planta.desafio && (
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
          alAccionar={(a) => (a === "regar" ? setRegando((r) => !r) : accionar(a))}
          ayudasRestantes={perfil.anuncios.restantes}
          alVerAnuncio={() => setAnuncioAbierto(true)}
        />
      }
    />
  );
}
