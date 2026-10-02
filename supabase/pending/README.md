# Propuestas SQL pendientes

Estos archivos NO forman parte del conjunto activo `supabase/migrations/`.
Requieren corte coordinado; no incluirlos en una carga automática de migraciones.
Estado actualizado al 28/09/2026: SQL de estadísticas aplicado por el propietario,
auditoría 76/76 informada y reconstrucción remota verificada. NO repetir el SQL.
El archivo permanece aquí como registro del corte manual, fuera de carga automática.
Los apartados de preparación siguientes describen etapas anteriores; ver activación al final.

## Próximo paso remoto: preflight de solo lectura

Ejecutar únicamente `preflight_statistics_projection.sql` en SQL Editor del
proyecto Supabase y devolver la celda JSON `evidence` completa. No ejecuta DDL ni
lee filas deportivas: informa versión, nombres ocupados, permisos efectivos,
columnas, restricciones, índices, políticas y triggers del historial, más las
restricciones de fixtures. No incluye credenciales.

Se espera `new_names_available=true` e `history.access_ok=true` antes de aplicar
la propuesta, pero ambos requieren además revisión de las definiciones. Si ya
existen objetos, no repetir SQL ni eliminar colisiones. `access_ok` describe los
permisos históricos SELECT/INSERT previos al corte; será false después del cambio
esperado a SELECT solamente. Para el estado nuevo usar la auditoría posterior.

La conexión disponible en este proyecto es Data API, sin acceso administrativo
al catálogo. Esta ejecución en SQL Editor requiere al propietario del proyecto;
no pedir ni compartir contraseñas. No aplicar todavía el SQL de persistencia ni
cambiar STATISTICS_READ_MODE. Prueba local reproducible, incluida transacción
read-only: `node tests/database/statistics-preflight.mjs`.

## statistics_history_projection.sql

Crea proyección por fixture, FK compuestas al historial, lector RPC invoker y
commit CAS mediante función definer de rol dedicado NOLOGIN/NOBYPASSRLS. Revoca
INSERT directo de service_role en estadísticas; mantiene SELECT. El nuevo rol
solo puede SELECT/INSERT en ese historial y SELECT/INSERT/UPDATE en su proyección,
con políticas RLS explícitas. No puede modificar/borrar observaciones ni conserva
CREATE de esquema. Funciones sin EXECUTE público/anon/authenticated.

La RPC serializa la fila de proyección, incluida creación concurrente. Inserta y
actualiza dentro de la misma transacción; valida UUID retry antes de generación.
Bootstrap comprueba conteo completo y last real; commits posteriores usan contador
atómico y last por índice. El backend valida la semántica del reductor: no aceptar
resultados calculados por usuarios ni afirmar que SQL duplica esa validación.

Estado: prueba local aprobada, SIN aplicar remotamente. El importador admite
--storage=projection explícito; default y UI conservan el camino anterior. Aplicar
ahora rompería las importaciones antiguas; falta corte coordinado de escritores,
activación remota de lectura/reconstrucción ya implementadas localmente y auditoría
administrativa remota. Prueba multi-conexión local aprobada (ver abajo). Revisar disponibilidad del nombre
mle_statistics_writer y permisos efectivos en el proyecto de destino.

Reproducir únicamente en base efímera local:

```powershell
node --conditions=react-server tests/database/statistics-projection.mjs
```

La prueba aplica las migraciones existentes más esta propuesta en PGlite en memoria.
No abre conexiones remotas ni consume variables privadas. Cubre roles, bootstrap,
replay completo contra lector actual, retroactivos, rollback posterior al INSERT,
retries tras avance de generación, conflicto/CAS con recálculo y límite de intentos.
La intercalación se simula serializada; no certifica ejecución en dos conexiones.

## Auditoría de permisos preparada

`audit_statistics_projection_acl.sql` es una consulta administrativa de solo
lectura. Devuelve `access_ok`, cantidad de comprobaciones y nombres de controles
fallidos; no expone datos deportivos ni credenciales. Es independiente de la
aplicación del SQL: esquema/funciones/rol ausentes producen un resultado negativo.
Revisa permisos efectivos de tabla y columna, RLS, atributos/membresías del rol
escritor, acceso a otras tablas públicas, CREATE de esquema, propietario del
definer, search_path y EXECUTE de las dos funciones, incluido PUBLIC.

