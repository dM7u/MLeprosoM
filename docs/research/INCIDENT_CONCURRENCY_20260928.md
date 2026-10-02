# Concurrencia y auditoría de eventos — 28/09/2026

## Ensayo reproducible

```powershell
pwsh -NoProfile -File tests/database/run-statistics-concurrency.ps1 -Resource incidents
node --conditions=react-server tests/database/incident-audit.mjs
```

PostgreSQL 17.11 portable, clúster efímero vacío bajo .tools/db-validation,
SCRAM y loopback. Sin .env, Supabase ni proveedores. El sandbox impidió iniciar
initdb; el runner se ejecutó con permisos ampliados para procesos locales.
Cierre confirmado y archivos connection.json/password.txt eliminados en las cuatro
ejecuciones de esta sesión (intento fallido y tres recursos).

Migraciones y propuestas aplicadas por migration_admin sin superusuario;
estadísticas, alineaciones y eventos coexistentes. Auditorías 76/76 de cada
recurso aprobadas. Dos conexiones service_role independientes escriben; una
tercera comprueba pg_blocking_pids e invisibilidad antes de commit.

## Resultados

14 escenarios de eventos aprobados:

1. Raíz inexistente concurrente, invisibilidad, conflicto CAS y retry.
2. Generación existente compartida, sin pérdida de observaciones.
3. UUID idéntico concurrente: una observación y replay.
4. UUID con payload distinto: conflicto.
5. Escritor en espera progresa después de rollback.
6. Error después de INSERT revierte historial y proyección.
7. Backend recalcula y reintenta tras bloqueo/CAS real.
8. UUID distintos con igual timestamp: rechazo sin sobrescribir.
9. Lista más corta reemplaza íntegramente tras carrera.
10. Lista parcial reemplaza íntegramente tras carrera.
11. Empty conserva lista útil y fecha original tras carrera.
12. Failed conserva lista útil y fecha original tras carrera.
13. Retry tras respuesta descartada, desconexión y generación posterior.
14. Inserción retroactiva conserva equivalencia con replay completo.

Las cuatro carreras específicas verifican chosen, last, contenido completo,
estado y fecha. La equivalencia final usa el lector histórico real.
Regresiones del runner compartido: estadísticas pasa diez escenarios y
alineaciones sus diez generales más cuatro carreras específicas de retención.

PGlite comprueba preflight en transacción read-only, esquema ausente, nombres
ocupados y propuesta aplicada. Auditoría: 76 controles y diez alteraciones
revertidas/detectadas (permisos de columna, EXECUTE público, membresías en ambos
sentidos, BYPASSRLS, CREATE de esquema, acceso a otra tabla, RLS y search_path).

## Límites y siguiente paso

Esto no certifica PostgREST, pooler, red, catálogo remoto ni latencia a escala.
No hubo cambios de runtime en este bloque; se conservan las 202 pruebas,
typecheck y build aprobados previamente. Se verifica lint y diff del bloque.

Preparados preflight_incident_projection.sql y audit_incident_projection_acl.sql.
El siguiente paso requiere ejecutar únicamente el preflight de solo lectura en
SQL Editor del propietario y devolver el JSON evidence completo. Incluye catálogo,
privilegios efectivos, nombres ocupados y restricciones de fixtures/teams; no lee
filas deportivas ni credenciales. No aplicar incident_history_projection.sql aún.
Después de contrastar el catálogo se prepara el corte de escritores. El lector de
eventos conserva history; estadísticas/alineaciones conservan su activación.
