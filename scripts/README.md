# Sincronización manual BSD

## Estadísticas de equipo: inspección sin escrituras

```powershell
node --conditions=react-server --env-file=.env.local scripts/check-team-statistics.mjs 223728 --dry-run
node --conditions=react-server scripts/check-team-statistics.mjs 223728 --dry-run --sample-file docs/research/bsd-team-stats-223728-20260924.json
```

Solo dry-run, sin Supabase ni escritura de archivos. Una consulta stats y como
máximo un reintento con el cliente BSD existente; replay hace cero requests y
conserva la fecha de la muestra. Una muestra inválida nunca dispara una consulta
de reemplazo. El ID del ejemplo es histórico, no un partido actual implícito.
Devuelve complete/partial/empty; null nunca se transforma en cero. No persiste
ni conecta UI. Contrato y cobertura en `docs/research/DETALLE_PARTIDOS_20260924.md`.

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
de igualdad textual completa con las migraciones. La conexión con Home está implementada; esta verificación administrativa es histórica.

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

## Importación Copa Argentina: preparación histórica (activada el 18/09)

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

## Replay de eventos — 2026-09-25

Carga desde muestra con fixture/equipos verificados en DB:

```powershell
node --conditions=react-server --env-file=.env.local scripts/import-incidents.mjs docs/research/bsd-incidents-223728-20260925.json bbefc85a-448c-4fc1-b7f0-33a74ba50b79 --dry-run
```

Tras aplicar `supabase/migrations/20260925000300_incident_observations.sql` y
verificar que la API reconoce la tabla, cambiar a --apply. Mantener UUID y archivo
para retries. No consulta BSD ni modifica fechas. Failed explícito admite archivo
con `failed: true`, `event_id` y `fetched_at`, sin body ni mensajes crudos.
El preflight inicial devolvió PGRST205, resuelto tras la migración. Apply y
lectura remota verificados el 25/09: 22 eventos; UUID del ejemplo conservado.

```powershell
node --conditions=react-server scripts/check-incidents.mjs docs/research/bsd-incidents-223728-20260925.json 223728 --dry-run
```

Sin red, credenciales ni escrituras. Mantiene orden de fuente y nulls, no inventa
IDs estables ni acredita cobertura completa. Persistencia/UI implementadas. Contrato
en `docs/research/EVENTOS_20260925.md`.

## Replay de alineaciones — 2026-09-25

Importación con lookup de partido/equipos en Supabase (sin llamadas BSD):

```powershell
node --conditions=react-server --env-file=.env.local scripts/import-lineups.mjs docs/research/bsd-lineups-223728-20260925.json 6b1cf1e5-50a6-489d-98b3-7300c6dcb7f5 --dry-run
```

Después de verificar disponibilidad de `lineup_observations`, cambiar a --apply.
Conservar archivo y UUID para retry. La migración correspondiente es
`supabase/migrations/20260925000200_lineup_observations.sql`, posterior a la de
estadísticas. Si ya se ejecutó, comprobar en SQL Editor del mismo proyecto
`select to_regclass('public.lineup_observations');`. Si existe pero la API no la
encuentra, puede recargarse su esquema con `NOTIFY pgrst, 'reload schema';`.
No volver a ejecutar CREATE TABLE sobre una tabla existente.

```powershell
node --conditions=react-server scripts/check-lineups.mjs docs/research/bsd-lineups-223728-20260925.json 223728 796 4997 --dry-run
```

Archivo, ID de evento, ID local e ID visitante esperados. Sin red ni credenciales
ni escrituras. Confirmación del proveedor, no auditoría oficial. Predicted/beta
queda unavailable. Persistencia/UI verificadas con la muestra y UUID anteriores. Ver `docs/research/ALINEACIONES_20260925.md`.

## Importación manual de estadísticas — 2026-09-25

Reutiliza muestras guardadas, sin consultar BSD. Requiere configuración privada
Supabase para verificar fixture, equipo, competición y temporada incluso en
dry-run. La fecha de observación se conserva; no pasa a ser la fecha de importación.

```powershell
node --conditions=react-server --env-file=.env.local scripts/import-team-statistics.mjs docs/research/bsd-team-stats-223728-20260924.json 64a6d4f6-8b4f-40b5-88d4-dc8cde1f1327 --dry-run
```

