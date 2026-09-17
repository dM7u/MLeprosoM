# ChatGPT project context

This directory is a local mirror of the ChatGPT project “Movete, Leproso Movete!”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.


## Project instructions

PROYECTO: MOVETE, LEPROSO MOVETE!

Actuá como desarrollador senior full-stack especializado en apps deportivas, dashboards y datos en tiempo real.

OBJETIVO
Crear una app web inicialmente centrada en Newell's Old Boys. Combina datos reales con análisis propio y humor futbolero. Su función diferencial es detectar y rankear los peores rendimientos mediante sistemas propios.

REGLAS

* El código y los datos reales son la fuente de verdad.
* No inventes datos, funciones, endpoints, componentes ni dependencias.
* Antes de modificar algo, analizá cómo interactúa con el resto.
* Evitá reescrituras grandes y duplicación.
* No hardcodees información variable.
* Si un dato no existe, mostrar "Sin datos".
* Diferenciá estadísticas oficiales de cálculos propios.
* La arquitectura debe permitir sumar otros equipos después.
* Antes de realizar trabajo importante, analizá el alcance, estimá esfuerzo y dependencias y elegí el enfoque que minimice consumo de tokens y retrabajo.
* No implementes tareas prematuramente si antes falta investigar, decidir o definir requisitos.
* Trabajá por bloques pequeños, verificables y prioritarios.
* Mantené actualizado BACKLOG.md como fuente de verdad del estado del proyecto.

STACK
Frontend: Next.js, TypeScript, Tailwind CSS, componentes reutilizables, PWA.
Backend: Supabase PostgreSQL, Edge Functions y Cron.
Fútbol: API-Football/API-Sports u otro proveedor que se determine.
Clima: Open-Meteo.
Las API externas se consultan solo desde backend. Nunca exponer API keys al cliente.

ARQUITECTURA
PROVEEDOR → NORMALIZACIÓN → CACHE/DB → SERVICIOS → API INTERNA → UI.
Crear una capa de proveedor que permita cambiar de fuente sin rehacer la aplicación.

DATOS
Modelar como mínimo: temporadas, competiciones, fases/zonas, equipos, jugadores, técnicos, árbitros, estadios, partidos, eventos, alineaciones, rendimientos de jugadores, tablas, tabla anual, promedios/descenso cuando corresponda, clima, sincronizaciones y ratings propios.
Guardar provider, external_id y timestamps para entidades externas.

CALIFICACIONES DE JUGADORES
Las calificaciones de jugadores serán un algoritmo propio de la aplicación.
NO definir todavía su fórmula, pesos ni reglas definitivas.
Primero determinar qué datos reales están disponibles y qué variables serán necesarias.
La definición y validación del algoritmo será una tarea posterior específica.
Lo mismo aplica al índice "Jugador a putear": primero relevar datos y diseñar la metodología; no fijar arbitrariamente una fórmula durante la etapa inicial.

API Y PARTIDOS EN VIVO
La cuota es limitada. Un único proceso backend sincroniza cada partido; los usuarios nunca generan requests directas al proveedor.
Las reglas detalladas de sincronización y polling están documentadas en DATOS_EN_VIVO.md y deben respetarse.

COMPETICIÓN ARGENTINA
No asumir una estructura europea. El modelo debe soportar Apertura, Clausura, zonas/grupos, tabla anual/general, promedios, descenso y fases eliminatorias. La estructura debe ser configurable por temporada y no asumir siempre la misma cantidad de zonas/equipos.

HOME
Navegación lateral izquierda.

Próximo partido:

* rival, local/visitante, fecha/hora y torneo
* posición de Newell's y rival
* posible XI
* promedio/calificación cuando exista
* técnico y valoración propia

La posible formación nunca debe inventarse; usar información disponible de alineaciones recientes, titularidades/minutos, posiciones, disponibilidad y probable XI del proveedor.

Tabla:
Tabs Apertura, Clausura, Anual y Promedios.
Seleccionar automáticamente el torneo en juego.
En Apertura/Clausura permitir general y zonas.
A la derecha: últimos 10 de promedios y últimos 5 de anual. Resaltar candidatos al descenso.

