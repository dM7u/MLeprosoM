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

## Contraste resuelto parcialmente — 2026-09-18

El bloqueo de conectividad de la revisión anterior quedó resuelto. Informe:
`bsd-standings-consistency-20260918.json`. Cinco páginas BSD: 495 IDs únicos;
480 partidos mapeados de zonas y 15 eliminatorias excluidas. Terminados:
240 Apertura y 135 Clausura. La suma 3/1/0 coincide en los 30 equipos con
played/won/drawn/lost/gf/ga/gd/pts del standings BSD. No es una tabla Clausura.

La página oficial [Clausura LPF](https://www.ligaprofesional.ar/torneo-clausura-mercado-libre-2026)
cargó sus widgets tras esperar. Se transcribieron orden, puntos y PJ de la Tabla
General: 30/30 coinciden en puntos y 25 PJ con el acumulado BSD. Orden guardado
como observación oficial, no como resultado de un algoritmo propio de desempate.
Newell's figura 22 en anual (28 puntos), 9 en Grupo A Clausura (13 puntos/9 PJ)
y 25 en promedios (110 puntos/98 PJ, valor publicado 1,122). No confundir esos
puestos con el 12 que BSD devuelve en su grupo acumulado anual.

Esto habilita diseñar snapshots separados por torneo/ámbito con procedencia y
fecha. Antes de publicar tablas automáticamente, implementar cálculo/validación
de zonas y anual, detectar diferencias con puntos oficiales como ajuste pendiente,
y conservar empates no resueltos. No inferir ausencia de sanciones de una suma
coincidente. Promedios: la fila Newell's fue observada, faltan históricos y reglas
de todos los ascendidos para automatizar. No se creó scraper ni API oficial.

## Zonas completas contrastadas — 2026-09-18

Evidencia en `lpf-zones-validation-20260918.json`: filas renderizadas LPF de
Apertura y Clausura, dos zonas de 15 equipos por torneo. Alias revisados para
vincular cada club con BSD. Cinco consultas paginadas, catálogo completo de
495 partidos, cotejo por IDs/equipos/localía/jornada del mapeo de 480.

Las 60 filas coinciden en ocho campos (PTS, PJ, G, E, P, GF, GC, DG).
Apertura: 16 PJ por club; Clausura: 9 PJ en este corte. En las cuatro zonas,
orden descendente por puntos, DG y GF reproduce todas las posiciones publicadas.
No quedan empatados tras esos tres criterios en esta muestra. Esto NO prueba
el algoritmo de enfrentamientos directos, Fair Play ni sorteo; esas ramas
necesitan pruebas y datos específicos y deberán dejar posiciones sin resolver.

Newell's: Apertura Grupo A puesto 14, 15 puntos; Clausura Grupo A puesto 9,
13 puntos. Es un snapshot observado; no una posición vigente indefinidamente.
No se detectó diferencia aritmética de puntos respecto de la tabla publicada;
no se certifica inexistencia de sanciones pendientes o posteriores.

La investigación ya permite iniciar el bloque de cálculo/snapshots separados
por torneo y anual con procedencia y frescura. No seguir bloqueándolo por el
contraste de zonas ahora completado. Alcance inicial: criterios PTS/DG/GF,
empates adicionales sin posición definitiva, ajustes explícitamente pendientes
si no existe evidencia actual. Promedios queda como bloque independiente.
