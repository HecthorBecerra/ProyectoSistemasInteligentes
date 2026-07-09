// formula-interactiva.js — Laboratorio de la regla de actualización.
// Widget educativo autocontenido: aplica Q ← Q + α·(r − Q) sobre un valor de
// juguete para que el usuario "sienta" el efecto de α. No conoce al agente real.

// refs: { alphaInput, alphaVal, rBtns, markerQ, markerR, cero, calc, btnPaso, btnReset }
export function iniciarLaboratorioFormula(refs) {
  // rango del eje con un pequeño margen para que los marcadores no se corten
  const MIN = -10.5, MAX = 3.5;
  let q = 0;
  let r = 3;
  let alpha = parseFloat(refs.alphaInput.value);
  let pasos = 0;

  const pct = (v) => (((v - MIN) / (MAX - MIN)) * 100).toFixed(2) + "%";
  const fmt = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);

  function pintar() {
    refs.markerQ.style.left = pct(q);
    refs.markerR.style.left = pct(r);
    refs.markerR.textContent = "r = " + (r > 0 ? "+" + r : "−" + Math.abs(r));
    refs.markerR.style.color = r > 0 ? "var(--verde)" : "var(--coral)";
    refs.alphaVal.textContent = alpha.toFixed(2);

    const nuevo = q + alpha * (r - q);
    refs.calc.innerHTML =
      `<span style="color:var(--tenue)">paso ${pasos + 1}:</span> ` +
      `Q ← ${fmt(q)} + <span class="c-violeta">${alpha.toFixed(2)}</span> · ` +
      `(${fmt(r)} − ${fmt(q)}) = <b>${fmt(nuevo)}</b>`;
  }

  function aplicarPaso() {
    q = q + alpha * (r - q);
    pasos++;
    pintar();
  }

  function reiniciar() {
    q = 0;
    pasos = 0;
    pintar();
  }

  refs.alphaInput.addEventListener("input", (e) => {
    alpha = parseFloat(e.target.value);
    pintar();
  });

  refs.rBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      r = parseFloat(btn.dataset.r);
      refs.rBtns.forEach((b) => b.classList.toggle("flab__rbtn--sel", b === btn));
      pintar();
    });
  });

  refs.btnPaso.addEventListener("click", aplicarPaso);
  refs.btnReset.addEventListener("click", reiniciar);

  refs.cero.style.left = pct(0);
  pintar();
}
