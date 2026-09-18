# Sincronización manual BSD

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
