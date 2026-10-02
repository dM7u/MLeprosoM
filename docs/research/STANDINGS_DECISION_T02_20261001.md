# T02 — Prioridad de la lectura de standings

Propuesta del 01/10/2026, **aprobada por el Product Owner el 02/10/2026**:
posponer T03 y priorizar el panel (T04) después de los pendientes de demo T06.
T02 cerrada con esa decisión; el alcance concreto del panel queda por definir.
No se aprueba un contrato nuevo de lectura ni se habilita implementación de T03.

## Evidencia y estado de partida

- Git: HEAD `a1d2800`, con cambios locales de T01 y trabajo posterior de demo.
  Se preservan. El cierre T01 en BACKLOG registra 202 pruebas, lint, typecheck y
  build aprobados el 01/10; el build necesitó reintento autorizado por `spawn
  EPERM`. Es evidencia previa, no una ejecución nueva ni un corte publicado.
- [Costo remoto del 26/09](HISTORY_COST_20260926.md): una fila por historial en
  el ámbito medido; standings anual costó cuatro GET, 221096 bytes JSON y
  1822 ms en una ejecución. No es conteo remoto actual, percentil ni latencia
  de Home. No corresponde concluir que la lectura es rápida o despreciable.
- La duplicación anual/torneo descrita en ese informe ya fue corregida:
  [Home](../../src/app/page.tsx) llama una vez a
  [dashboardStandingsSet](../../src/server/db/dashboard-standings.ts), que usa
  [readStandingsSet](../../src/server/db/read-standings.mjs). Las siete vistas
  del catálogo ensayado comparten lote, revisión y reloj dentro de la petición.
  No se fija esa cantidad como regla deportiva. Home es dinámica y las visitas
  y cambios de tab siguen generando lecturas; no hay cache entre peticiones.
- [Escala local del 29/09](STANDINGS_VOLUME_20260929.md): un lote/una revisión
  necesita cuatro consultas y 197242 bytes; 5000 revisiones requieren 102
  consultas y 108582858 bytes; 100 lotes con 99 denegados, 103 consultas y
  18650800 bytes. 1000 lotes con solo el primero revisado requieren 22 consultas
  y 426040 bytes. La distribución de revisiones/denegaciones importa más que
  un número aislado de lotes. Son muestras sintéticas locales, sin red ni SLO.
- BACKLOG conserva ingesta manual, sin scheduler deportivo ni tráfico público
  verificado. No conocemos el volumen remoto de hoy, visitas previstas ni una
  frecuencia nueva de ingesta aprobada. No inferirlos del benchmark.

Los apartados fechados iniciales de PERSISTENCE y documentos generales describen
etapas sin lector/UI; los apartados posteriores, BACKLOG y código acreditan la
integración actual. No interpretar esos pendientes históricos como tareas nuevas
ni repetir SQL. T02 se analiza ahora por pedido explícito del PO, sin dar T06 por
terminada ni alterar automáticamente su prioridad.

## Costo, beneficio y alternativas

| Alternativa | Beneficio esperado | Costo y límite | Recomendación |
| --- | --- | --- | --- |
| Conservar lector e ingesta manual | Permite dedicar el siguiente bloque al producto con datos disponibles | Mantiene costo creciente y consistencia optimista; no certifica capacidad pública | Elegir ahora, sujeto al PO |
| Consultar solo revisiones relevantes mediante lectura coherente/RPC | Menos evidencia histórica transferida; posible reducción de viajes de red | Definir corte de ambos historiales, empates, validación y revisiones retroactivas; recálculo de lotes denegados puede seguir costando | Primera alternativa a estudiar al reabrir |
| Proyección persistida por ámbito | Puede evitar recorrer y recalcular historia en cada visita | Dos escritores, invalidación, permisos, reconstrucción, equivalencia, concurrencia y rollback; mayor alcance operativo | No justificarla solo por el peor caso sintético |

Estimación de alcance relativa: conservar el lector no añade desarrollo de
infraestructura; una RPC requiere contrato, implementación y pruebas de lectura
coherente; una proyección agrega además transición de escritura y operación.
No hay base para prometer horas ni un ahorro remoto concreto. Filtrar primero
`activated=true`, limitar a los últimos N registros, quitar la reconsulta o
guardar una aprobación en cache global no son atajos aceptables.

La optimización no incorpora estadísticas, XI ni datos más frescos. T04 puede
aportar funcionalidad visible sobre Home/ficha, mientras T03 atiende un costo de
crecimiento todavía no observado en uso actual. T04 tampoco tiene cobertura
completa demostrada: empezar por delimitar un bloque útil con datos verificables;
XI más utilizado, estadísticas individuales y técnico requieren revisar cobertura.
No implementar ratings ni completar faltantes con ceros.

## Garantías que se conservan y condiciones de una futura solución

