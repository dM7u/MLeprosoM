# Contrato de snapshots y lectura provisional

Decisión técnica del 24/09/2026. Implementación local: política pura de lectura
en `snapshot-view.mjs`, lotes validados en `batch.mjs` y escritura en
`db/store-standings-batch.mjs`. Migración preparada y probada localmente;
sin activación del esquema remoto ni publicación en UI. El contraste y control
de activación por lote también están implementados y probados localmente;
su contrato se detalla al final de este documento.

## Unidad y procedencia

Guardar una ejecución inmutable de toda la liga, junto con sus snapshots por
ámbito. Identidad del ámbito: provider + competition_id + season_id + kind +
tournament opcional + group opcional. Anual no admite torneo ni zona.
Son IDs externos opacos; no confundirlos con los UUID internos de Supabase.

Cada ejecución debe conservar:

- Versión del contrato y del motor; hash del catálogo normalizado y de la
  revisión efectiva (calendario, membresías, exclusiones y sustituciones).
- Catálogo mínimo necesario para reproducir resultados, observación por página
  y conteos/consumo; ningún header, clave ni cuerpo de error del proveedor.
- Inicio/fin de ejecución, `generated_at`, `data_as_of` y fecha/fuente de revisión.
- Snapshots completos tal como los produce el motor, incluidos cobertura,
  incidencias, empates, procedencia y ajustes sin verificar.

El almacenamiento inicial podrá usar una tabla de ejecuciones con payload JSONB
versionado: una inserción atómica del lote evita mezclar anual y zonas de
consultas diferentes. No agregar todavía un segundo modelo de filas acumuladas
que pueda divergir del snapshot. Una clave de idempotencia por ejecución debe
permitir reintentar la misma escritura sin duplicarla; una nueva observación,
aunque dé los mismos resultados, conserva su propia fecha.

No alcanza con guardar los partidos de Newell's: el lote debe conservar la
entrada completa de liga. No modificar la lectura de fixtures del equipo para
simular cobertura de tablas. Antes de escribir, validar contrato y ámbito en
backend; la política de lectura recibe snapshots del motor ya validados, no
JSON arbitrario de un cliente. La migración deberá incluir RLS, acceso exclusivo
de service_role y restricciones de identidad/versionado; sin acceso anónimo.

## Fallos y última tabla válida

Conservar intentos fallidos/incompletos como auditoría, separados de la última
ejecución válida. Un intento fallido nunca borra el último resultado ni renueva
sus timestamps. Al persistir el lote de liga, exigir que todos sus ámbitos estén
completos para hacerlo elegible como nuevo lote válido. El historial permite
inspeccionar el resto sin publicar una mezcla de ejecuciones.

El lector futuro entrega a `standingsSnapshotView` el candidato y, si existe,
el snapshot anterior del mismo ámbito. La función no hace I/O ni consulta BSD.
Rechaza ámbitos distintos, datos incompletos y procedencia incompatible. Una
observación anterior no desplaza a otra más reciente porque se haya recalculado
después. Devuelve una copia independiente, sin modificar la entrada guardada.

## Frescura y significado de publicación

Dos TTL positivos y explícitos: resultados (`data_as_of`, observación más
antigua) y revisión de calendario/membresías (`scope.reviewed_at`). El reloj
también se pasa explícitamente. No reutilizar automáticamente el TTL de fixtures
ni elegir una frecuencia de sincronización a partir del TTL: son decisiones
distintas. Los valores de despliegue se fijarán al implementar el proceso manual
de almacenamiento, antes de habilitar la lectura del producto.

Recalcular un catálogo viejo no lo vuelve fresco. Si vence cualquiera de los
dos TTL, la tabla sigue disponible como **Tabla provisional desactualizada**.
Si falla la actualización, conservar la anterior con advertencia de fallo y
estado stale. Sin una tabla utilizable, mostrar **Sin datos** (empty o error),
nunca filas vacías interpretadas como cero puntos. Un torneo not_started sin
tabla previa es empty; si contradice una tabla previa completa, conservarla stale.

Toda tabla utilizable lleva **cálculo propio** y **ajustes sin verificar**;
`fresh` solo describe vigencia técnica. No asignar posiciones oficiales ni
ocultar los empates pendientes. `standingsSnapshotView` no autoriza escrituras
ni habilita rutas/UI: prepara el estado que utilizará el lector futuro.

