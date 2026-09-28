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
