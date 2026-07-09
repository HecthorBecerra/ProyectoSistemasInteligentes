# Documentación técnica del proyecto

Este documento explica **qué hace** la aplicación y **cómo está construida**,
a nivel de código. Es distinto del `README.md` (instrucciones de
instalación) y del `informe/informe.md` (entregable académico) — esto es
la referencia técnica para entender o modificar el proyecto.

## Qué es

Una aplicación web educativa de una sola página (`index.html`) sobre
Aprendizaje por Refuerzo (RL), con un caso práctico de detección de
intrusiones en redes computacionales. Combina contenido teórico (texto,
diagramas, fórmulas) con una simulación interactiva en la que un agente
de **Q-Learning** aprende, en vivo y en el navegador, a clasificar
conexiones de red como normales o anómalas.

No tiene backend: todo el cálculo (generación de datos, entrenamiento
del agente, gráficos) ocurre en JavaScript dentro del navegador del
usuario. No hay build step ni dependencias externas — se abre
directamente o se sirve como archivos estáticos, sin necesitar red.

## Qué hace, en la práctica

1. **Explica RL de forma teórica**: secciones de introducción,
   conceptos fundamentales (agente/entorno/estado/acción/recompensa/
   política), el proceso de aprendizaje por recompensas, y el algoritmo
   Q-Learning con su fórmula de actualización explicada visualmente.
2. **Modela un caso práctico**: cada conexión de red se resume en 3
   características (duración, bytes transferidos, intentos fallidos de
   autenticación) → 8 estados posibles. El agente decide `permitir` o
   `bloquear`, y recibe una recompensa asimétrica (dejar pasar una
   intrusión cuesta mucho más que bloquear tráfico normal por error).
3. **Deja jugar al usuario primero**: antes de entrenar al agente, el
   usuario clasifica manualmente 10 conexiones y obtiene un puntaje,
   para comparar su propio criterio contra la política que luego
   aprenda el agente.
4. **Entrena un agente en vivo**: al presionar "Iniciar", cada
   intervalo de tiempo se genera una conexión simulada, el agente
   decide, se actualiza su tabla de valores Q, y la interfaz refleja
   todo en tiempo real: tabla Q, gráfico de recompensa promedio,
   bitácora de decisiones y estadísticas (episodios, recompensa
   acumulada, epsilon, precisión, última decisión).
5. **Distingue exploración de explotación**: cada decisión del agente
   se etiqueta como "azar" (probó algo al azar) o "política" (usó lo
   aprendido), tanto en la bitácora como en un indicador dedicado.
6. **Simula que el atacante cambia de táctica**: un botón invierte en
   vivo qué combinación de características se considera anómala,
   forzando al agente a re-adaptarse (con un empujón temporal de
   exploración), para ilustrar el problema de la no estacionariedad.

## Arquitectura: separación de responsabilidades

El JavaScript está dividido por responsabilidad, sin build step
(módulos ES nativos, cargados con `<script type="module">`):

```
js/entorno.js             Reglas del caso práctico (el "mundo")
js/agente.js              Agente de Q-Learning genérico (el "cerebro")
js/simulacion.js          Conecta agente + entorno, lleva estadísticas
js/juego-manual.js        Mini-juego humano-vs-política (usa solo entorno.js)
js/formula-interactiva.js Laboratorio de la fórmula Q ← Q + α·(r − Q) (autocontenido)
js/visualizacion.js       Todo lo que toca el DOM (gráficos, tablas, log)
js/main.js                Cablea los botones de la UI con todo lo anterior
```

La regla de dependencia es de una sola vía:
`entorno.js` no depende de nadie → `agente.js` no depende de nadie →
`simulacion.js` depende de ambos → `visualizacion.js` solo depende de
`entorno.js` (para leer nombres de estados/acciones) → `main.js`
depende de todos y es el único que toca el DOM vía IDs de `index.html`.

### `js/entorno.js` — el mundo del problema

