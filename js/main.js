// main.js — El cableado. Crea las instancias, obtiene referencias del DOM por
// id y conecta los botones con todo lo anterior. Único archivo que toca la UI.

import { AgenteQLearning } from "./agente.js";
import { Simulador } from "./simulacion.js";
import { alternarTactica, reiniciarTactica } from "./entorno.js";
import { iniciarJuegoManual } from "./juego-manual.js";
import { iniciarLaboratorioFormula } from "./formula-interactiva.js";
import {
  inicializarGraficoRecompensa, actualizarGraficoRecompensa,
  crearTablaQ, actualizarTablaQ,
  crearMapaPolitica, actualizarMapaPolitica,
  agregarEntradaLog, limpiarLog, bootBitacora,
  actualizarEstadisticas, reiniciarEstadisticas,
  inicializarFondoHero,
} from "./visualizacion.js";

// ── instancias ──
const agente = new AgenteQLearning({ alpha: 0.02, epsilon: 1.0, epsilonMin: 0.2, decaimiento: 0.99 });
const simulador = new Simulador(agente);

// ── referencias del DOM ──
const $ = (id) => document.getElementById(id);

const statsRefs = {
  episodios: $("stat-episodios"),
  recompensa: $("stat-recompensa"),
  epsilon: $("stat-epsilon"),
  precision: $("stat-precision"),
  fp: $("stat-fp"),
  fn: $("stat-fn"),
  ultima: $("stat-ultima"),
  ultimaTipo: $("stat-ultima-tipo"),
};
const bitacora = $("bitacora");
const tablaQ = $("tabla-q");
const mapaPolitica = $("mapa-politica");
const grafico = $("grafico-recompensa");
const luz = $("agente-luz");
const estadoTxt = $("agente-estado");
const btnTactica = $("btn-tactica");

const versusRefs = {
  humano: $("versus-humano"),
  humanoSub: $("versus-humano-sub"),
  agente: $("versus-agente"),
  agenteSub: $("versus-agente-sub"),
  veredicto: $("versus-veredicto"),
};

// ── estado del bucle ──
let timer = null;
let corriendo = false;
let velocidad = intervalo(6);

// ── versus: humano vs agente ──
const VERSUS_EP_MIN = 150;   // episodios mínimos para mostrar la precisión del agente
let puntajeHumano = null;    // 0..10, se fija al terminar el juego manual
let ultimoDetalle = null;    // último detalle del simulador (para precisión reciente)

function actualizarVersus() {
  const humanoListo = puntajeHumano !== null;
  const agenteListo = simulador.episodios >= VERSUS_EP_MIN && ultimoDetalle;

  if (humanoListo) {
    versusRefs.humano.textContent = puntajeHumano * 10 + "%";
    versusRefs.humanoSub.textContent = `${puntajeHumano}/10 en el juego manual`;
  } else {
    versusRefs.humano.textContent = "—";
    versusRefs.humanoSub.textContent = "juega las 10 rondas de arriba";
  }

  if (agenteListo) {
    versusRefs.agente.textContent = Math.round(ultimoDetalle.precisionReciente * 100) + "%";
    versusRefs.agenteSub.textContent = `últimos 100 episodios · ${simulador.episodios} totales`;
  } else {
    versusRefs.agente.textContent = "—";
    versusRefs.agenteSub.textContent = "entrena al menos 150 episodios";
  }

  if (humanoListo && agenteListo) {
    const h = puntajeHumano * 10;
    const a = Math.round(ultimoDetalle.precisionReciente * 100);
    const dif = Math.abs(a - h);
    versusRefs.veredicto.textContent =
      a > h ? `El agente te supera por ${dif} puntos — y nadie le dijo nunca cuál era la respuesta correcta.`
      : a < h ? `Aún le ganas por ${dif} puntos. Dale más episodios: con ε=0.20 sigue apostando al azar 1 de cada 5 veces.`
      : "Empate técnico: tu intuición y su tabla Q llegaron al mismo lugar.";
  } else {
    versusRefs.veredicto.textContent = "El duelo se resuelve cuando ambos marcadores estén en juego.";
  }
}

function intervalo(v) { return Math.round(620 - v * 58); }

function marcarEstado() {
  const color = corriendo ? "var(--verde)" : (simulador.episodios ? "var(--ambar)" : "var(--ambar)");
  luz.style.background = color;
  luz.style.boxShadow = `0 0 10px ${color}`;
  estadoTxt.textContent = corriendo ? "ENTRENANDO" : (simulador.episodios ? "EN PAUSA" : "LISTO");
  estadoTxt.style.color = color;
}

// ── un paso de entrenamiento ──
function ejecutarPaso() {
  if (cancelarBoot) { cancelarBoot(); cancelarBoot = null; }
  const d = simulador.ejecutarEpisodio();
  ultimoDetalle = d;
  actualizarEstadisticas(statsRefs, d);
  actualizarTablaQ(agente.Q);
  actualizarMapaPolitica(agente.Q);
  agregarEntradaLog(bitacora, {
    tag: "#" + String(d.episodios).padStart(3, "0"),
    texto: `S${d.estado} → ${d.accionNombre.toUpperCase()} · r=${d.recompensa > 0 ? "+" + d.recompensa : d.recompensa} · ${d.fueExploracion ? "AZAR" : "POLÍTICA"} · ${d.correcta ? "OK" : "FALLO"}`,
    tipo: d.correcta ? "ok" : "fallo",
  });
  actualizarGraficoRecompensa(simulador.historialPromedio);
  actualizarVersus();
}

