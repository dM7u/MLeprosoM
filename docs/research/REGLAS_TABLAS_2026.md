# Tablas LPF 2026: requisitos verificados

Revisión: 2026-09-17. Investigación; no algoritmo implementado.

## Fuentes primarias

- [Reglamento LPF 2026](https://www.ligaprofesional.ar/wp-content/uploads/2026/01/Reglamento-Torneos-LPF-Primera-2026-1.pdf), artículos 9, 10, 15, 16, 24–26.
- [Estatuto AFA, 28/10/2025](https://assets1.afa.com.ar/2025/GAIOLI---septoct/Estatuto----28.10.2025.pdf), artículos 93 y 95. Vigencia inmediata en el texto; no se certifica ausencia de modificaciones posteriores.

## Reglas documentadas

Zonas: puntos 3/1/0; desempate por diferencia de goles, goles a favor,
enfrentamientos entre empatados (puntos, diferencia, goles, con reiteración),
Fair Play y sorteo. Anual: fases de zonas de ambos torneos; diferencia de
goles, goles a favor, Fair Play y sorteo. Empates que definen descenso
requieren el procedimiento de partidos de desempate.

Fair Play incluye jugadores y cuerpo técnico. No reconstruirlo exclusivamente
con tarjetas de jugadores. Las eliminatorias no integran la suma anual.

Estatuto: promedio = puntos/partidos de las últimas tres temporadas. Primero
desciende el último promedio; luego el menor puntaje anual excluyendo al ya
descendido. Para 2026 la ventana temporal es 2024–2026. Casos de ascendidos,
partidos computables y eventuales modificaciones deben validarse antes de calcular.

## Disponibilidad y límites de implementación

La comparación adicional de standings BSD contra los resultados guardados
no se completó: dos intentos de consulta sin respuesta útil (el primero agotó
el tiempo de conexión). No se generó informe ni se afirma igualdad de los
30 equipos. Reintentar una vez que el servicio vuelva a responder.

- El mapeo oficial/BSD cubre los 480 fixtures de zonas; permite seleccionar
  encuentros por torneo sin usar su fecha de disputa.
- Eso no certifica marcadores, sanciones ni posiciones oficiales. Una suma
  aritmética debe rotularse como cálculo propio provisional, nunca como tabla oficial.
- Quitas/restituciones de puntos necesitan fuente, ámbito, fecha y vigencia;
  la falta de información no se puede interpretar como cero sanciones.
- Guardar clasificación no resuelta si faltan datos del criterio decisivo;
  no desempatar por nombre o ID para inventar posición deportiva.
- Promedios pendientes de validar los denominadores e históricos completos.
- No bloquear la futura persistencia de fixtures por datos faltantes de tablas:
  son capacidades diferentes. La primera migración puede limitarse a entidades
  y partidos verificados, manteniendo tablas/ajustes para una tarea separada.
