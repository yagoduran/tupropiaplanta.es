"use client";

import { useState, type FormEvent } from "react";
import { enviarContacto } from "@/app/contacto/acciones";
import styles from "./paginas.module.css";

const ASUNTOS = ["Problema técnico", "Mi cuenta", "Monedas y compras", "Sugerencia", "Otro"];

export function FormularioContacto({ correo }: { correo: string }) {
  const [asunto, setAsunto] = useState(ASUNTOS[0]);
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tecnicos, setTecnicos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caso, setCaso] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const datos = tecnicos ? `${navigator.userAgent} · ${window.innerWidth}x${window.innerHeight}` : null;
    try {
      const r = await enviarContacto({ asunto, email, mensaje, tecnicos: datos });
      if (r.ok) setCaso(r.caso);
      else setError(r.error);
    } catch {
      setError("No se ha podido enviar. Revisa tu conexión e inténtalo de nuevo.");
    }
    setEnviando(false);
  };

  if (caso) {
    return (
      <p className={styles.exito} role="status">
        <strong>Mensaje enviado.</strong> Te responderemos a {email}. Número de caso: {caso}.
      </p>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      <div className={styles.filaCampos}>
        <label className={styles.campo}>
          Asunto
          <select value={asunto} onChange={(e) => setAsunto(e.target.value)}>
            {ASUNTOS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className={styles.campo}>
          Email de respuesta
          <input
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
      </div>
      <label className={styles.campo}>
        Mensaje
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Describe qué ha pasado y en qué pantalla."
        />
      </label>
      <label className={styles.casilla}>
        <input type="checkbox" checked={tecnicos} onChange={(e) => setTecnicos(e.target.checked)} />
        Adjuntar datos técnicos (navegador y tamaño de pantalla)
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.pieForm}>
        <button type="submit" className={styles.principal} disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar"}
        </button>
        <span>También en {correo}</span>
      </div>
    </form>
  );
}
