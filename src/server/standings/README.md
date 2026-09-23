# Motor de tablas: contrato mínimo

Implementado el 2026-09-24 en `src/server/standings/calculate.mjs`.
Es un servicio puro de servidor: no consulta proveedores, no guarda en DB y no
publica posiciones en la UI. No agrega dependencias.

## Entrada

`calculateStandings` recibe:

- `scope`: provider, competition_id, season_id, source y reviewed_at (ISO con zona).
  Los IDs son cadenas opacas. La fuente identifica la revisión del calendario.
- `schedule`: calendario completo revisado de fases de zonas, con id, tournament,
  round, home_id y away_id. Excluir eliminatorias al preparar este calendario.
- `teams`: id y groups, un mapa de nombre de torneo a zona. No presupone dos zonas,
  treinta clubes ni un número fijo de jornadas. Incluir también rivales interzona.
- `fixtures`: id, provider, competition_id, season_id, home_id, away_id, round,
  state, home_score, away_score y fetched_at. El adaptador debe convertir estados
  comprobados a finished o not_started; cualquier otro estado bloquea el snapshot.
  No pasar estados crudos del proveedor como si estuvieran normalizados.
- `selection`: kind annual (todos los torneos del calendario) o tournament con
  tournament y, opcionalmente, group. El ámbito anual no acepta filtro de zona.
- `generatedAt`: fecha explícita ISO con zona; permite reproducir una observación.

La integridad del calendario revisado es responsabilidad del adaptador: el motor
puede detectar fixtures faltantes respecto del calendario, pero no una omisión
compartida por ambas entradas. Los 32 partidos de Newell's guardados actualmente
no alcanzan para calcular la liga. No usar el lector limitado a ese equipo.

## Salida y límites

Acumula PJ/G/E/P/GF/GC/DG y puntos deportivos 3/1/0 solamente para finalizados
con ambos marcadores enteros no negativos. Un cero es válido; null no es cero.
Incluye partidos interzona. Excluye y cuenta registros de otro ámbito o IDs no
incluidos. Rechaza duplicados relevantes y configuraciones ambiguas.

Un partido esperado faltante, discrepante o con estado/resultado/fecha inciertos
produce state incomplete, issues y rows vacías. No publica acumulados parciales
como tabla. Sin finalizados produce not_started y rows vacías. complete significa
cobertura de resultados suficiente respecto del calendario, no datos actuales,
ni posiciones oficiales, ni torneo terminado. data_as_of conserva la observación
más antigua; el consumidor debe aplicar la política de frescura existente.

Cada fila indica official_position null; origin es own_calculation y
adjustments_status siempre unverified. No se presume ausencia de sanciones.
calculated_position solo ordena puntos, DG y GF, sin ajustes. Empates residuales
mantienen posición null y position_range; el orden de presentación de esas filas
no es un desempate. No resolver H2H, Fair Play, sorteo ni playoffs con nombre/ID.

## Verificación y siguiente integración

Pruebas sintéticas aisladas cubren alcance, anual, interzonas, duplicados, nulos,
marcadores válidos, estados pendientes, configuración, fechas y empates. El orden
básico también se contrasta con las 60 filas reales guardadas del 18/09/2026;
esto no las convierte en posiciones actuales ni valida desempates inferiores.

Siguiente bloque: adaptar un catálogo completo actualizado a este contrato,
revisar calendario y membresías, ejecutar un dry-run y contrastarlo con la fuente
oficial antes de diseñar persistencia/publicación de snapshots. Permanecen
pendientes ajustes disciplinarios, criterios inferiores y promedios.
