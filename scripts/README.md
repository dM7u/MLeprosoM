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

Estado: pruebas unitarias aprobadas; dry-run real bloqueado por conexión BSD,
también fuera del sandbox. Apply **no ejecutado**. No afirmar sincronización
completada ni cobertura de escritura remota hasta probar la cadena completa.

Auditoría confirmada por el usuario: `supabase/check-access.sql` permite revisar RLS y permisos
con SQL Editor (solo lectura). Esperar cinco filas, RLS true y privilegios de
anon/authenticated false. No confundir acceso administrativo con acceso público.