- `generarConexion()`: crea una conexión simulada al azar (duración,
  bytes, intentos fallidos) y decide si es anómala según una regla
  interna (`bytes muchos + fallos altos` = sospechoso, con 10% de
  ruido). Si `alternarTactica()` invirtió la táctica, la regla cambia a
  `duración larga + bytes pocos`.
- `estadoIndice(conexion)` / `describirEstado(indice)`: convierten
  entre una conexión y su índice de estado (0-7) y viceversa.
- `calcularRecompensa(accion, esAnomalo)`: aplica la matriz de
  recompensas (permitir/bloquear × normal/anómala).
- `alternarTactica()`, `tacticaActual()`, `reiniciarTactica()`:
  controlan el escenario de "cambio de táctica del atacante".

Este archivo no sabe nada de agentes ni de RL — solo define el dominio.

### `js/agente.js` — Q-Learning genérico

Clase `AgenteQLearning`, agnóstica al dominio (no sabe qué es una
"conexión"): solo ve índices de estado y de acción.

- `elegirAccion(estado)`: política epsilon-greedy. Con probabilidad
  `epsilon` elige una acción al azar (exploración); si no, la de mayor
  valor Q conocido (explotación). Guarda en
  `this.ultimaFueExploracion` cuál de las dos ocurrió.
- `actualizar(estado, accion, recompensa)`: aplica la regla de
  Q-Learning de un solo paso `Q(s,a) += α · (r − Q(s,a))`.
- `decaerEpsilon()`: reduce epsilon geométricamente hasta un mínimo.
- `reiniciar()`: vacía la tabla Q y reinicia epsilon a 1.0.

### `js/simulacion.js` — el bucle de entrenamiento

Clase `Simulador`: en cada `ejecutarEpisodio()`, genera una conexión,
pide al agente una acción, calcula la recompensa, actualiza al agente,
y lleva las estadísticas acumuladas (recompensa total, aciertos,
falsos positivos/negativos, conteo de exploración/explotación,
promedio móvil de recompensa y precisión de los últimos 100
episodios). Devuelve un objeto `detalle` con todo lo que la interfaz
necesita mostrar de ese episodio. No toca el DOM.

### `js/juego-manual.js` — el modo "juega tú primero"

Función `iniciarJuegoManual(...)`: recibe referencias a elementos del
DOM y callbacks, y maneja su propio mini-bucle de 10 rondas usando
únicamente `generarConexion()` y `calcularRecompensa()` de
`entorno.js`. No conoce al agente ni al simulador — es intencional,
para que el usuario compare su criterio contra el problema en sí, no
contra la implementación del agente. Al terminar las 10 rondas dispara
el callback `onTerminado(puntaje, total)`, que `main.js` usa para el
marcador "humano vs agente".

### `js/formula-interactiva.js` — el laboratorio de la fórmula

Función `iniciarLaboratorioFormula(refs)`: widget educativo
autocontenido de la sección 03. Mantiene un valor Q de juguete y aplica
`Q ← Q + α·(r − Q)` paso a paso sobre una recta numérica, con α
ajustable por slider y r seleccionable entre los valores de la matriz
de recompensa. No conoce al agente real — su único propósito es que el
usuario "sienta" el efecto de la tasa de aprendizaje.

### `js/visualizacion.js` — todo lo que toca el DOM

Funciones puras de renderizado, sin estado propio de negocio:
`inicializarGraficoRecompensa` / `actualizarGraficoRecompensa` (canvas
2D dibujado a mano — línea de cero, relleno con gradiente, curva y
punto de cabeza —, sin ninguna librería externa), `crearTablaQ` /
`actualizarTablaQ` (tarjetas de estado con barras de valor Q y
resaltado de la mejor acción), `crearMapaPolitica` /
`actualizarMapaPolitica` (tira de 8 celdas coloreadas por la mejor
acción de cada estado, con intensidad según la brecha entre valores Q
— la política π hecha visible), `agregarEntradaLog` (bitácora tipo
terminal), `bootBitacora` (secuencia de arranque con efecto de tipeo;
devuelve una función de cancelación que `main.js` invoca al primer
episodio real), `actualizarEstadisticas` (los tiles de números,
incluidos falsos positivos/negativos) e `inicializarFondoHero` (fondo
decorativo del encabezado: un campo de partículas conectadas por línea
que se mueven y rebotan en los bordes, dibujado en un `<canvas>` con su
propio bucle `requestAnimationFrame`; es puramente estético y respeta
`prefers-reduced-motion` dibujando un solo fotograma estático).