Después de aplicar `supabase/migrations/20260925000100_team_statistics.sql`
en el SQL Editor administrativo y verificar permisos, ejecutar el mismo comando
con `--apply`. Para retry conservar archivo y UUID. Una muestra nueva requiere
UUID nuevo; no modificar fechas para evitar conflictos. El archivo SQL ya fue
probado localmente. La clave Data API no permite ejecutar esta migración.

Dry-run, apply y lectura remota verificados el 25/09; PGRST205 inicial resuelto. Contrato y formato de observaciones fallidas en
`src/server/db/TEAM_STATISTICS.md`. Fallos de DB/muestras inválidas terminan con
código sanitizado y salida no exitosa. La ficha lee observaciones persistidas; no se programa cron.

## Activación verificada — 2026-09-18

Migración remota aplicada por el usuario y comprobada mediante el preflight y
la carga. Dos apply GOAL exitosos (6 requests cada uno) conservan un solo fixture,
dos equipos, una competición y una temporada. Ambas sincronizaciones succeeded.
Lectura conjunta: 33 partidos (32 BSD + Newell's–Acassuso, Copa Argentina, 0–2).
Penales siguen null. BSD continúa stale; GOAL actualizado al verificar. La
activación reemplaza los pendientes de migración/importación de notas previas.

## Importador editorial de XI — 27/09/2026

```powershell
node --conditions=react-server --env-file=.env.local scripts/import-editorial-xi.mjs docs/research/la-capital-xi-223728-20260926.json docs/research/editorial-operation-223728-20260927.json --dry-run
```

El segundo JSON define id (UUID), previousId (null para raíz), action
(review/retract), reason (null o texto; obligatorio al retractar), reviewedAt
(con zona explícita) y reviewer. Reintentos conservan ambos archivos y UUID;
correcciones usan UUID nuevo y previousId de la cabeza actual. No renovar fechas
para simular frescura. Retractar exige conservar exactamente la evidencia previa.

Solo consulta Supabase; no consulta proveedores. El catálogo persistido puede
estar antiguo: revisar fixture_observed_at. Dry-run no escribe. Código 0 indica
validación completa, 2 almacenamiento editorial no disponible (cadena sin
validar), 1 error sanitizado. published siempre es false, incluso con apply.

Tras habilitar y verificar la migración editorial se puede usar --apply para
insertar una revisión o reconocer un retry. No se ejecutó apply remotamente
este bloque. Contrato: src/server/editorial/PERSISTENCE.md.

Ensayo remoto del 27/09: partido 223728 resuelto; fixture observado el 24/09,
finalizado. unavailable por fixture_not_upcoming, publication_time_unknown y
editorial_storage_unavailable. Cero escrituras y requests a proveedores.

## Importador de estadísticas: modo atómico explícito — 27/09/2026

El cuarto argumento opcional selecciona almacenamiento. Omitirlo equivale a
`--storage=history`, compatible con la base actual. `--storage=projection`
requiere las RPC de la propuesta SQL; no hay detección automática ni fallback.
Flags desconocidos/repetidos se rechazan antes de abrir evidencia/configuración.

Ejemplo de ensayo después de preparar un entorno con la propuesta aplicada:

```powershell
node --conditions=react-server --env-file=.env.local scripts/import-team-statistics.mjs docs/research/bsd-team-stats-223728-20260924.json 64a6d4f6-8b4f-40b5-88d4-dc8cde1f1327 --dry-run --storage=projection
```

La propuesta sigue SIN aplicar en Supabase. Este comando no se ejecutó remotamente.
En projection, dry-run valida RPC/estado, UUID y contexto, calcula append o replay
y devuelve plan con generación/count/chosen_id/last_id, sin invocar commit.
No certifica permiso de escritura ni reserva la generación; apply vuelve a leer
 y calcular, conservando UUID/fecha. Un UUID ya guardado devuelve replay y aclara
si la proyección está inicializada; un retry no reconstruye una proyección ausente.
Falta de RPC, estado inválido o error falla con código sanitizado incluso en retry.

`--apply --storage=projection` usa exclusivamente commit CAS. El reporte incluye
storage y writes (0/1). Durante corte, revocar INSERT directo garantiza que un
comando antiguo history no agregue observaciones sin actualizar proyección.
El lector de UI sigue paginado; selección de lectura y reconstrucción operacional
quedan pendientes antes de activación. No ejecutar la propuesta solo para ensayar
este comando: revisar supabase/pending/README.md y completar ensayo multi-conexión.

## Reconstrucción de estadísticas y elección de lector — 27/09/2026

Comando de un único evento BSD, acotado al equipo/temporada/competición revisados:

```powershell
node --conditions=react-server --env-file=.env.local scripts/rebuild-statistics-projection.mjs 223728 --dry-run
```

Requiere las RPC de la propuesta, que sigue SIN aplicar remotamente. No se ejecutó
este comando contra Supabase. En un entorno preparado, --apply reconstruye solo
la proyección: no crea observaciones ni rejuvenece sus fechas. Repetir un resultado
idéntico no cambia generación. Lookup compartido con importador; no acepta UUID
arbitrario ni selección suministrada por el operador. Argumentos inválidos fallan
antes de leer configuración privada.

Tras apply, compara proyección con historial completo y vuelve a leer generación;
si cambió, repite hasta tres veces. Exige equivalencia de datos, estado y fechas,
normalizando solamente representación de instantes con distinto offset. No hay
transacción global durante el contraste; la generación estable depende de que
todos los escritores usen CAS y no haya intervención administrativa directa.

Salida distingue observation_writes (siempre 0), projection_writes y verification.
Si el commit ocurrió pero la comprobación posterior falla, se informa por separado
con código de salida 2; no afirmar rollback ni activar lectura. Fallos previos
terminan con código 1 sanitizado. Reintentar reconstrucción es seguro; un timeout
no prueba que el commit haya fallado. Exit 0 de dry-run no reserva la generación
ni certifica permisos de escritura.

`STATISTICS_READ_MODE` controla solo el lector backend de la ficha. Ausente o
history conserva lectura paginada. projection hace una RPC y valida su estado;
RPC ausente, proyección incompleta o valor de configuración inválido da error,
sin fallback automático. No se consulta proveedor ni se reconstruye durante visitas.
El importador mantiene su flag de almacenamiento independiente y explícito.

Antes de cambiar a projection, reconstruir/verificar TODOS los fixtures BSD
servidos, incluidos los vacíos, después del corte de escritores y auditoría ACL.
No hay selección automática por existencia de tabla ni rollout por fixture.
Volver a history revierte solo lectura: mantener escritores CAS y permisos cerrados.
Actualización 28/09/2026: SQL aplicado, auditoría 76/76 y reconstrucción 32/32
verificadas. .env.local usa projection. Las notas anteriores de propuesta sin
aplicar quedan reemplazadas para este proyecto: NO repetir SQL. Para importar
estadísticas usar siempre --storage=projection. Todo fixture nuevo necesita
reconstrucción explícita antes de servirse con ese lector, incluso sin datos.
Otros entornos mantienen su configuración hasta realizar su propia verificación.

## Alineaciones: importación atómica y reconstrucción local — 28/09/2026

El importador admite un cuarto argumento opcional `--storage=history|projection`.
Default history conserva el comportamiento vigente. Projection requiere las RPC
de alineaciones; su ausencia/error no deriva a INSERT directo. Flags inválidos o
repetidos se rechazan antes de abrir muestras/configuración. Dry-run valida
identidad y calcula selección/generación; no reserva un estado para el apply.

Después del futuro corte y auditoría, la reconstrucción por evento se ejecutará con:

```powershell
node --conditions=react-server --env-file=.env.local scripts/rebuild-lineup-projection.mjs 223728 --dry-run
node --conditions=react-server --env-file=.env.local scripts/rebuild-lineup-projection.mjs 223728 --apply
```

Estos comandos no se ejecutaron remotamente: SQL de alineaciones sigue pendiente.
Apply no inserta observaciones; publica selección mediante CAS y compara con el
historial completo bajo generación estable. Exit 2 indica verificación posterior
fallida, aun cuando la proyección se haya confirmado; no implica rollback. Exit 1
indica fallo previo/no completado. Retry de reconstrucción idéntica no modifica estado.

Importador/reconstructor comparten el lookup existente de equipo, competición y
temporada, conservando IDs externos de ambos lados. Si el snapshot está incompleto
o excede el límite de 100 fixtures visibles, fallan cerrados: no reconstruyen un
evento a partir de un inventario parcial. No consultan proveedores.

La ficha admite LINEUPS_READ_MODE=projection explícito, ausente/history por defecto.
RPC faltante o bootstrap ausente produce error, sin fallback ni reconstrucción por
visita. El posible XI de Home mantiene su lectura actual independiente. Antes de
activar el modo de ficha hay que completar concurrencia específica, auditoría,
corte de escritores y reconstrucción de todos los fixtures servidos. No cambiar
.env.local todavía. La propuesta no se aplica como parte de estos comandos.

Actualización 28/09/2026: corte SQL y auditoría completados por el propietario;
reconstrucción y equivalencia remotas aprobadas para 32 fixtures. LINEUPS_READ_MODE
es projection en configuración local y la ficha fue comprobada por HTTP. Esto
reemplaza las indicaciones de espera anteriores; no repetir la migración SQL.
Importaciones futuras de alineaciones deben indicar --storage=projection. Nuevos
fixtures requieren bootstrap explícito con rebuild-lineup-projection.mjs antes de
servirlos por proyección. Home mantiene su lector anterior; no se desplegó a otros
entornos. Evidencia: docs/research/lineup-activation-20260928.json.

## Eventos: operación de proyección preparada localmente — 28/09/2026

Estado vigente: el corte y la activación local se completaron el 28/09; consultar
"Eventos activados localmente sobre Supabase" más abajo antes de ejecutar pasos.
Las instrucciones previas al corte en esta sección quedan como registro histórico.

import-incidents.mjs admite un cuarto argumento opcional --storage=history o
--storage=projection. Default history conserva la operación vigente. En projection,
dry-run valida y calcula selección/generación sin escribir; apply recalcula y usa
CAS. RPC ausente o inválida falla sin volver a INSERT directo. Flags desconocidos
o repetidos se rechazan antes de leer muestra/configuración.

El reconstructor por evento está preparado para el futuro corte, todavía pendiente:

```powershell
node --conditions=react-server --env-file=.env.local scripts/rebuild-incident-projection.mjs 223728 --dry-run
node --conditions=react-server --env-file=.env.local scripts/rebuild-incident-projection.mjs 223728 --apply
```

No ejecutar en Supabase todavía: falta concurrencia específica, preflight y auditoría
antes de aplicar la propuesta SQL. Estos comandos no aplican migraciones ni llaman
al proveedor. Apply no crea observaciones: reconstruye selección y verifica contra
historial completo bajo generación estable. Exit 2 significa commit realizado con
verificación posterior fallida; no implica rollback. Retry idéntico no escribe.

Importación y reconstrucción comparten búsqueda por equipo/competición/temporada;
inventario parcial o superior a 100 fixtures falla cerrado. Eventos y alineaciones
reutilizan detail-fixture.mjs con códigos de error separados.

La ficha admite INCIDENTS_READ_MODE=projection explícito. Ausente/history conserva
el historial. Valor inválido, RPC fallida o bootstrap ausente produce error, sin
fallback ni reconstrucción durante visitas. No se modificó .env.local. Antes de
activar hay que reconstruir y verificar todos los fixtures BSD servidos, incluso
vacíos, tras auditoría y corte de escritores. Rollback de lectura no reabrirá
INSERT directo; importaciones posteriores al corte requerirán --storage=projection.

## Eventos activados localmente sobre Supabase — 28/09/2026

El propietario reportó auditoría posterior true/76/[]. RPC verificadas; inventario
estable y reconstrucción de 32 proyecciones con equivalencia completa. Una sola
observación histórica, ninguna nueva; retry sin escrituras. Evidencia:
docs/research/incident-activation-20260928.json. Sustituye los pendientes de corte
anteriores: NO repetir incident_history_projection.sql.

INCIDENTS_READ_MODE=projection activo localmente el 28/09; una RPC por fixture, 31 empty y
uno stale. Fichas HTTP verificadas con 22 eventos y sin datos. Sin despliegue ni
cambio de otros entornos. Importaciones posteriores requieren --storage=projection;
nuevos fixtures requieren bootstrap explícito, incluso vacíos. Rollback de lector
no reabre INSERT directo. Pendiente medición a escala de eventos; ingesta manual.