La comparación oficial es evidencia independiente, fechada y vinculada al
catálogo y revisión exactos. No transferir un resultado match a futuras
ejecuciones. Las diferencias deben registrarse por campo/equipo/ámbito y
revisarse antes de activar un nuevo lote para el producto; nunca convertirlas
automáticamente en sanciones ni corregir los puntos aritméticos por diferencia.
El registro y control se implementaron en el bloque de contraste por lote
descrito al final. Falta conectar su lectura y aplicar el esquema remoto.

## Siguiente bloque verificable

Preparar migración y almacenamiento manual de un lote inmutable con idempotencia,
validación de payload y prueba local de atomicidad/RLS. Incorporar evidencia de
contraste ligada al lote y su estado de activación. Definir los TTL explícitos
de despliegue y probar lector por ámbito con caída de almacenamiento/proveedor.
Solo después activar esquema remoto, guardar un catálogo actualizado y conectar
tablas provisionales a la UI. Sin cron, vivo, sanciones, ratings o promedios en
este contrato. La paginación BSD sigue sin ofrecer aislamiento transaccional.

## Primer almacenamiento implementado — 24/09/2026

`standings_batches` guarda un lote JSONB por UUID explícito de ejecución. Las
columnas de ámbito usan IDs externos. Versiones: contrato 1, motor
standings-basic-v1. Hash SHA-256 canónico de fixtures normalizados, revisión
efectiva (scope/calendario/membresías/IDs excluidos) y payload completo.
Cambiar reglas exige revisar la versión, no reinterpretar lotes viejos.

La entrada retenida reproduce el motor; no incluye cuerpos BSD completos ni
reproduce por sí sola la investigación que decidió sustituciones. Esa evidencia
se conserva separadamente en docs/research. Timestamps por fixture preservan
la observación de la página; generated_at es explícito. La escritura rechaza
cálculos con fecha futura. El backend recalcula todas las filas y hashes antes
de insertar y rechaza campos adicionales en el lote recibido.

La inserción única es atómica. En un conflicto de UUID se lee el registro y se
compara su contenido completo, normalizando la representación SQL de fechas:
idéntico es un reintento exitoso; distinto produce conflicto. No se usa upsert
que sobrescriba historia. Ante resultado incierto de red, repetir con el mismo
UUID, archivos y generated_at; no generar otra identidad automáticamente.

RLS y permisos permiten únicamente SELECT/INSERT a service_role. Anon y
authenticated no tienen acceso; service_role no puede actualizar ni borrar.
Los constraints SQL verifican estructura básica, identidad, versión y fechas;
la validación profunda y recálculo son responsabilidad del backend. Un
administrador SQL conserva sus privilegios administrativos normales.

Un lote no completo se guarda como auditoría incomplete; no desplaza ni modifica
otro lote. complete expresa solo cobertura del cálculo, nunca activación.
No hay columna ni comando de publicación. El registro de fallos anteriores a
construir un lote, contraste oficial persistido/activación, lector DB y TTL de
despliegue siguen pendientes. El comando devuelve códigos sanitizados en esos
fallos. No se afirma que la política de lectura esté conectada a almacenamiento.

## Contraste ligado al lote y activación — 24/09/2026

Actualiza el pendiente de contraste del apartado anterior. `official-review.mjs`
valida una transcripción oficial explícita y `store-official-review.mjs` la
inserta junto con su decisión en una sola fila inmutable. La tabla nueva
`standings_official_reviews` tiene FK compuesta al ID/hash del lote. No modifica
las filas deportivas ni convierte calculated_position en official_position.

Entrada de evidencia: batch_id, payload_hash, observed_at ISO con zona y tables.
Cada tabla contiene selection (contrato del motor), source (URL HTTPS sin
credenciales) y rows con team_id, position y los ocho campos numéricos de tabla.
La vinculación es explícita: el JSON histórico de investigación no se convierte
automáticamente en evidencia para futuras cargas. La procedencia oficial requiere
revisión humana/técnica de la fuente; validar una URL HTTPS no certifica al editor.

Se exige anual y todas las zonas de cada torneo, con todos sus equipos y sin
duplicados. La general de cada torneo es cálculo propio; no se exige una tabla
oficial general que la fuente no publique. Se comparan ocho estadísticas y el
orden básico. Empates que el motor no resuelve no reciben el orden oficial por
copia: generan diferencia y requieren el bloque metodológico correspondiente.

Resultados match/differences/unavailable se guardan como auditoría. Para marcar
activated=true deben cumplirse simultáneamente: solicitud explícita, lote
completo, comparación sin diferencias, snapshots frescos y evidencia fresca
que no sea anterior a la última observación del catálogo. Se exigen tres TTL
positivos configurados: resultados, revisión de calendario y evidencia oficial.
No hay defaults de despliegue; los números de tests son políticas de prueba.

