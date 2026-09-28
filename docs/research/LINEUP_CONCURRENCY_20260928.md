# Concurrencia y auditoría de alineaciones — 28/09/2026

## Reproducción

```powershell
./tests/database/run-statistics-concurrency.ps1 -Resource lineups
node tests/database/lineup-audit.mjs
```

Runner compartido con estadísticas, cuyo comando anterior sigue funcionando.
PostgreSQL 17.11 portable y pg@8.23.0 ya instalados bajo .tools. Cada ejecución
crea un cluster aislado con contraseña aleatoria SCRAM y escucha solo en loopback;
se detiene al terminar y elimina los archivos de conexión/contraseña. No lee .env
ni acepta una conexión a Supabase. Datos sintéticos exclusivos de la prueba.

## Resultados

Propuestas de estadísticas y alineaciones aplicadas como propietario CREATEROLE
sin superusuario, después de las migraciones base. ACL 76/76 de cada recurso;
preflight de alineaciones correcto aun con estadísticas ya aplicada. Los escritores
usan service_role en dos conexiones independientes; un tercer observador confirma
con pg_blocking_pids que la segunda espera realmente el bloqueo de la primera.
También comprueba que la proyección no cambia para otros lectores antes de commit.

Diez escenarios comunes aprobados: raíz inexistente, generación existente,
UUID idéntico, UUID conflictivo, rollback del primer escritor, fallo tras INSERT,
retry automático con recálculo, timestamps iguales, respuesta descartada seguida
de desconexión/retry y retroactivo equivalente al replay completo.

Cuatro carreras específicas de alineaciones aprobadas. Una completa confirma
primero; el segundo escritor detecta CAS y recalcula una observación posterior:

| Segunda observación | Resultado después del reintento |
| --- | --- |
| Parcial con fuente más reciente | Conserva completa anterior |
| Completa con fuente anterior | Conserva completa anterior |
| Completa sin fecha de fuente | Conserva completa con fecha conocida |
| Predicción excluida | Conserva completa anterior |

En los cuatro casos avanzan last y conteo, chosen permanece correcto, la fecha
retenida no se rejuvenece y el estado es stale. Resultado completo contrastado
contra lineupSnapshotView del historial real de la base de prueba.

La suite de estadísticas conserva sus diez escenarios tras compartir el harness.
No se modificó código de runtime ni SQL de persistencia en este bloque.

## Auditoría de catálogo preparada

- preflight_lineup_projection.sql: solo lectura, anterior al corte. Informa
  nombres ocupados, historia, permisos, restricciones de fixtures y teams; estas
  últimas son necesarias para verificar home_external_id/away_external_id.
- audit_lineup_projection_acl.sql: solo lectura, posterior al corte, 76 controles.
- Prueba PGlite: ausencia de esquema, nombre de rol ocupado, estado previo y
  posterior, y diez alteraciones de privilegios detectadas/revertidas. Ambas
  consultas funcionan dentro de transacciones read-only.

## Límites y siguiente paso

Esto verifica PostgreSQL local y RPC mediante adaptador SQL, no PostgREST/pooler
ni latencia remota. Respuesta descartada simula una confirmación no conservada;
no se inyectó una caída real de red. Aislamiento READ COMMITTED predeterminado.
La corrupción histórica y la reselección retroactiva por fecha de fuente también
conservan sus pruebas PGlite previas. ACL no certifica cuerpos SQL ni datos.

Falta evidencia administrativa remota del preflight. No aplicar todavía el SQL
de alineaciones ni activar LINEUPS_READ_MODE. El acceso disponible en esta tarea
es Data API; la consulta de catálogo debe ejecutarla el propietario en SQL Editor.
