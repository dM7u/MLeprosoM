# Sincronización manual BSD

Actualización 24/09/2026: dry-run y apply BSD exitosos, tres requests cada uno,
32 partidos. GOAL: seis requests cada modo, 230 registros revisados y un partido
en alcance. Lectura remota posterior conserva 32 BSD + 1 GOAL; evidencia en
`docs/research/fixtures-refresh-20260924.json`. La observación de fixtures es
12:49/12:50 UTC; su vigencia no se renueva al abrir Home o ficha.

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

## Revisión manual de tablas — 24/09/2026

`review-standings.mjs` recibe un archivo de solicitud, un archivo de política y
`--dry-run` o `--apply`. No consulta proveedores. Dry-run no crea cliente DB ni
requiere credenciales. Apply inserta únicamente una revisión inmutable ligada
al lote existente; no carga ni modifica partidos, lotes o filas de tabla.

Política inicial explícita: `src/server/standings/manual-policy.json`.
Resultados y evidencia oficial: 6 horas; revisión de calendario/zonas: 7 días.
Son umbrales conservadores para operación manual, no un SLA ni polling en vivo.
Un cambio conocido de calendario exige revisión inmediata aunque no venza el
plazo. Al vencer se muestra stale; nunca se rejuvenece una observación guardada.
El futuro consumidor deberá usar esta misma política y el lector mantendrá el
menor TTL entre ella y el registrado al aprobar cada lote.

Preparación de la solicitud JSON (campos exactos):

- `id`: UUID nuevo de revisión, conservado al reintentar.
- `batch`: objeto completo producido por `store-standings.mjs`. Agregar
  `--batch-out .tools/lote.json` al final de su comando **dry-run** para exportar
  explícitamente un archivo local nuevo. No sobrescribe archivos existentes.
- `evidence`: transcripción oficial revisada, con batch_id, payload_hash,
  observed_at y tables; contrato en `src/server/standings/PERSISTENCE.md`.
  Nunca crearla copiando las filas calculadas ni renovando una fecha histórica.
- `reviewedAt`: fecha ISO real con zona de esta revisión; conservar al reintentar.
- `requestActivation`: booleano obligatorio. false registra auditoría sin habilitar;
  true solicita activación, sujeta a cobertura, contraste y frescura.

Ejecutar desde la raíz, una vez preparados los archivos reales:

```powershell
node --conditions=react-server scripts/review-standings.mjs .tools/revision.json src/server/standings/manual-policy.json --dry-run
node --conditions=react-server --env-file=.env.local scripts/review-standings.mjs .tools/revision.json src/server/standings/manual-policy.json --apply
```

Dry-run distingue eligible_for_activation de activated (siempre false sin
escritura). Las diferencias aparecen en el informe y no corrigen puntos.
Exit 1 por diferencias o activación solicitada no elegible; apply puede haber
guardado esa denegación como auditoría. Revisar stored/result antes de reintentar.
Una activación que era válida en reviewedAt pero venció antes de ejecutar se
rechaza sin escritura. No cambiar UUID/fecha para eludir el rechazo.
Los errores no imprimen rutas, credenciales ni respuestas crudas.

Comprobación remota de solo lectura del 24/09/2026: ambas tablas existen,
sus columnas del contrato son accesibles y tienen cero filas. Esto actualiza
la nota previa de migración pendiente; no certifica restricciones ni permisos.
`supabase/check-standings-access.sql` prepara esa auditoría administrativa de
solo lectura. No se ejecutaron escrituras remotas ni se activó evidencia vieja.

## Primer lote de tablas remoto verificado — 24/09/2026

Actualiza el preflight vacío anterior. Catálogo nuevo obtenido con cinco GET BSD
en `docs/research/bsd-catalog-20260924-current.json`; 496 registros, 480 mapeados
y 390 finalizados. La nueva transcripción LPF se conserva en
`docs/research/lpf-tables-20260924-current.txt` (90 filas); evidencia vinculada
en `standings-evidence-20260924-current.json`. No se reutilizó la fecha de una
observación antigua como si fuera una nueva. Calendario conserva su revisión
del 23/09, sin nueva certificación de todos los horarios.

Lote `63d61fa9-dca7-4a00-9b9d-3378b4f72a47`, generated_at
`2026-09-24T12:33:51.528Z`, y revisión
`c80b6761-66cd-4db7-94a6-8c16270218a0` insertados y lectura posterior verificada.
Para reproducir el lote usar el catálogo nuevo, la revisión
`lpf-2026-standings-review.json`, ese UUID y generated_at en store-standings
**dry-run**. No volver a activar automáticamente una revisión que haya vencido.

`standings-activation-20260924.json` registra siete lecturas remotas fresh, todas
del mismo lote, con official_status=unverified. Son cálculos provisionales.
Permisos/RLS y trigger comprobados mediante resultados aportados por el usuario;
definiciones largas de constraints recortadas en capturas, sin certificación
de igualdad textual completa con las migraciones. No hay conexión UI todavía.

## Sincronización de partidos del equipo

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