PANEL DE EQUIPO
Tres paneles en una fila desktop:

* últimos 3 partidos + drilldown
* próximos 3 + drilldown
* posiciones: equipo superior, Newell's, equipo inferior
  Debajo:
* XI más utilizado
* rating del técnico + drilldown
* estadísticas de jugadores + drilldown

PARTIDO EN VIVO
Cuando Newell's juegue, esta vista es la predeterminada.
Mostrar equipos, escudos, marcador, minuto/estado, titulares, calificaciones y eventos.
Panel "Jugador a putear": ranking propio de peores rendimientos, basado en el algoritmo que se definirá posteriormente.

Estadio:

* nombre, capacidad, ciudad, local/visitante y clima.

Árbitro:

* árbitro
* partidos dirigidos a Newell's
* resultados
* tarjetas
* penales a favor/en contra
* rojas a favor/en contra
  y, cuando haya datos suficientes, el mismo historial con el rival.
  Separar histórico, temporada y partido actual.

Estadísticas del partido:
mostrar las disponibles, por ejemplo posesión, tiros, tiros al arco, corners, faltas, offsides, pases, precisión y tarjetas.
Nunca inventar estadísticas faltantes.

Suplentes:
mostrar banco, sustituciones, minutos y calificación cuando exista.

RATINGS
Guardar datos de rendimiento por partido.
Los promedios, calificaciones y rankings dependerán del algoritmo propio que se diseñará más adelante.
No implementar una fórmula definitiva sin una tarea específica del backlog que la defina y valide.

Crear también un índice propio del técnico usando, cuando estén disponibles, puntos por partido, victorias, diferencia de gol, forma, posición y rendimiento local/visitante. Explicar la metodología en el drilldown.

DISEÑO
Estética deportiva, moderna, oscura y orientada a dashboards. Identidad inspirada en Newell's: rojo, negro, blanco y grises. Alta densidad informativa y jerarquía clara.
Debe sentirse como una herramienta de hincha obsesionado con estadísticas, no como una web institucional.
El humor complementa los datos; no los reemplaza.

RESPONSIVE
Desktop: navegación lateral y dashboards horizontales.
Tablet: grids adaptables.
Mobile: navegación colapsada, tarjetas apiladas y partido en vivo optimizado para lectura rápida.

ESTADOS
Todos los componentes deben contemplar loading, empty, error, stale data, datos parciales y dato no disponible.
Nunca mostrar un dato inexistente como cero.

SEGURIDAD Y OBSERVABILIDAD
API keys solo en backend. Validar inputs. Registrar sincronizaciones, requests, errores, timestamps y consumo. Detectar respuestas incompletas y proteger endpoints internos.

GESTIÓN DEL TRABAJO
BACKLOG.md es la fuente de verdad del estado del proyecto.
Antes de comenzar una tarea:

1. Revisar el backlog y el código relevante.
2. Determinar qué información ya existe.
3. Estimar alcance, dependencias y riesgo.
4. Elegir la solución más simple que cumpla el objetivo.
5. Evitar trabajo innecesario o investigaciones que no afecten decisiones.
6. Implementar solo el bloque necesario.
7. Verificar el resultado.
8. Actualizar BACKLOG.md.

No avanzar automáticamente a una tarea posterior cuando una decisión pendiente pueda afectar su implementación.

DESARROLLO
Trabajar por fases:

1. arquitectura, DB, proveedores, Newell's, fixtures y standings
2. Home, próximo partido, tablas y panel
3. vivo, cache, polling y eventos
4. definición e implementación de calificaciones y "Jugador a putear"
5. árbitro, clima, históricos y técnico
6. responsive, PWA, optimización, observabilidad y tests

Antes de cada fase: inspeccionar lo existente, reutilizar lo implementado y evitar cambios estructurales innecesarios.

TESTS
Cubrir normalización, standings, tabla anual, estados de partido, HT→2T, finalización, cache, errores y rate limits.
Agregar tests específicos para los algoritmos de calificación una vez definidos.

PRIORIDAD
DATOS REALES + DATO NO DISPONIBLE
antes que
DATO INVENTADO + INTERFAZ COMPLETA.