### `js/main.js` — el cableado

Crea las instancias (`AgenteQLearning`, `Simulador`), obtiene
referencias a los elementos del DOM por `id`, y define las funciones de
control (`iniciar`, `pausar`, `reiniciar`, `ejecutarPaso`) conectadas a
los botones. También inicializa el juego manual y el botón de cambio
de táctica. Es el único archivo que sabe que existen "botones".

El agente se crea con `alpha: 0.02, epsilonMin: 0.2`. Valores más altos
de ambos (p. ej. `alpha: 0.15, epsilonMin: 0.05`, los originales) hacen
que una muestra aislada del castigo poco frecuente de −10 (dejar pasar
una intrusión) empuje `Q(permitir)` muy por debajo de su valor real en
un solo paso; con `epsilon` decayendo a su mínimo hacia el episodio
~300, no queda suficiente exploración para corregir ese error, y el
agente puede quedar atrapado bloqueando conexiones normales de forma
casi permanente (la precisión acumulada se estabiliza entonces en
~35 % en vez de subir). Con los valores actuales la política se
estabiliza en ~60-72 % de precisión, resolviendo correctamente la
mayoría de los 8 estados.

## Interfaz (`index.html` + `css/style.css`)

Una sola página con navegación por anclas (`#introduccion`,
`#conceptos`, `#aprendizaje`, `#algoritmo`, `#caso-practico`,
`#simulacion`, `#conclusiones`, `#referencias`). El panel de simulación
contiene: juego manual, controles (iniciar/pausar/paso a paso/
reiniciar/velocidad), control de escenario (cambio de táctica),
estadísticas, gráfico de recompensa, bitácora de decisiones y la tabla
de valores Q.

El diseño sigue un sistema propio tipo "consola de monitoreo de red":

- **Color**: fondo azul-negro, un único acento ámbar para interacción y
  énfasis, y dos colores semánticos independientes del acento (verde-
  azulado = normal/acierto, coral = anómalo/error).
- **Tipografía**: `Bricolage Grotesque` para títulos, `Martian Mono`
  para datos/etiquetas/navegación, `Archivo` para texto corrido.
- **Detalles ambientales**: textura de scanlines de fondo, marcas de
  mira en las esquinas de la ventana, diagrama agente-entorno con un
  pulso animado, y un fondo de partículas tipo red animado en el
  encabezado (`inicializarFondoHero`).

Todas las variables de color/tipografía/espaciado están centralizadas
al inicio de `css/style.css` (`:root`) para poder ajustarlas rápido.

## Flujo de un episodio de entrenamiento

```
usuario presiona "Iniciar"
  → main.js arranca un setInterval que llama a ejecutarPaso()
    → simulador.ejecutarEpisodio()
        → entorno.generarConexion()          (¿cómo es esta conexión?)
        → entorno.estadoIndice(conexion)      (¿qué estado es?)
        → agente.elegirAccion(estado)         (explora o explota)
        → entorno.calcularRecompensa(...)     (¿qué tan buena fue la decisión?)
        → agente.actualizar(...)              (ajusta la tabla Q)
        → agente.decaerEpsilon()
      devuelve un objeto "detalle" con todo lo ocurrido
    → visualizacion.actualizarTablaQ(...)
    → visualizacion.agregarEntradaLog(...)
    → visualizacion.actualizarEstadisticas(...)
    → visualizacion.actualizarGraficoRecompensa(...)  (cada episodio)
```

## Cómo ejecutar / modificar

Ver `README.md` para instrucciones de instalación y ejecución local.
En resumen: no requiere backend ni build — abrir `index.html` o
servirlo con cualquier servidor estático, y editar los archivos
directamente (los cambios se ven al refrescar el navegador).
