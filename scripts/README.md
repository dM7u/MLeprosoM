# Sincronización manual BSD

## Tablas de liga: solo lectura

```powershell
node --conditions=react-server --env-file=.env.local scripts/check-standings.mjs --dry-run docs/research/lpf-2026-standings-review.json
```

Lee toda la liga/temporada configurada, sin filtro de Newell's. Máximo diez
páginas de 100 y hasta dos intentos por página (cliente BSD existente). Valida
total estable, IDs únicos, ámbito, enlace siguiente y presupuesto. No sigue
URLs arbitrarias con la clave. No importa Supabase, no escribe archivos ni DB,
no admite apply, no programa polling. El informe JSON se emite por stdout.

Reproducción sin red ni credenciales del corte observado:

```powershell
node --conditions=react-server scripts/check-standings.mjs --dry-run docs/research/lpf-2026-standings-review.json --catalog-file docs/research/bsd-catalog-20260924.json
```

El informe distingue timestamp de cada página, cálculo, revisión y comparación
oficial. En replay requests=0; el catálogo conserva las cinco consultas de su
obtención. La ejecución de este bloque consumió seis GET BSD en total: uno de
inspección y cinco del catálogo. Sin requests a Supabase ni escrituras remotas.

La comparación usa una observación oficial fechada; una consulta futura exige
renovar esa evidencia antes de interpretar discrepancias como errores o sanciones.
Exit 1 ante datos incompletos o diferencias. No existe snapshot transaccional del
proveedor: un cambio durante la paginación que conserve total e IDs puede pasar
inadvertido. La cobertura completa no garantiza frescura ni oficialidad.

Evidencia: `docs/research/standings-dry-run-20260924.json`. Revisión y reemplazo
puntual explicados en `src/server/standings/README.md`. Antes de reutilizar el
calendario en otra temporada hay que revisar configuración y fuentes.

## Almacenamiento manual de lotes de tablas

`store-standings.mjs` toma catálogo local, revisión local, UUID de ejecución,
fecha ISO de cálculo y modo. No consulta BSD ni publica datos. El modo dry-run
no necesita credenciales y no escribe en DB. Ejemplo reproducible histórico:

```powershell
node --conditions=react-server scripts/store-standings.mjs docs/research/bsd-catalog-20260924.json docs/research/lpf-2026-standings-review.json 00000000-0000-4000-8000-000000000001 2026-09-24T12:00:00Z --dry-run
```

Para un lote real usar un UUID nuevo y fecha de cálculo real. Aplicar primero
la migración `20260924000100_standings_batches.sql`; luego el mismo comando con
`--env-file=.env.local` y `--apply` guarda una fila privada. No se ejecutó apply
remoto en este bloque. No usar el UUID de ejemplo para ingestiones reales ni
cargar evidencia histórica como si fuera una consulta actual.

En un reintento conservar UUID, fecha y archivos exactos. Contenido idéntico
devuelve replay=true; cambiarlo reutilizando UUID falla sin sobrescribir. Si
cambia la revisión o la observación, es una nueva ejecución. Un lote incomplete
se guarda solo como auditoría; el comando no habilita ningún lote para la UI.
La escritura rechaza generated_at futuro. Requests guardados provienen del
catálogo, no indican nuevas consultas de este comando. Errores sanitizados.

## Comandos de partidos del equipo

Desde la raíz, con secretos solo en `.env.local`:

```powershell
node --conditions=react-server --env-file=.env.local scripts/sync-bsd.mjs 85 1635 4997 --dry-run
node --conditions=react-server --env-file=.env.local scripts/sync-bsd.mjs 85 1635 4997 --apply
```

Los argumentos son IDs BSD verificados para liga, temporada y equipo, no valores
universales. Dry-run valida tres respuestas antes de escribir. Apply vuelve a
consultar y guarda entidades y fixtures mediante upsert; no borra registros.
El alcance se limita a una página de hasta 100 partidos: si hay más, falla
explícitamente. Como máximo un reintento por consulta ante conexión/timeout o
502/503/504, con espera de al menos 1 segundo. Retry-After de hasta 5 segundos
se respeta; si exige más, se detiene y comunica el plazo. 401/403/429 y JSON
inválido no se reintentan. Hasta seis intentos de red por ejecución completa.
No programa polling ni reinicia automáticamente ejecuciones fallidas.