Verificación local reproducible:

```powershell
node tests/database/statistics-projection-acl.mjs
```

76 controles aprobados sobre la propuesta y diez alteraciones detectadas en
transacciones revertidas. Esto no reemplaza revisar cuerpos SQL, restricciones,
políticas RLS, reconstrucción ni concurrencia; tampoco certifica el catálogo
remoto. Ejecutar la auditoría administrativa en destino tras el futuro corte.
La falta inicial de un motor nativo se resolvió con PostgreSQL portable en .tools.

## Concurrencia real local — 27/09/2026

```powershell
./tests/database/run-statistics-concurrency.ps1
```

Requiere PowerShell 7, Node y binarios Windows de PostgreSQL. El runner acepta
`-PgBin` y por defecto usa `.tools/db-validation/pgsql17/pgsql/bin`. Se probó con
PostgreSQL 17.11 de la [distribución portable EDB](https://www.enterprisedb.com/download-postgresql-binaries)
y cliente `pg@8.23.0` instalado con `npm install --prefix .tools/db-validation
--ignore-scripts --no-audit --no-fund pg@8.23.0`; no agrega dependencias a la app.

Cada ejecución crea un cluster nuevo bajo .tools, con contraseña aleatoria SCRAM,
puerto libre y escucha exclusiva en 127.0.0.1. No lee .env ni acepta URL remota.
Antes de migrar verifica directorio del servidor y ausencia de tablas públicas.
Dos conexiones escritoras actúan como service_role; una tercera observa bloqueos
reales con pg_blocking_pids. El proceso se detiene en finally; contraseña y archivo
de conexión se eliminan. Cluster/logs locales de prueba quedan ignorados por Git.
El sandbox de Windows puede requerir autorización para ejecutar initdb/pg_ctl.

Diez escenarios aprobados: raíz inexistente, generación existente, UUID idéntico,
UUID con contenido conflictivo, rollback que libera al segundo escritor, fallo
posterior a INSERT, retry automático del backend, fecha igual con UUID diferente,
retry tras respuesta descartada/desconexión y avance posterior, e inserción
retroactiva. Se comprueba invisibilidad antes del commit y equivalencia final con
el lector completo. Los 76 controles ACL también pasan en PostgreSQL nativo.
Evidencia y límites: `docs/research/STATISTICS_CONCURRENCY_20260927.md`.

## Corte manual preparado — 28/09/2026

El preflight recibido del propietario (docs/research/statistics-preflight-20260928.json)
informa PostgreSQL 17.6, nombres disponibles, RLS habilitado y permisos esperados.
Columnas, restricciones, índices, políticas y triggers coinciden con el esquema
local; fixtures conserva la clave compuesta referenciada. Esto reemplaza la espera
del resultado remoto indicada arriba. No prueba permisos administrativos futuros.

Antes de ejecutar: mantener pausadas las importaciones manuales de estadísticas.
No hay scheduler deportivo habilitado en el proyecto. El job de salud solo lee.

1. En SQL Editor del mismo proyecto, ejecutar una sola vez el archivo completo
   `statistics_history_projection.sql`. Crea proyección/RPC y revoca INSERT directo
   a service_role dentro de una transacción con bloqueo del historial.
2. Si termina correctamente, ejecutar `audit_statistics_projection_acl.sql` y
   devolver el resultado completo. Si hay error, devolverlo sin repetir la carga,
   borrar objetos ni conceder permisos amplios.
3. Mantener STATISTICS_READ_MODE=history y las importaciones pausadas. Tras revisar
   la auditoría, Codex verificará Data API y reconstruirá/comparará los fixtures
   servidos antes de habilitar el lector. Nuevas importaciones usarán exclusivamente
   `--storage=projection`; comandos antiguos fallarán por permisos sin insertar.

Se corrigió un requisito del cambio de propietario para administradores sin
superusuario: EXECUTE se restringe antes de transferir la función; membresía
temporal SET (sin INHERIT) y CREATE de esquema se retiran antes del commit.
PostgreSQL puede conservar el grant implícito ADMIN-only al creador. La auditoría
lo acepta solo para el propietario del historial, sin SET ni INHERIT; cualquier
otra membresía falla. No se otorga capacidad al rol operativo para asumir al escritor.
Prueba: `node tests/database/statistics-migration-admin.mjs`; repetida además en
PostgreSQL 17.11 con los diez escenarios concurrentes y auditoría 76/76.
Requisito de ownership: [ALTER FUNCTION PostgreSQL 17](https://www.postgresql.org/docs/17/sql-alterfunction.html).

## Activación verificada — 28/09/2026

El propietario devolvió `true / 76 / []` de la auditoría posterior. Desde Data API
se verificaron las RPC y se inventariaron los 32 fixtures BSD del ámbito 85/1635,
equipo 4997. Dry-run: una observación histórica, ninguna escritura. Apply:
32 proyecciones inicializadas, cero observaciones nuevas, equivalencia 32/32
contra historial completo; inventario estable. Retry de 223728: cero escrituras,
misma generación 1. No hubo llamadas a proveedores.

STATISTICS_READ_MODE=projection está activo en .env.local, sin cambiar el default
de otros entornos ni desplegar. Lectura configurada comprobada para 32 fixtures:
32 RPC, cero recorridos de historial, 31 empty y un stale. Fichas locales 223728 y
223606 devuelven HTTP 200 y las secciones esperadas; servidor temporal detenido.
Evidencia: docs/research/statistics-activation-20260928.json.

Importaciones de estadísticas pueden continuar únicamente con --storage=projection.
Mantener reconstrucción explícita para fixtures nuevos antes de servirlos con este
modo: sin proyección inicializada el lector falla cerrado. Alineaciones/eventos
siguen con lectores completos. Rollback de lectura: history, conservando CAS y
permisos de escritura; no restaurar INSERT directo ni repetir esta migración.

## Alineaciones: propuesta exclusivamente local — 28/09/2026

`lineup_history_projection.sql` NO está aplicado ni preparado para corte remoto.
Agrega proyección y RPC propias, rol mle_lineup_writer y revocación de INSERT
directo de alineaciones. Conserva las FK del historial con IDs externos de ambos
equipos; chosen admite complete/partial y nunca unavailable. Reglas de selección
pertenecen al reductor backend compartido, no se duplican en SQL.

Backend en lineup-projection.mjs reutiliza el mecanismo de validación del envelope,
lectura única, append/replay, CAS y retry extraído de estadísticas. Valida además
identidad local/externa de cada lado mediante validateLineupObservation.
Estadísticas conserva su API y configuración; no se cambia su SQL ya aplicado.

Prueba local: `node --conditions=react-server tests/database/lineup-projection.mjs`.
Incluye coexistencia y ACL de ambos recursos, administrador no superusuario,
bootstrap vacío, unavailable sin datos, retención de partial, fechas de fuente
anteriores/ausentes, retroactivo que cambia chosen, rollback, retry y corrupción
histórica. Intercalación serializada; no certifica dos conexiones de alineaciones.
Las pruebas unitarias comparan 130 resultados de proyección/replay. El ensayo
nativo de diez carreras de estadísticas también pasa tras compartir el mecanismo.

Pendiente: importador explícito, reconstrucción y selector de lectura, auditoría
remota y ensayo multi-conexión específico de alineaciones antes del corte.
UI e importador actuales de alineaciones continúan con el historial paginado.

### Integración operacional preparada localmente

Importador: --storage=projection explícito, default history. Reconstructor:
scripts/rebuild-lineup-projection.mjs por evento, preview sin escrituras y apply
sin observaciones nuevas. Comparación del historial bajo generación estable y
reporte de verificación independiente del commit. Ficha: LINEUPS_READ_MODE,
default history; no se modificó configuración privada. Home conserva su lector.
Estas conexiones reemplazan ese pendiente de implementación del párrafo anterior;
activación, auditoría y concurrencia específica de alineaciones siguen pendientes.

Prueba SQL ahora recorre el lookup y los importadores/reconstructores reales,
incluidos repetición idempotente, comparación completa y permisos del corte.
La mecánica de reconstrucción comparte history-rebuild.mjs con estadísticas,
conservando validadores, tablas y prefijos de error separados por recurso.

### Concurrencia y preflight de alineaciones — 28/09/2026

Ensayo nativo aprobado: diez escenarios comunes y cuatro carreras específicas
de retención, con bloqueos comprobados y equivalencia contra replay. Auditorías
de ambos recursos 76/76; diez alteraciones de ACL detectadas en PGlite. El ensayo
específico de concurrencia ya no está pendiente. Evidencia y límites en
docs/research/LINEUP_CONCURRENCY_20260928.md.

Próximo paso: ejecutar únicamente `preflight_lineup_projection.sql` en SQL Editor
del mismo proyecto Supabase y devolver la celda JSON evidence completa. Es de
solo lectura; incluye restricciones de teams/fixtures además del historial.
No aplicar todavía `lineup_history_projection.sql` ni activar LINEUPS_READ_MODE.
Tras contrastar el catálogo se preparará el corte manual y se usará
`audit_lineup_projection_acl.sql` para la auditoría posterior.

### Preflight de alineaciones recibido; corte preparado — 28/09/2026

Evidencia en docs/research/lineup-preflight-20260928.json: PostgreSQL 17.6, nombres
libres y acceso esperado. Comparación automática aprobada contra esquema local:
columnas, restricciones, índices, políticas/triggers y claves de teams/fixtures.
Esto reemplaza la espera de preflight de las notas anteriores. SQL aún sin aplicar.

Mantener pausadas las importaciones manuales de alineaciones durante el corte:

1. Ejecutar una vez el archivo completo `lineup_history_projection.sql` en SQL
   Editor del mismo proyecto. Crea proyección/RPC y revoca INSERT directo de
   alineaciones a service_role dentro de una transacción con bloqueo del historial.
2. Si termina correctamente, ejecutar `audit_lineup_projection_acl.sql` y devolver
   el resultado completo. Si falla, devolver el error sin repetir migración ni
   conceder permisos adicionales o eliminar objetos.
3. Mantener LINEUPS_READ_MODE=history y las importaciones pausadas hasta revisar
   auditoría y RPC. Después Codex hará dry-run/reconstrucción de todos los fixtures
   servidos y comprobará equivalencia antes de activar la ficha. Home conserva
   lectura completa independiente. Importaciones futuras usarán --storage=projection.

La configuración local no se modificó. No repetir SQL de estadísticas, ya activo.
Rollback de lectura conservará el escritor atómico y no reabrirá INSERT directo.

### Alineaciones aplicadas y reconstruidas — 28/09/2026

El propietario reportó auditoría posterior aprobada: true, 76, sin fallos. Data API
confirmó RPC disponibles y reconstrucción equivalente de los 32 fixtures revisados;
retry sin escrituras. Evidencia: docs/research/lineup-activation-20260928.json.
LINEUPS_READ_MODE=projection activo localmente para ficha; Home conserva historial.
No hay despliegue a otros entornos. Esta nota sustituye los pendientes anteriores:
no repetir lineup_history_projection.sql. Futuras importaciones manuales requieren
--storage=projection y nuevos fixtures necesitan reconstrucción antes de servirlos
con ese lector. Ninguna observación nueva ni consulta deportiva en este corte.

## Eventos: propuesta local, sin aplicar — 28/09/2026

Estado vigente: la propuesta se aplicó en el proyecto auditado y el lector se activó
localmente el 28/09. La sección "Eventos activados localmente sobre Supabase" al
final reemplaza las instrucciones de corte siguientes. No repetir el SQL.

incident_history_projection.sql implementa persistencia atómica con rol escritor
propio, RLS/FK, lectura de un corte y commit CAS. Revoca INSERT directo solamente
en la base de prueba. No ejecutar todavía en Supabase: importador y ficha de
eventos aún utilizan historial y no se preparó el corte operacional.

Prueba reproducible sin red ni configuración privada:

```powershell
node --conditions=react-server tests/database/incident-projection.mjs
```

Incluye administrador no superusuario, auditorías ACL 76/76 de cada uno de los tres
recursos coexistentes, reemplazo íntegro de listas, retención, reconstrucción,
preview, conflictos serializados y rollback. No certifica concurrencia real;
faltan integración operacional, ensayo multi-conexión y preflight remoto revisado.
No repetir SQL remoto de estadísticas ni alineaciones, ya aplicados.

### Operación de eventos conectada localmente — 28/09/2026

Importador con --storage=projection explícito, reconstrucción por evento y modo
INCIDENTS_READ_MODE integrados y probados en PGlite. Sustituye el pendiente de
conexión operacional anterior; default history conserva el estado remoto vigente.
La prueba SQL recorre búsqueda de fixture real, dry-run, apply, retry, importación
de failed y verificación completa post-reconstrucción. 202 pruebas unitarias,
lint, tipos y build aprobados, junto con regresiones SQL de los otros dos recursos.

No aplicar incident_history_projection.sql todavía: quedan concurrencia específica
multi-conexión, preflight remoto y auditoría/corte coordinado. No se modificaron
Supabase ni configuración privada. Estadísticas/alineaciones conservan su activación.

### Concurrencia de eventos cerrada; preflight preparado — 28/09/2026

Ensayo PostgreSQL 17.11 aprobado con dos escritores reales, 14 escenarios y
regresiones de los otros recursos. Tres auditorías 76/76; diez alteraciones ACL
detectadas localmente. Evidencia: docs/research/INCIDENT_CONCURRENCY_20260928.md.

Siguiente paso: ejecutar solamente preflight_incident_projection.sql en SQL Editor
del mismo proyecto y devolver la celda JSON evidence completa. Es de solo lectura.
No aplicar incident_history_projection.sql ni cambiar INCIDENTS_READ_MODE todavía.
Tras contrastar catálogo se prepara el corte y se usa audit_incident_projection_acl.sql.

### Preflight remoto de eventos contrastado; corte preparado — 28/09/2026

Evidencia recibida en docs/research/incident-preflight-20260928.json: PostgreSQL
17.6, nombres libres, RLS/permisos esperados. Comparación automática con esquema
local aprobada para columnas, restricciones, índices, políticas/triggers y claves
de teams/fixtures. Sustituye la espera de preflight anterior. SQL aún sin aplicar.

Con las importaciones manuales de eventos pausadas:

1. Ejecutar una sola vez el archivo completo incident_history_projection.sql en
   SQL Editor del mismo proyecto. Crea proyección/RPC y revoca INSERT directo a
   service_role en una transacción con bloqueo del historial.
2. Si termina correctamente, ejecutar audit_incident_projection_acl.sql y devolver
   el resultado completo. Ante error, devolverlo sin repetir migración ni eliminar
   objetos o conceder permisos adicionales.
3. Mantener INCIDENTS_READ_MODE ausente/history e importaciones pausadas hasta
   revisar auditoría y RPC. Después se hará dry-run/reconstrucción de todos los
   fixtures servidos y contraste de equivalencia antes de activar el lector.

Importaciones posteriores al corte usarán --storage=projection. Rollback de
lectura no reabre INSERT directo. No repetir SQL de estadísticas/alineaciones.

## Eventos activados localmente sobre Supabase — 28/09/2026

El propietario reportó auditoría posterior true/76/[]. RPC verificadas; inventario
estable y reconstrucción de 32 proyecciones con equivalencia completa. Una sola
observación histórica, ninguna nueva; retry sin escrituras. Evidencia:
docs/research/incident-activation-20260928.json. Sustituye los pendientes de corte
anteriores: NO repetir incident_history_projection.sql.

INCIDENTS_READ_MODE=projection activo localmente; una RPC por fixture, 31 empty y
uno stale. Fichas HTTP verificadas con 22 eventos y sin datos. Sin despliegue ni
cambio de otros entornos. Importaciones posteriores requieren --storage=projection;
nuevos fixtures requieren bootstrap explícito, incluso vacíos. Rollback de lector
no reabre INSERT directo. Pendiente medición a escala de eventos; ingesta manual.