// ── controles ──
function iniciar() {
  if (corriendo) return;
  corriendo = true;
  marcarEstado();
  clearInterval(timer);
  timer = setInterval(ejecutarPaso, velocidad);
}
function pausar() {
  corriendo = false;
  clearInterval(timer);
  marcarEstado();
}
function paso() {
  pausar();
  ejecutarPaso();
}
function reiniciar() {
  pausar();
  if (cancelarBoot) { cancelarBoot(); cancelarBoot = null; }
  agente.reiniciar();
  simulador.reiniciar();
  ultimoDetalle = null;
  reiniciarTactica();
  reiniciarEstadisticas(statsRefs);
  actualizarTablaQ(agente.Q);
  actualizarMapaPolitica(agente.Q);
  limpiarLog(bitacora);
  agregarEntradaLog(bitacora, { tag: "! ", texto: "tabla Q vaciada · ε=1.00 · listo para entrenar de nuevo", tipo: "aviso" });
  actualizarGraficoRecompensa([]);
  actualizarVersus();
  marcarTactica("normal");
  marcarEstado();
}
function cambiarVelocidad(e) {
  velocidad = intervalo(+e.target.value);
  if (corriendo) { clearInterval(timer); timer = setInterval(ejecutarPaso, velocidad); }
}

function marcarTactica(t) {
  const inv = t === "invertida";
  btnTactica.textContent = "⚡ CAMBIAR TÁCTICA · " + (inv ? "INVERTIDA" : "NORMAL");
  btnTactica.style.color = inv ? "var(--violeta)" : "var(--muted-2)";
  btnTactica.style.borderColor = inv ? "#c9a0ff55" : "#7d889955";
  btnTactica.style.background = inv ? "#160f22" : "#0e1420";
}
function cambiarTactica() {
  const inv = alternarTactica();
  agente.empujarExploracion(0.6);
  marcarTactica(inv ? "invertida" : "normal");
  agregarEntradaLog(bitacora, {
    tag: "! ",
    texto: inv ? "táctica INVERTIDA — re-explorando" : "táctica restaurada a normal",
    tipo: "aviso",
  });
}

// ── juego manual ──
const juego = iniciarJuegoManual({
  intro: $("manual-intro"),
  jugando: $("manual-jugando"),
  hecho: $("manual-hecho"),
  barras: $("manual-bars"),
  feedback: $("manual-feedback"),
  ronda: $("manual-ronda"),
  puntaje: $("manual-puntaje"),
  puntajeFinal: $("manual-puntaje-final"),
  cierre: $("manual-cierre"),
}, {
  onTerminado: (puntaje) => { puntajeHumano = puntaje; actualizarVersus(); },
});

// ── laboratorio de la fórmula ──
iniciarLaboratorioFormula({
  alphaInput: $("flab-alpha"),
  alphaVal: $("flab-alpha-val"),
  rBtns: document.querySelectorAll(".flab__rbtn"),
  markerQ: $("flab-marker-q"),
  markerR: $("flab-marker-r"),
  cero: $("flab-cero"),
  calc: $("flab-calc"),
  btnPaso: $("flab-paso"),
  btnReset: $("flab-reset"),
});

// ── enganchar botones ──
$("btn-iniciar").addEventListener("click", iniciar);
$("btn-pausar").addEventListener("click", pausar);
$("btn-paso").addEventListener("click", paso);
$("btn-reiniciar").addEventListener("click", reiniciar);
$("vel").addEventListener("input", cambiarVelocidad);
btnTactica.addEventListener("click", cambiarTactica);

$("btn-manual-iniciar").addEventListener("click", juego.empezar);
$("btn-manual-reintentar").addEventListener("click", juego.empezar);
$("btn-permitir").addEventListener("click", juego.permitir);
$("btn-bloquear").addEventListener("click", juego.bloquear);

// ── inicialización de vistas ──
crearTablaQ(tablaQ);
actualizarTablaQ(agente.Q);
crearMapaPolitica(mapaPolitica);
actualizarMapaPolitica(agente.Q);
inicializarGraficoRecompensa(grafico);
reiniciarEstadisticas(statsRefs);
actualizarVersus();
marcarEstado();
marcarTactica("normal");
inicializarFondoHero($("hero-particulas"));

// secuencia de arranque de la bitácora (se cancela al primer episodio real)
let cancelarBoot = bootBitacora(bitacora, [
  { texto: "RL·IDS v1.0 — consola de entrenamiento en línea", tipo: "sys" },
  { texto: "tabla Q en memoria · 8 estados × 2 acciones · todo en cero", tipo: "sys" },
  { texto: "política ε-greedy · ε=1.00 → por ahora decide 100% al azar", tipo: "sys" },
  { texto: "entorno listo · tráfico simulado · 10% de ruido", tipo: "sys" },
  { texto: "agente en espera — pulsa ▶ INICIAR para entrenar", tipo: "ok" },
]);
window.addEventListener("resize", () => actualizarGraficoRecompensa(simulador.historialPromedio));
