// simulacion.js — El bucle de entrenamiento. Conecta agente + entorno y
// lleva las estadísticas acumuladas. No toca el DOM.

import { ACCIONES, generarConexion, estadoIndice, calcularRecompensa } from "./entorno.js";

export class Simulador {
  constructor(agente) {
    this.agente = agente;
    this.reiniciar();
  }

  reiniciar() {
    this.episodios = 0;
    this.recompensaTotal = 0;
    this.aciertos = 0;
    this.exploraciones = 0;
    this.explotaciones = 0;
    this.falsosPositivos = 0;     // bloqueó tráfico normal (coste bajo)
    this.falsosNegativos = 0;     // permitió una intrusión (coste alto)
    this.ventana = [];            // recompensas recientes (promedio móvil)
    this.ventanaAciertos = [];    // aciertos recientes (precisión de los últimos 100)
    this.historialPromedio = [];  // serie para el gráfico
  }

  ejecutarEpisodio() {
    const conexion = generarConexion();
    const estado = estadoIndice(conexion);
    const accion = this.agente.elegirAccion(estado);
    const fueExploracion = this.agente.ultimaFueExploracion;
    const recompensa = calcularRecompensa(accion, conexion.anomalo);

    this.agente.actualizar(estado, accion, recompensa);
    this.agente.decaerEpsilon();

    // Decisión correcta = bloquear anómalo o permitir normal.
    const correcta = (accion === 1) === conexion.anomalo;

    this.episodios++;
    this.recompensaTotal += recompensa;
    if (correcta) this.aciertos++;
    else if (conexion.anomalo) this.falsosNegativos++;
    else this.falsosPositivos++;
    if (fueExploracion) this.exploraciones++; else this.explotaciones++;

    this.ventana.push(recompensa);
    if (this.ventana.length > 30) this.ventana.shift();
    const promedioMovil = this.ventana.reduce((a, b) => a + b, 0) / this.ventana.length;
    this.historialPromedio.push(promedioMovil);

    this.ventanaAciertos.push(correcta ? 1 : 0);
    if (this.ventanaAciertos.length > 100) this.ventanaAciertos.shift();
    const precisionReciente = this.ventanaAciertos.reduce((a, b) => a + b, 0) / this.ventanaAciertos.length;

    // Objeto "detalle" con todo lo que la interfaz necesita mostrar.
    return {
      conexion,
      estado,
      accion,
      accionNombre: ACCIONES[accion],
      fueExploracion,
      recompensa,
      correcta,
      promedioMovil,
      episodios: this.episodios,
      recompensaTotal: this.recompensaTotal,
      precision: this.aciertos / this.episodios,
      precisionReciente,
      falsosPositivos: this.falsosPositivos,
      falsosNegativos: this.falsosNegativos,
      epsilon: this.agente.epsilon,
    };
  }
}