El contrato operativo sigue siendo [PERSISTENCE](../../src/server/standings/PERSISTENCE.md)
y [HISTORY_READS](../../src/server/db/HISTORY_READS.md). Lo siguiente es una lista
de restricciones para reabrir diseño, no un contrato aprobado para T03:

1. Ámbito aislado por proveedor/competición/temporada; selecciones del mismo lote
   validado. Orden por `data_as_of`, luego `generated_at`, nunca por UUID.
2. La última revisión manda aunque deniegue. Una denegación de B2 permite usar
   B1 habilitado con estado stale; no recuperar una aprobación antigua de B2.
3. Revisiones retroactivas cuentan como cambios del historial aunque no sean la
   revisión máxima. El lector actual compara todo el historial del candidato
   antes de devolverlo. Una solución nueva debe definir un punto de corte común
   para ambos historiales y qué ocurre con inserciones antes/después de él.
4. Revisiones máximas con hash/estado/activación contradictorios y lotes distintos
   empatados en el orden relevante fallan cerrados. No resolver ambigüedad con
   orden de transporte ni introducir desempates deportivos.
5. Lotes posteriores incompletos, sin revisión o denegados permiten fallback a
   un lote anterior válido con indicación de antigüedad: conservar
   `results_as_of`, `review_as_of`, `evidence_as_of`, IDs y motivos. Recalcular
   TTL al leer usando el menor valor actual/guardado; no almacenar fresh fijo.
6. Sin candidato: `Sin datos`. Fallo de DB, corrupción relevante o ambigüedad:
   error sanitizado sin filas; no fallback en memoria que oculte revocaciones.
   Conservar validación profunda de candidatos visitados y últimas revisiones;
   el lector no garantiza validar todos los payloads históricos descartados.
7. Mantener procedencia de cálculo propio, ajustes sin verificar, posiciones
   oficiales nulas y empates deportivos pendientes. No mezclar snapshots.

La reconsulta actual solo protege al candidato hasta esa comprobación. No ofrece
snapshot global de lotes/revisiones ni garantía frente a una escritura posterior.
Posponer acepta esta limitación durante la operación manual; no la certifica como
adecuada para escritores frecuentes o concurrentes. Si se exige aislamiento para
publicar, esa necesidad obliga a reabrir T02 antes del corte.

## Cuándo reabrir y qué falta para habilitar T03

Reabrir si se propone ingesta frecuente/concurrente, si se exige aislamiento en
la demo/publicación, o si una medición representativa muestra que standings
impide alcanzar el objetivo de respuesta de Home o un presupuesto de consumo.
No usar 5000 registros como umbral automático.

En ese momento recoger solo evidencia que discrimine alternativas: conteos por
ámbito y distribución de revisiones/denegaciones, frecuencia prevista de escritura
y visitas, y costo de standings dentro de Home con el lector compartido. Acordar
el objetivo de respuesta/consumo antes de declarar éxito. No hace falta ampliar
benchmarks sintéticos ahora: demostrar otra vez crecimiento no aclara la demanda.

T03 requiere **decisión explícita del PO de priorizarla y cierre técnico de T02**:
alternativa elegida, corte de lectura, validación e invalidación de ambos escritores,
permisos y operación según la alternativa. Corregir esa decisión en BACKLOG antes
de implementar. Criterios que el contrato deberá concretar:

- Equivalencia de filas, IDs, fechas, frescura y errores con el lector actual en
  historiales estables, incluidos denegaciones, retroactivos, empates y fallback.
- Pruebas de intercalaciones de ambos escritores coherentes con el corte elegido;
  no atribuir concurrencia nativa a probes serializados.
- Beneficio medido con carga representativa y objetivo acordado, sin degradar
  validación; aislamiento de ámbito y acceso exclusivo backend comprobados.
- Si hay estado persistido: reconstrucción, idempotencia, corte coordinado,
  equivalencia y rollback que no reabra escrituras inseguras. Revisión crítica
  Astra antes de proponer cualquier activación remota.

## Cierre y decisión aprobada — 02/10/2026

**Decisión aprobada por el PO:** posponer T03, conservar operación manual y priorizar un
bloque T04 con cobertura real después de T06. T03 queda **no habilitada**.
El PO continúa T06 en su otro chat; T04 se retomará después con Sol ligero.
Esta decisión no autoriza publicar ni inicia T04 automáticamente.
Si el PO vuelve a priorizar T03, retomar primero el contrato con Astra medio; una vez
cerrado, implementación con Sol ligero y revisión crítica Astra.

Validación de este bloque: contraste documental con lector, integración Home y
casos de `tests/read-standings.test.mjs`; revisión de diff/enlaces. No se ejecutan
tests/build porque solo cambia documentación, ni benchmarks, SQL o consultas
remotas. Sin cambios de runtime, commit, push ni acceso a configuración privada.
