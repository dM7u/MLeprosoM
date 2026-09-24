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

## Adaptador BSD y dry-run — 2026-09-24

`bsd-adapter.mjs` adapta el catálogo completo leído por `providers/bsd/catalog.mjs`.
La revisión explícita en `docs/research/lpf-2026-standings-review.json` referencia
el mapeo de 480 partidos existente, configura membresías y controles de cantidad
por torneo/equipo/jornada. Las cifras pertenecen a esa temporada, no al motor.
Se contrastaron otra vez los 480 cruces/localías/jornadas contra la agenda LPF
y las 60 membresías contra sus tablas renderizadas. No se certifican todos los
horarios futuros ni ausencia de cambios posteriores.

BSD utiliza `group-stage` para encuentros de la misma zona y `league-phase`
para los 60 interzonales; ambos se validan contra la revisión. Los grupos de
equipos provienen de la revisión oficial, no del group_name de cada partido.
Solo `finished` y `notstarted` se traducen a estados computables. Un estado
desconocido/aplazado en un partido esperado impide completar el ámbito afectado.
Un registro adicional no revisado o cambio de fase/reemplazo bloquea todas las
tablas del dry-run, incluso si el motor habría excluido ese ID desconocido.

Sarmiento–River (Clausura, fecha 11) tiene una sustitución revisada manualmente:
223766 → 604493. La LPF publica el nuevo horario, 07/10 22:30 UTC. BSD no declara
el vínculo en replaced_by. Se conserva el registro viejo como evidencia, sin
contarlo; si cambia de estado, equipos, jornada, fase o aparecen goles, se bloquea.
No se deduplican automáticamente partidos por nombre, fecha o parecido.

Resultado observado: 496 registros, 480 partidos computables en calendario,
390 finalizados; excluidos 15 eliminatorias y el registro sustituido. Las 90
filas oficiales observadas coinciden en ocho campos y orden. La evidencia del
18/09 permanece histórica e intacta. El nuevo corte también envejece: no acredita
vigencia indefinida ni ausencia de sanciones. Ver comando en `scripts/README.md`.

Siguiente bloque: definir persistencia/publicación y política de frescura de
snapshots; ajustes disciplinarios, criterios inferiores y promedios pendientes.

## Política de lectura — 2026-09-24

Contrato de persistencia y activación definido en `PERSISTENCE.md`; todavía no
hay tabla SQL, escritura ni publicación UI. `snapshot-view.mjs` implementa la
selección en memoria por ámbito, conserva el último resultado ante fallos y
evalúa por separado frescura de resultados y revisión con TTL explícitos.
Toda salida utilizable es provisional, con ajustes sin verificar. Una nueva
fecha de cálculo no rejuvenece la observación. La evidencia de contraste oficial
no se hereda automáticamente a nuevos lotes.

Próximo paso: almacenamiento atómico e idempotente de un lote, validación del
payload, evidencia ligada al lote y pruebas locales antes de activación remota.

## Contraste y activación por lote — 2026-09-24

`official-review.mjs` exige evidencia fechada vinculada al ID/hash del lote,
anual y zonas completas. Calcula diferencias sin alterar puntos ni posiciones
oficiales. `db/store-official-review.mjs` guarda comparación y decisión de
activación atómicamente, con idempotencia y comprobación de vigencia al escribir.
Migración local preparada y prueba PostgreSQL aprobada. El lector DB
`db/read-standings.mjs` aplica la revisión más reciente y frescura al consultar;
UI/remoto pendientes. Valida hashes y contenido, bloquea decisiones ambiguas y
conserva un lote anterior habilitado como desactualizado cuando corresponde.
Contrato detallado y límites en `PERSISTENCE.md`.
