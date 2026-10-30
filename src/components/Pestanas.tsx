"use client";

import { useEffect, useRef, useState } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import { Icono } from "./Icono";
import { IconoBase } from "./IconoBase";
import { IconoNav, type IdIconoNav } from "./IconoNav";
import { IconoSocial } from "./IconoSocial";
import styles from "./juego.module.css";

type Destino = PantallaJuego | "tutorial" | "diaria";
type IconoItem = { ui: IdIcono } | { nav: IdIconoNav } | { social: "campana" };

interface Item {
  destino: Destino;
  etiqueta: string;
  icono: IconoItem;
  contador?: "misiones" | "diaria" | "avisos";
}

const FIJAS: { id: PantallaJuego; etiqueta: string; icono: IconoItem }[] = [
  { id: "cultivo", etiqueta: "Cultivo", icono: { ui: "cultivo" } },
  { id: "habitaciones", etiqueta: "Hogar", icono: { nav: "hogar" } },
  { id: "encargos", etiqueta: "Encargos", icono: { nav: "encargos" } },
  { id: "tienda", etiqueta: "Tienda", icono: { ui: "tienda" } },
];

const CATEGORIAS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Cultivo y casa",
    items: [
      { destino: "armario", etiqueta: "Armario", icono: { nav: "armario" } },
      { destino: "inventario", etiqueta: "Inventario", icono: { nav: "inventario" } },
      { destino: "semillas", etiqueta: "Semillas", icono: { ui: "semillas" } },
    ],
  },
  {
    titulo: "Progreso",
    items: [
      { destino: "misiones", etiqueta: "Misiones", icono: { nav: "misiones" }, contador: "misiones" },
      { destino: "diaria", etiqueta: "Entrada diaria", icono: { nav: "calendario" }, contador: "diaria" },
      { destino: "logros", etiqueta: "Logros", icono: { ui: "logros" } },
      { destino: "ranking", etiqueta: "Ranking", icono: { ui: "ranking" } },
    ],
  },
  {
    titulo: "Social",
    items: [
      { destino: "amigos", etiqueta: "Amigos", icono: { nav: "amigos" } },
      { destino: "avisos", etiqueta: "Avisos", icono: { social: "campana" }, contador: "avisos" },
    ],
  },
  {
    titulo: "Cuenta",
    items: [
      { destino: "perfil", etiqueta: "Perfil", icono: { ui: "nivel" } },
      { destino: "coleccion", etiqueta: "Colección", icono: { nav: "coleccion" } },
      { destino: "ajustes", etiqueta: "Ajustes", icono: { ui: "ajustes" } },
      { destino: "tutorial", etiqueta: "Ayuda y tutorial", icono: { nav: "ayuda" } },
    ],
  },
];

function Dibujo({ icono }: { icono: IconoItem }) {
  if ("ui" in icono) return <Icono id={icono.ui} />;
  if ("nav" in icono) return <IconoNav id={icono.nav} />;
  return <IconoSocial id={icono.social} k="calc(var(--ik) * 0.75)" />;
}

interface Props {
  activa: PantallaJuego;
  alElegir: (id: PantallaJuego) => void;
  /** Novedades que se muestran como contador en «Más». */
  contadores?: { misiones: number; diaria: boolean; avisos: number };
  alVerTutorial?: () => void;
  alAbrirDiaria?: () => void;
}

export function Pestanas({
  activa,
  alElegir,
  contadores = { misiones: 0, diaria: false, avisos: 0 },
  alVerTutorial,
  alAbrirDiaria,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLElement>(null);
  const normal = marco("pestana", "var(--u)");
  const seleccionada = marco("pestana_activa", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const panel = marco("panel", "var(--u)");

  const enMas = CATEGORIAS.some((c) => c.items.some((i) => i.destino === activa));
  const totalMas = contadores.misiones + contadores.avisos + (contadores.diaria ? 1 : 0);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const numero = (c?: Item["contador"]) => {
    if (c === "misiones") return contadores.misiones > 0 ? String(contadores.misiones) : null;
    if (c === "avisos") return contadores.avisos > 0 ? String(contadores.avisos) : null;
    if (c === "diaria") return contadores.diaria ? "!" : null;
    return null;
  };

  const elegir = (d: Destino) => {
    setAbierto(false);
    if (d === "tutorial") alVerTutorial?.();
    else if (d === "diaria") alAbrirDiaria?.();
    else alElegir(d);
  };

  return (
    <nav ref={raiz} className={styles.pestanas} aria-label="Secciones del juego">
      {abierto && (
        <>
          <div className={styles.masVelo} aria-hidden />
          <div className={styles.mas} style={panel} role="dialog" aria-label="Más secciones">
            {CATEGORIAS.map((c) => (
              <div key={c.titulo} className={styles.masCategoria}>
                <span className={styles.masTitulo}>{c.titulo}</span>
                <div className={styles.masItems}>
                  {c.items.map((i) => {
                    const n = numero(i.contador);
                    const on = i.destino === activa;
                    return (
                      <button
                        key={i.destino}
                        type="button"
                        className={styles.masItem}
                        style={tarjeta}
                        aria-current={on ? "page" : undefined}
                        data-activo={on || undefined}
                        onClick={() => elegir(i.destino)}
                      >
                        <Dibujo icono={i.icono} />
                        <span className={styles.masEtiqueta}>{i.etiqueta}</span>
                        {n && <span className={styles.contador}>{n}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {FIJAS.map((p) => {
        const esActiva = !abierto && p.id === activa;
        return (
          <button
            key={p.id}
            type="button"
            data-tut={`pestana-${p.id}`}
            aria-current={esActiva ? "page" : undefined}
            onClick={() => {
              setAbierto(false);
              alElegir(p.id);
            }}
            className={styles.pestana}
            style={{ ...(esActiva ? seleccionada : normal), color: esActiva ? "#1c1626" : "#f6eed6" }}
          >
            <Dibujo icono={p.icono} />
            <span>{p.etiqueta}</span>
          </button>
        );
      })}
      <button
        type="button"
        data-tut="pestana-mas"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className={styles.pestana}
        style={{ ...(abierto || enMas ? seleccionada : normal), color: abierto || enMas ? "#1c1626" : "#f6eed6" }}
      >
        <IconoBase id="mas" />
        <span>Más</span>
        {!abierto && totalMas > 0 && <span className={styles.punto} role="img" aria-label="novedades" />}
      </button>
    </nav>
  );
}
