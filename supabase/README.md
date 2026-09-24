# Primera migración

`migrations/20260917000100_initial_football.sql` crea cinco tablas vacías.
No importa muestras, no modifica tablas existentes ni aplica datos de investigación.
RLS habilitado sin políticas públicas; permisos CRUD solo para `service_role`.
La clave del servidor nunca debe llegar al navegador.

Estado remoto: **aplicada manualmente por el usuario**, confirmado el 2026-09-17.
Lectura autenticada desde backend verificada: las cinco tablas respondieron
HTTP 200. No se insertaron datos en esta comprobación. Permisos públicos/RLS
probados localmente; el usuario ejecutó además `check-access.sql` remotamente
y confirmó cinco filas con RLS true y privilegios anon/authenticated false.
La Data API no ejecuta migraciones SQL.
Se requiere sesión de administrador en el SQL Editor de este proyecto o conexión
PostgreSQL administrativa guardada localmente, nunca enviada por chat.

Verificación local: migración ejecutada en PostgreSQL embebido PGlite; comprobados
RLS, permisos, nulos, duplicados, equipos distintos y relaciones entre proveedores.
Prueba reproducible: instalar `@electric-sql/pglite` en `.tools/db-validation`
(dependencia aislada, fuera de la aplicación) y ejecutar
`node tests/database/initial-migration.mjs`. No sustituye validar Supabase remoto.

Aplicación manual: abrir SQL Editor del proyecto Supabase, copiar el archivo
completo y ejecutarlo una sola vez. La transacción revierte ante errores.
Si alguna tabla ya existe, detenerse y comparar; no borrar ni usar IF NOT EXISTS
para ocultar diferencias. Este procedimiento no registra historial de Supabase
CLI; al incorporarla habrá que reconciliar el historial, sin repetir el SQL.

Luego verificar las cinco tablas, RLS, denegación a anon/authenticated y lectura
desde backend. No considerar aplicada por haber guardado el archivo local.

Identidad interna UUID; claves externas únicas y relaciones dentro del mismo
proveedor. `fetched_at` debe actualizarse en cada escritura de sincronización;
`source_updated_at` solo cuando la fuente lo proporcione. Estado, fase, grupo
y jornada son valores crudos, no clasificación local definitiva. Marcadores
sin valor predeterminado: null significa desconocido.

## Lotes de tablas — migración local preparada, remoto pendiente

`migrations/20260924000100_standings_batches.sql` agrega una tabla privada de
lotes inmutables; no modifica fixtures ni activa tablas en el producto. Backend
con SELECT/INSERT, sin UPDATE/DELETE; anon/authenticated sin acceso, RLS activo.
Validación profunda y recálculo en servidor, constraints básicos en SQL.

Prueba local sobre las cuatro migraciones en secuencia:

```powershell
node --conditions=react-server tests/database/standings-migration.mjs
```

Usa el PGlite aislado existente en .tools/db-validation, sin dependencias nuevas
de aplicación. Verifica lote real observado de siete snapshots, idempotencia,
conflicto de UUID, rechazo atómico de filas inválidas, permisos y conservación de
lotes completos al registrar uno incompleto. No prueba la Data API remota.
La migración todavía no se aplicó remotamente. Contrato:
`src/server/standings/PERSISTENCE.md`; comando manual en `scripts/README.md`.

## Revisiones oficiales y activación — local, remoto pendiente

`20260924000200_standings_official_reviews.sql` agrega un historial inmutable de
evidencia y decisiones, FK al ID/hash exacto del lote y trigger que impide
activar uno incompleto. RLS y SELECT/INSERT exclusivos de service_role.
Comparación/frescura se validan en backend antes de una sola inserción atómica.

La misma prueba standings-migration cubre ahora ambos almacenamientos: hash
ajeno rechazado, lotes incompletos no activables incluso mediante SQL directo,
reintento sin duplicados, diferencias auditadas sin activar y permisos privados.
No aplica la migración en Supabase ni prueba la Data API remota. No hay un
puntero mutable de tabla activa: el futuro lector deberá considerar la última
revisión por lote, incluida una denegación, según el contrato PERSISTENCE.md.
