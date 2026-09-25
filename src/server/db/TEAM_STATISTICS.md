# Estadísticas de equipo persistidas

Implementación del 25/09/2026. Tabla accesible remotamente, primera muestra
cargada y ficha conectada. DDL/RLS/permisos probados localmente; certificación
administrativa remota completa aún pendiente.

`createStatisticsObservation` recibe un fixture previamente leído/verificado,
UUID estable de operación, respuesta BSD y fecha de observación. Reutiliza el
normalizador de once métricas; `failed: true` exige ausencia de cuerpo y guarda
payload null. Nunca almacenar errores crudos del proveedor.

`storeStatisticsObservation` valida e inserta una observación atómica e
inmutable. UUID repetido solo se acepta como retry si contenido y fecha coinciden.
La FK compuesta comprueba fixture, proveedor, evento y ambos equipos contra DB.
No basta pasar IDs arbitrarios al constructor para lograr una inserción válida.

La migración `20260925000100_team_statistics.sql` habilita RLS, revoca permisos
públicos y concede solo SELECT/INSERT a service_role. Restringe envoltorio JSON,
identidad y fechas; la validación exhaustiva de métricas y versión también se
ejecuta en backend antes de escritura y lectura. No hay endpoints públicos.
La FK impide cambiar identidad/localía de un fixture con observaciones: una
corrección de identidad requiere un procedimiento explícito, no cascada silenciosa.

`readStatistics` consulta un solo fixture/proveedor en una única lectura.
`statisticsView` ordena por fecha y selecciona la última observación que conserva
todas las métricas previamente conocidas. Puede incorporar valores corregidos,
incluido cero, pero nunca fusiona métricas de fechas distintas. Un parcial con
pérdida de cobertura se conserva en historial y no sustituye el conjunto útil.
Un parcial inicial puede mostrarse como parcial. Observaciones vacías/fallidas
no rejuvenecen el dato anterior, que pasa a stale. Se exponen por separado
`updatedAt`, `lastObservedAt` y `lastObservationStatus`.

TTL obligatorio del consumidor, sin valor predeterminado ni scheduler. La ficha
usa `statistics-policy.json`: 6 horas como advertencia inicial de antigüedad,
independiente de fixtures. No promete actualización cada seis horas.
Empates de timestamp, corrupción, desajuste de identidad o lectura fallida dan
error/Sin datos. Límite explícito de 100 observaciones por fixture; se solicitan
101 para detectar exceso y fallar, nunca seleccionar sobre historia truncada.
Resolver consulta transaccional/paginación antes de ingesta frecuente.

Pruebas:

```powershell
node .tools/npm/bin/npm-cli.js test
node --conditions=react-server tests/database/statistics-migration.mjs
```

La segunda utiliza el PGlite local existente en `.tools/db-validation`; no
requiere credenciales ni modifica Supabase. Usa la muestra real solo como datos
de prueba, con fecha sintética histórica para verificar restricciones SQL.

Operación disponible en `scripts/import-team-statistics.mjs`: recibe archivo de
muestra, UUID estable y --dry-run/--apply. Ambos modos leen equipo y fixture en
DB, restringidos a la competición/temporada del ámbito revisado. El primero no
escribe; el segundo inserta mediante el almacenamiento validado. Ninguno llama
a BSD ni renueva la fecha de la muestra. Repetir con el mismo archivo y UUID.

Para registrar un intento fallido guardado, el archivo debe contener
`failed: true`, `event_id` numérico y `fetched_at`, sin `body`. No acepta el error
crudo como payload. El comando no ejecuta sincronizaciones ni captura fallos de
un proceso externo automáticamente; una muestra inválida falla antes de DB y
un fallo de DB sale con código sanitizado, sin fingir auditoría persistida.

Dry-run remoto 25/09: muestra 223728 vinculada al fixture
`5862b5d0-c7c9-4c75-964a-e8690910141d`, estado complete, observación histórica
24/09 20:32:25.838Z. Cero escrituras/requests al proveedor. Consulta GET de
preflight a la tabla devolvió 404/PGRST205; migración remota pendiente. Un HEAD
previo no devolvió error estructurado y no se usó para acreditar disponibilidad.

Actualización posterior del 25/09: GET remoto devolvió 200 y tabla vacía. Se
insertó la muestra con UUID `64a6d4f6-8b4f-40b5-88d4-dc8cde1f1327` y se leyó
mediante readStatistics: stale, fecha original conservada, tiros locales 5,
rojas visitantes 0. No se ejecutó DDL ni nuevas consultas BSD desde esta tarea.
La disponibilidad del esquema no acredita por sí sola todos los permisos.

`statisticsViewForMatch` recibe el partido resuelto previamente por fixtureView;
no expone lectura pública arbitraria. La ficha distingue error/ausencia, muestra
datos parciales con null como Sin datos, fuente y antigüedad independiente.
Otros proveedores quedan sin estadísticas hasta contar con cobertura implementada.