El almacenamiento vuelve a comprobar frescura con el reloj de escritura y
rechaza revisiones futuras o una activación preparada que ya venció. SQL verifica
la FK, estructura básica, coherencia de activación y que el lote esté completo;
el backend valida exhaustivamente evidencia, diferencias y TTL. La escritura
requiere SELECT/INSERT de service_role; sin UPDATE/DELETE ni acceso público.

UUID de revisión y reviewed_at identifican el intento. Repetir exactamente sus
entradas es idempotente mientras el control temporal permita escribir; otro
contenido con el mismo UUID falla. Un reintento de activación ya vencida puede
rechazarse aun si el primer intento se almacenó: el lector debe consultar el
historial, no crear otra aprobación automáticamente.

Una activación es habilitación provisional de ese lote en ese momento, no
garantía de frescura permanente. El próximo lector deberá considerar la revisión
más reciente de cada lote, incluso si niega activación; nunca filtrar primero
activated=true y resucitar una aprobación anterior. Empate de timestamps con
decisiones distintas debe bloquear, no resolverse por UUID. Entre lotes debe
respetar la observación de datos y volver a aplicar los TTL al leer. No hay aún
lector persistido, comando operativo de revisión ni conexión UI. La activación
remota y cualquier automatización siguen pendientes.

## Lector persistido implementado — 24/09/2026

Este apartado actualiza los pendientes de lector anteriores.
`db/read-standings.mjs` recibe un cliente backend, scope, selection y tres TTL
positivos explícitos. Solo consulta almacenamiento; no escribe ni llama al
proveedor. Recalcula y valida el lote y su revisión antes de devolver filas.
Normaliza fechas SQL sin cambiar las fechas originales del payload firmado.

La última revisión manda, incluida una denegación. Revisiones simultáneas con
decisiones distintas producen error. Entre lotes prima data_as_of y luego
generated_at; identidades distintas empatadas no se desempatan por UUID.
Un lote nuevo incompleto, no revisado o denegado permite conservar otro lote
anterior habilitado, marcado stale. No se recupera una aprobación anterior
del mismo lote. Si no existe candidato habilitado, devuelve empty/Sin datos.

Aplica el menor TTL entre la política actual y la guardada en la revisión para
resultados, calendario y evidencia. Vencimiento conserva las filas como tabla
provisional desactualizada; nunca renueva timestamps ni certifica posiciones.
Una caída de DB o datos corruptos devuelve error sanitizado sin filas: no usa
una copia en memoria que pueda ocultar una denegación almacenada.

Antes de devolver el candidato vuelve a consultar las últimas revisiones para
detectar cambios concurrentes. Es una comprobación optimista, no una transacción:
una revisión posterior a esa consulta se verá en la siguiente lectura. Para
publicación con exigencia de aislamiento habrá que implementar una consulta
transaccional. Tampoco existe snapshot transaccional entre páginas BSD.

Límites iniciales explícitos: 100 lotes y 500 revisiones por ámbito. Consulta
un registro extra para detectar exceso y falla con history_limit_exceeded en
vez de truncar el historial y rescatar una aprobación vieja. Resolver paginación
o selección transaccional antes de automatizar cargas frecuentes. Sin conexión
UI, TTL de despliegue ni activación remota en este bloque.

## Operación manual implementada — 24/09/2026

`scripts/review-standings.mjs` y `manual-review.mjs` conectan validación y
almacenamiento con dry-run sin cliente DB. Solicitud estable con lote completo,
evidencia, UUID, reviewedAt y booleano requestActivation. La vigencia se verifica
tanto en el instante de revisión como al ejecutar; apply vuelve a verificarla
en la escritura. Ninguna ejecución consulta al proveedor ni genera evidencia.

La política inicial versionada en `manual-policy.json` fija 6 h para resultados
y evidencia y 7 días para calendario/membresías. Es configuración técnica
editable de operación manual, no frecuencia de polling ni garantía de exactitud.
Cambios conocidos de calendario requieren revisión inmediata. Pasar esta misma
política al lector al conectar producto; no crear valores independientes en UI.
Guía, formato y semántica de exit codes en `scripts/README.md`.

Preflight remoto de lectura: ambas tablas y columnas accesibles, cero registros.
No prueba equivalencia de DDL, RLS ni privilegios: queda auditoría administrativa
con `supabase/check-standings-access.sql`. Sin escrituras remotas en este bloque.
