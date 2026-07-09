// visualizacion.js — Todo lo que toca el DOM (gráficos, tabla Q, bitácora,
// estadísticas, fondo animado). Funciones de renderizado sin estado de negocio.
// Sólo depende de entorno.js para leer nombres/estructura de estados.

import { NUM_ESTADOS } from "./entorno.js";

// ─────────────────────────────────────────────────────────────
// GRÁFICO DE RECOMPENSA (canvas propio, sin dependencias externas)
// ─────────────────────────────────────────────────────────────
let _canvas = null;
let _ctx = null;

export function inicializarGraficoRecompensa(canvas) {
  _canvas = canvas;
  _ctx = canvas.getContext("2d");
  actualizarGraficoRecompensa([]);
}

export function actualizarGraficoRecompensa(serie) {
  if (!_canvas || !_ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = _canvas.clientWidth || 400;
  const h = _canvas.clientHeight || 200;
  if (_canvas.width !== w * dpr) { _canvas.width = w * dpr; _canvas.height = h * dpr; }
  const ctx = _ctx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const min = -10, max = 3, pad = 6;
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);

  // línea de cero
  ctx.strokeStyle = "#2a3446";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(0, y(0)); ctx.lineTo(w, y(0)); ctx.stroke();
  ctx.setLineDash([]);
  if (!serie || serie.length < 2) return;

  const N = serie.length;
  const x = (i) => (i / (N - 1)) * w;

  // relleno bajo la curva
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#f6a72333");
  grad.addColorStop(1, "#f6a72300");
  ctx.beginPath(); ctx.moveTo(0, y(serie[0]));
  for (let i = 1; i < N; i++) ctx.lineTo(x(i), y(serie[i]));
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // curva
  ctx.beginPath(); ctx.moveTo(0, y(serie[0]));
  for (let i = 1; i < N; i++) ctx.lineTo(x(i), y(serie[i]));
  ctx.strokeStyle = "#f6a723"; ctx.lineWidth = 2; ctx.stroke();

  // punto de cabeza
  ctx.beginPath(); ctx.arc(x(N - 1), y(serie[N - 1]), 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd488"; ctx.fill();
}

// ─────────────────────────────────────────────────────────────
// TABLA Q (tarjetas de estado con barras de valor Q)
// ─────────────────────────────────────────────────────────────
function chipsDe(i) {
  const p = [];
  if (i & 1) p.push("DUR↑");
  if (i & 2) p.push("BYT↑");
  if (i & 4) p.push("FAL↑");
  return p.length ? p.join("·") : "base";
}

export function crearTablaQ(contenedor) {
  let html = "";
  for (let i = 0; i < NUM_ESTADOS; i++) {
    html += `
      <div class="qcard" id="qcard-${i}">
        <div class="qcard__cab">
          <span class="qcard__nombre">S${i}</span>
          <span class="qcard__chips">${chipsDe(i)}</span>
        </div>
        <div class="qrow" data-accion="0">
          <div class="qrow__cab"><span class="qrow__etq">PERMITIR</span><span class="qrow__val">+0.00</span></div>
          <div class="qrow__track"><div class="qrow__fill"></div></div>
        </div>
        <div class="qrow" data-accion="1">
          <div class="qrow__cab"><span class="qrow__etq">BLOQUEAR</span><span class="qrow__val">+0.00</span></div>
          <div class="qrow__track"><div class="qrow__fill"></div></div>
        </div>
      </div>`;
  }
  contenedor.innerHTML = html;
}

export function actualizarTablaQ(Q) {
  for (let i = 0; i < Q.length; i++) {
    const card = document.getElementById(`qcard-${i}`);
    if (!card) continue;
    const fila = Q[i];
    const activo = fila[0] !== 0 || fila[1] !== 0;
    const mejor = fila[0] >= fila[1] ? 0 : 1;
    card.classList.toggle("qcard--activo", activo);

    card.querySelectorAll(".qrow").forEach((row) => {
      const a = +row.dataset.accion;
      const v = fila[a];
      const esMejor = a === mejor && activo;
      const pct = Math.min(100, (Math.abs(v) / 10) * 100).toFixed(0);
      const etq = row.querySelector(".qrow__etq");
      const val = row.querySelector(".qrow__val");
      const fill = row.querySelector(".qrow__fill");

      etq.style.color = esMejor ? "var(--ambar)" : "var(--muted)";
      val.textContent = (v >= 0 ? "+" : "") + v.toFixed(2);
      val.style.color = v >= 0.01 ? "var(--verde)" : (v <= -0.01 ? "var(--coral)" : "#5b6678");
      fill.style.width = pct + "%";
      fill.style.background = esMejor ? "var(--ambar)" : (v >= 0 ? "#2f7a6b" : "#7a3b36");
      row.classList.toggle("qrow--mejor", esMejor);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// MAPA DE POLÍTICA (π: mejor acción por estado, con confianza)
// ─────────────────────────────────────────────────────────────
export function crearMapaPolitica(contenedor) {
  let html = "";
  for (let i = 0; i < NUM_ESTADOS; i++) {
    html += `
      <div class="pcelda" id="pcelda-${i}">
        <div class="pcelda__s">S${i}</div>
        <div class="pcelda__chips">${chipsDe(i)}</div>
        <div class="pcelda__accion">SIN DATOS</div>
      </div>`;
  }
  contenedor.innerHTML = html;
}

export function actualizarMapaPolitica(Q) {
  for (let i = 0; i < Q.length; i++) {
    const celda = document.getElementById(`pcelda-${i}`);
    if (!celda) continue;
    const [qPermitir, qBloquear] = Q[i];
    const accionEl = celda.querySelector(".pcelda__accion");
    const visitado = qPermitir !== 0 || qBloquear !== 0;

    if (!visitado) {
      celda.style.background = "transparent";
      celda.style.borderColor = "var(--linea)";
      accionEl.textContent = "SIN DATOS";
      accionEl.style.color = "var(--tenue)";
      continue;
    }
    const bloquear = qBloquear > qPermitir;
    // confianza = brecha entre acciones, saturada a 4 puntos de valor Q
    const confianza = Math.min(1, Math.abs(qBloquear - qPermitir) / 4);
    const alpha = 0.06 + confianza * 0.3;
    const rgb = bloquear ? "255,107,94" : "62,199,176";
    celda.style.background = `rgba(${rgb},${alpha.toFixed(2)})`;
    celda.style.borderColor = `rgba(${rgb},${Math.min(1, alpha + 0.25).toFixed(2)})`;
    accionEl.textContent = bloquear ? "✕ BLOQUEAR" : "✓ PERMITIR";
    accionEl.style.color = bloquear ? "var(--coral)" : "var(--verde)";
  }
}

// ─────────────────────────────────────────────────────────────
// BITÁCORA (log tipo terminal)
// ─────────────────────────────────────────────────────────────
export function agregarEntradaLog(contenedor, { tag, texto, tipo }) {
  const div = document.createElement("div");
  div.className = "logline logline--" + (tipo || "info");
  div.innerHTML = `<span class="logline__tag">${tag}</span> ${texto}`;
  contenedor.prepend(div);
  // recorta a 42 entradas
  while (contenedor.children.length > 42) contenedor.lastElementChild.remove();
}

export function limpiarLog(contenedor) {
  contenedor.innerHTML = "";
}

// Secuencia de arranque: escribe líneas con efecto de tipeo, una tras otra.
// Devuelve una función de cancelación (completa la línea en curso y se detiene).
export function bootBitacora(contenedor, lineas) {
  let cancelado = false;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    for (const linea of lineas) {
      if (cancelado) break;
      const div = document.createElement("div");
      div.className = "logline logline--" + (linea.tipo || "sys");
      const tag = document.createElement("span");
      tag.className = "logline__tag";
      tag.textContent = "> ";
      const txt = document.createElement("span");
      div.append(tag, txt);
      contenedor.prepend(div);
      for (const ch of linea.texto) {
        if (cancelado) { txt.textContent = linea.texto; break; }
        txt.textContent += ch;
        await espera(9);
      }
      if (!cancelado) await espera(240);
    }
  })();

  return () => { cancelado = true; };
}

// ─────────────────────────────────────────────────────────────
// ESTADÍSTICAS (los tiles de números)
// ─────────────────────────────────────────────────────────────
export function actualizarEstadisticas(refs, d) {
  refs.episodios.textContent = d.episodios;
  refs.recompensa.textContent = (d.recompensaTotal >= 0 ? "+" : "") + Math.round(d.recompensaTotal);
  refs.recompensa.style.color = d.recompensaTotal >= 0 ? "var(--verde)" : "var(--coral)";
  refs.epsilon.textContent = d.epsilon.toFixed(2);
  refs.precision.textContent = d.episodios ? Math.round(d.precision * 100) + "%" : "—";
  refs.fp.textContent = d.falsosPositivos;
  refs.fn.textContent = d.falsosNegativos;

  const bloquea = d.accion === 1;
  refs.ultima.textContent = bloquea ? "✕ BLOQUEAR" : "✓ PERMITIR";
  refs.ultima.style.color = d.correcta ? "var(--verde)" : "var(--coral)";
  refs.ultimaTipo.textContent = d.fueExploracion ? "por AZAR" : "por POLÍTICA";
  refs.ultimaTipo.style.color = d.fueExploracion ? "var(--violeta)" : "var(--muted)";
}

export function reiniciarEstadisticas(refs) {
  refs.episodios.textContent = "0";
  refs.recompensa.textContent = "+0";
  refs.recompensa.style.color = "var(--verde)";
  refs.epsilon.textContent = "1.00";
  refs.precision.textContent = "—";
  refs.fp.textContent = "0";
  refs.fn.textContent = "0";
  refs.ultima.textContent = "—";
  refs.ultima.style.color = "#5b6678";
  refs.ultimaTipo.textContent = "—";
  refs.ultimaTipo.style.color = "#5b6678";
}

// ─────────────────────────────────────────────────────────────
// FONDO ANIMADO DEL HERO (campo de partículas tipo red)
// ─────────────────────────────────────────────────────────────
export function inicializarFondoHero(canvas) {
  const ctx = canvas.getContext("2d");
  const N = 42;
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let nodes = [];
  const reset = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w; canvas.height = h;
    nodes = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
    }));
  };
  reset();
  const draw = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 12000) {
          ctx.globalAlpha = (1 - d2 / 12000) * 0.4;
          ctx.strokeStyle = "#f6a723"; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 0.8;
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = "#3ec7b0"; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!sinMovimiento) requestAnimationFrame(draw); // reduced-motion: un solo fotograma estático
  };
  draw();
}
