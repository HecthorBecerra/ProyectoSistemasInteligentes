# Aprendizaje por Refuerzo para la Detección de Intrusiones en Redes

Aplicación web educativa e interactiva sobre Aprendizaje por Refuerzo
(RL), con un caso práctico de detección de intrusiones en redes
computacionales resuelto mediante un agente de Q-Learning que aprende
en vivo en el navegador.

**Asignatura:** Sistemas Inteligentes
**Repositorio:** https://github.com/HecthorBecerra/ProyectoSistemasInteligentes
**Aplicación en línea:** https://hecthorbecerra.github.io/ProyectoSistemasInteligentes/

## Cómo ejecutar

No requiere instalación ni backend: todo corre en el navegador con
HTML, CSS y JavaScript plano (ES modules).

**Opción 1 — abrir directamente:**
Abrir `index.html` en un navegador moderno (Chrome, Edge, Firefox).

> Nota: algunos navegadores restringen los módulos ES (`import`/`export`)
> cuando el archivo se abre con `file://`. Si la simulación no carga,
> usar la opción 2.

**Opción 2 — servidor local simple (recomendado):**

```bash
# Con Python ya instalado
python -m http.server 8000

# o con la extensión "Live Server" de VS Code
```

Luego abrir `http://localhost:8000` en el navegador.

**Opción 3 — GitHub Pages:**
Activar GitHub Pages en la configuración del repositorio (rama `main`,
carpeta raíz `/`) y acceder a la URL que genera GitHub.

## Estructura del proyecto

```
index.html              Contenido educativo + interfaz de la simulación
css/style.css            Estilos (variables de color/espaciado al inicio)
js/entorno.js             Reglas del caso práctico: estados, acciones, recompensas
js/agente.js              Agente de Q-Learning (no conoce el dominio, es reutilizable)
js/simulacion.js          Conecta agente + entorno, lleva las estadísticas
js/juego-manual.js        Mini-juego "clasifica tú primero" (10 rondas)
js/formula-interactiva.js Laboratorio interactivo de la regla de actualización
js/visualizacion.js       Todo lo que actualiza el DOM (tabla Q, mapa de política, gráfico, log)
js/main.js                Cablea los botones de la UI con el simulador
```

La lógica está separada por responsabilidad para poder modificar una
parte (p. ej. las recompensas en `entorno.js`) sin tocar el resto.

## Tecnologías

* HTML5 / CSS3 (responsive, sin framework)
* JavaScript (ES modules, sin build step)
* Sin dependencias externas: el gráfico de recompensa y el fondo
  animado del encabezado se dibujan a mano sobre `<canvas>` 2D

## Referencias

* Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.). MIT Press.
* Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. *Machine Learning*, 8(3-4), 279-292.
* Nguyen, T. T., & Reddi, V. J. (2021). Deep Reinforcement Learning for Cyber Security. *IEEE Transactions on Neural Networks and Learning Systems*.
