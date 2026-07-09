// agente.js — Agente de Q-Learning genérico (el "cerebro").
// Agnóstico al dominio: sólo ve índices de estado y de acción.

import { NUM_ESTADOS, NUM_ACCIONES } from "./entorno.js";

export class AgenteQLearning {
  constructor({
    nEstados = NUM_ESTADOS,
    nAcciones = NUM_ACCIONES,
    alpha = 0.15,        // tasa de aprendizaje
    epsilon = 1.0,       // exploración inicial
    epsilonMin = 0.05,
    decaimiento = 0.99,
  } = {}) {
    this.nEstados = nEstados;
    this.nAcciones = nAcciones;
    this.alpha = alpha;
    this.epsilon = epsilon;
    this.epsilonInicial = epsilon;
    this.epsilonMin = epsilonMin;
    this.decaimiento = decaimiento;
    this.Q = Array.from({ length: nEstados }, () => Array(nAcciones).fill(0));
    this.ultimaFueExploracion = false;
  }

  // Política epsilon-greedy: con probabilidad epsilon explora, si no explota.
  elegirAccion(estado) {
    if (Math.random() < this.epsilon) {
      this.ultimaFueExploracion = true;
      return Math.floor(Math.random() * this.nAcciones);
    }
    this.ultimaFueExploracion = false;
    const fila = this.Q[estado];
    let mejor = 0, mejorV = -Infinity;
    for (let a = 0; a < fila.length; a++) {
      if (fila[a] > mejorV || (fila[a] === mejorV && Math.random() < 0.5)) {
        mejorV = fila[a];
        mejor = a;
      }
    }
    return mejor;
  }

  // Regla de Q-Learning de un solo paso: Q(s,a) += α · (r − Q(s,a)).
  actualizar(estado, accion, recompensa) {
    const q = this.Q[estado][accion];
    this.Q[estado][accion] = q + this.alpha * (recompensa - q);
  }

  // Reduce epsilon geométricamente hasta un mínimo.
  decaerEpsilon() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.decaimiento);
  }

  // Empujón temporal de exploración (p. ej. cuando cambia la táctica del atacante).
  empujarExploracion(valor = 0.6) {
    this.epsilon = Math.max(this.epsilon, valor);
  }

  // Vacía la tabla Q y reinicia epsilon a su valor inicial.
  reiniciar() {
    this.Q = Array.from({ length: this.nEstados }, () => Array(this.nAcciones).fill(0));
    this.epsilon = this.epsilonInicial;
    this.ultimaFueExploracion = false;
  }
}