Las escrituras de distintas tablas no forman una transacción: un fallo puede
dejar entidades parciales. Queda registro failed si se logró crear sync_runs;
una nueva ejecución puede completar por claves únicas. En apply, sync_runs se
crea antes de consultar BSD para registrar también caídas del proveedor y contar
intentos reales. Si Supabase tampoco responde, se informa SYNC_LOG_FAILED sin
exponer cuerpos de error. Un corte del proceso puede dejar running pendiente.
Dry-run nunca escribe. No ejecutar concurrentemente; scheduler y lock pendientes.

Estado 2026-09-18: dry-run y dos apply consecutivos exitosos. Conteos remotos
estables: 32 fixtures, 17 equipos, una competición y una temporada. Lectura
desde Supabase comprobada, incluidos marcadores null. Las pruebas anteriores
de conexión fallaron durante la caída de BSD; el servicio volvió a responder.

Auditoría confirmada por el usuario: `supabase/check-access.sql` permite revisar RLS y permisos
con SQL Editor (solo lectura). Esperar cinco filas, RLS true y privilegios de
anon/authenticated false. No confundir acceso administrativo con acceso público.

## GOAL API: validación de solo lectura

```powershell
node --conditions=react-server --env-file=.env.local scripts/check-goal.mjs --dry-run
```

Único modo admitido; no importa cliente Supabase ni tiene operación apply.
Requiere GOAL_API_KEY privada. Alcance revisado en
`src/server/providers/goal-api/reviewed-scope.json`, vinculado al registro de
identidad. El listado de equipo contiene varias competiciones/temporadas:
se recorre completo y se selecciona Copa Argentina 2026 explícitamente.

Páginas de hasta 50, límite duro de diez requests; sin reintentos ni redirecciones.
Cualquier error, cambio de total, offset incoherente o ID duplicado aborta sin
resultado parcial. Si supera el presupuesto, requiere revisar el alcance;
no reiniciar en bucle. Una lista vacía es un resultado explícito, no un partido.
El control no ofrece aislamiento de snapshot: cambios de contenido sin variar
el total podrían requerir una futura reconciliación. No certifica exactitud del
proveedor ni incorpora datos al producto.

Resultado 2026-09-18: 5 requests/páginas, 226 registros revisados, 225 excluidos,
1 fixture en alcance. Estados crudos y scores FT/prórroga/penales separados;
campos faltantes null, valores inválidos o ausentes inesperados rechazados.
La forma normalizada NO es todavía una fila SQL: round es texto y los scores
adicionales necesitan resolver persistencia antes de implementar apply.

## Importación Copa Argentina: preparada, activación pendiente

Primero aplicar en SQL Editor de Supabase el archivo
`supabase/migrations/20260918000100_cup_score_breakdown.sql` (una sola vez).
Agrega columnas nullable de marcadores y ronda; no borra datos ni abre permisos.
Se probó localmente con PostgreSQL embebido. La clave Data API de la aplicación
no permite ejecutar DDL; no pedir ni pegar contraseñas de base en el chat.

```powershell
node --conditions=react-server --env-file=.env.local scripts/sync-goal.mjs --dry-run
node --conditions=react-server --env-file=.env.local scripts/sync-goal.mjs --apply
```

Dry-run de importación: seis requests, incluida metadata de competición.
Apply comprueba las columnas antes de consultar al proveedor; crea sync_run,
valida catálogo completo y hace upsert por provider/external_id. No borra datos.
Season externa usa el año/etiqueta recibido, dentro de su competición, porque
GOAL API no entregó ID separado de temporada. Idempotencia probada localmente;
repetición remota pendiente. Sin transacción multitabla: un fallo puede dejar
entidades parciales y un nuevo intento debe completarlas. No ejecutar en paralelo.
Si se corta el proceso, puede quedar un sync_run running; no hay scheduler.

Comprobación de esquema remoto y lectura 2026-09-18: columnas nuevas pendientes,
32 fixtures BSD accesibles, GOAL API sin registros. La UI conjunta muestra fuente
por partido y estado por origen; una fuente vacía/fallida no oculta la restante.
No se ejecutó apply antes de aplicar la migración.

## Activación verificada — 2026-09-18

Migración remota aplicada por el usuario y comprobada mediante el preflight y
la carga. Dos apply GOAL exitosos (6 requests cada uno) conservan un solo fixture,
dos equipos, una competición y una temporada. Ambas sincronizaciones succeeded.
Lectura conjunta: 33 partidos (32 BSD + Newell's–Acassuso, Copa Argentina, 0–2).
Penales siguen null. BSD continúa stale; GOAL actualizado al verificar. La
activación reemplaza los pendientes de migración/importación de notas previas.
