// juego-manual.js — El modo "juega tú primero".
// Mini-bucle de 10 rondas que usa únicamente entorno.js (no conoce al agente
// ni al simulador): el usuario compara su criterio contra el problema en sí.

import { generarConexion, calcularRecompensa } from "./entorno.js";

const TOTAL_RONDAS = 10;

// refs: { intro, jugando, hecho, barras, feedback, ronda, puntaje, puntajeFinal, cierre }
// callbacks: { onCambioFase, onTerminado(puntaje, total) } (opcionales)
export function iniciarJuegoManual(refs, callbacks = {}) {
  let ronda = 0;
  let puntaje = 0;
  let conexion = null;

  function mostrarFase(fase) {
    refs.intro.style.display = fase === "intro" ? "" : "none";
    refs.jugando.style.display = fase === "jugando" ? "" : "none";
    refs.hecho.style.display = fase === "hecho" ? "" : "none";
    if (callbacks.onCambioFase) callbacks.onCambioFase(fase);
  }

  function pintarBarras(c) {
    const filas = [
      { label: "DURACIÓN", val: c.duracion, color: "var(--ambar)" },
      { label: "BYTES", val: c.bytes, color: "var(--verde)" },
      { label: "FALLOS AUTH", val: c.fallos, color: "var(--coral)" },
    ];
    refs.barras.innerHTML = filas.map((f) => {
      const pct = Math.round(f.val * 100);
      return `
        <div class="mbar">
          <div class="mbar__cab"><span>${f.label}</span><span class="mbar__val">${pct}%</span></div>
          <div class="mbar__track"><div class="mbar__fill" style="width:${pct}%; background:${f.color};"></div></div>
        </div>`;
    }).join("");
  }

  function nuevaRonda() {
    conexion = generarConexion();
    pintarBarras(conexion);
    refs.ronda.textContent = Math.min(ronda + 1, TOTAL_RONDAS);
    refs.puntaje.textContent = puntaje;
  }

  function decidir(accion) {
    if (!conexion) return;
    const correcta = (accion === 1) === conexion.anomalo;
    if (correcta) puntaje++;

    refs.feedback.textContent = correcta
      ? (conexion.anomalo ? "✓ Era ANÓMALA — buen bloqueo" : "✓ Era NORMAL — bien permitida")
      : (conexion.anomalo ? "✕ Era ANÓMALA — la dejaste pasar" : "✕ Era NORMAL — bloqueo innecesario");
    refs.feedback.style.color = correcta ? "var(--verde)" : "var(--coral)";

    ronda++;
    refs.puntaje.textContent = puntaje;

    if (ronda >= TOTAL_RONDAS) {
      terminar();
    } else {
      nuevaRonda();
    }
  }

  function terminar() {
    refs.puntajeFinal.textContent = puntaje;
    refs.cierre.textContent =
      puntaje >= 8 ? "Excelente criterio. Veamos si el agente descubre lo mismo — sin que nadie se lo diga."
      : puntaje >= 5 ? "Nada fácil con sólo 3 pistas y ruido. El agente enfrenta exactamente el mismo problema."
      : "Difícil, ¿verdad? Ahora observa cómo el agente lo resuelve por prueba y error.";
    mostrarFase("hecho");
    if (callbacks.onTerminado) callbacks.onTerminado(puntaje, TOTAL_RONDAS);
  }

  function empezar() {
    ronda = 0;
    puntaje = 0;
    refs.feedback.textContent = "";
    mostrarFase("jugando");
    nuevaRonda();
  }

  mostrarFase("intro");
  // API pública para que main.js cablee los botones.
  return { empezar, permitir: () => decidir(0), bloquear: () => decidir(1) };
}
