// entorno.js — Reglas del caso práctico (el "mundo").
// No depende de nadie. Define el dominio: no sabe nada de agentes ni de RL.

export const ACCIONES = ["permitir", "bloquear"]; // 0 = permitir, 1 = bloquear
export const NUM_ESTADOS = 8;   // 2^3 combinaciones de 3 rasgos binarios
export const NUM_ACCIONES = 2;

// Estado interno del escenario ("cambio de táctica del atacante").
let tacticaInvertida = false;

// Crea una conexión simulada al azar y decide si es anómala según la regla interna.
export function generarConexion() {
  const duracion = Math.random(); // 0..1 (proporción del máximo)
  const bytes = Math.random();
  const fallos = Math.random();

  const duracionAlta = duracion > 0.6;
  const bytesMuchos = bytes > 0.6;
  const fallosAltos = fallos > 0.55;

  // Regla base: muchos bytes + fallos altos = sospechoso.
  // Táctica invertida: duración larga + pocos bytes = sospechoso.
  let anomalo = tacticaInvertida
    ? (duracionAlta && !bytesMuchos)
    : (bytesMuchos && fallosAltos);

  // 10% de ruido: el problema no es perfectamente separable.
  if (Math.random() < 0.1) anomalo = !anomalo;

  return { duracion, bytes, fallos, duracionAlta, bytesMuchos, fallosAltos, anomalo };
}

// Convierte una conexión en su índice de estado (0-7).
export function estadoIndice(c) {
  return (c.duracionAlta ? 1 : 0) | (c.bytesMuchos ? 2 : 0) | (c.fallosAltos ? 4 : 0);
}

// Describe un índice de estado como sus rasgos activos.
export function describirEstado(i) {
  return {
    duracionAlta: !!(i & 1),
    bytesMuchos: !!(i & 2),
    fallosAltos: !!(i & 4),
  };
}

// Matriz de recompensas asimétrica (permitir/bloquear × normal/anómala).
// Dejar pasar una intrusión (-10) cuesta mucho más que un bloqueo errado (-1).
export function calcularRecompensa(accion, esAnomalo) {
  const permitir = accion === 0;
  if (esAnomalo) return permitir ? -10 : 3;
  return permitir ? 1 : -1;
}

// Escenario de "cambio de táctica del atacante".
export function alternarTactica() {
  tacticaInvertida = !tacticaInvertida;
  return tacticaInvertida;
}
export function tacticaActual() {
  return tacticaInvertida ? "invertida" : "normal";
}
export function reiniciarTactica() {
  tacticaInvertida = false;
}
