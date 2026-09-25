# Alineaciones BSD — 25/09/2026

Estado vigente: tabla confirmada por usuario y GET remoto HTTP 200; muestra
223728 importada con UUID `6b1cf1e5-50a6-489d-98b3-7300c6dcb7f5`. Lector y ficha
HTTP verificados: 11 titulares y 12 suplentes por lado, atribución BSD y fechas
conservadas. Sin nuevas consultas al proveedor. El PGRST205 descrito más abajo
es histórico y está resuelto; certificación administrativa completa de permisos
remotos sigue pendiente. Revisión visual de ficha completada a 390×844 y
1280×900; no equivale a una auditoría integral de accesibilidad.

Una consulta nueva a `events/223728/lineups/`, mediante el cliente existente.
Platense–Newell's: confirmed, beta=false; 11 titulares y 12 suplentes por lado.
La muestra `bsd-lineups-223728-20260925.json` conserva solo identidad, nombres,
posición declarada, dorsal, capitán, formación y fechas. fetched_at es el momento
de recepción; updated_at proviene de BSD. No se renueva la muestra del 24/09.

La respuesta completa presenta un suplente también en unavailable_players.
No se usa esa lista para inferir bajas médicas ni se publica en este bloque.
Tampoco se conservan ai_score, confidence ni short_name: se usa el nombre completo
de la fuente. No se contrastó independientemente con una planilla oficial nueva.

## Implementado

`normalizeLineups` valida evento y equipos/localía contra IDs esperados,
fechas, jugadores duplicados entre ambos equipos y banco, tipos y listas.
Solo confirmed con beta=false permite publicar datos normalizados. Predicted
o beta devuelve unavailable sin jugadores; estado desconocido falla cerrado.

Campos opcionales ausentes quedan null. Banco ausente no equivale a banco vacío.
Menos de once titulares o banco desconocido produce partial; no se completa XI.
Más de once titulares se rechaza. No infiere posiciones ni esquema desde el orden.
La marca confirmation=provider significa confirmado por BSD, no verificado
directamente contra una fuente oficial. IDs externos se conservan como strings.

CLI de replay `scripts/check-lineups.mjs`: archivo + IDs de evento/local/visitante
+ --dry-run. No red, credenciales, DB ni escrituras. Los IDs esperados deben venir
del fixture revisado; este CLI no acredita por sí mismo su vínculo a Supabase.

## Verificación y próximo bloque

Cuatro pruebas nuevas: muestra real, exclusión de predicciones, datos parciales,
identidad/duplicados/fechas. 107 pruebas totales, lint, tipos y build aprobados.
Replay de la muestra: complete, 0 requests, 0 writes.

Actualización posterior: persistencia local implementada en
`src/server/db/lineup-observations.mjs` y migración
`20260925000200_lineup_observations.sql`. La migración depende de la anterior
de estadísticas para la clave compuesta del fixture. FK adicionales verifican
IDs externos de equipos y localía, no solo que los UUID existan. RLS privado,
service_role con SELECT/INSERT, UUID/fecha estables para retries. Predicciones
se guardan sin jugadores como unavailable; nunca actualizan observaciones previas.

Validación exhaustiva del payload en backend mediante renormalización;
restricciones SQL verifican envoltorio e identidad. No hay tabla de jugadores.
Las FK impiden correcciones silenciosas de identidad de equipos con evidencia
guardada: deben resolverse mediante una operación administrativa explícita.

110 pruebas, lint, typecheck y build; prueba PostgreSQL local de FK, permisos,
RLS, retries e historial intacto después de una predicción. Ejecutar con
`node --conditions=react-server tests/database/lineups-migration.mjs`.

Actualización posterior: importación `scripts/import-lineups.mjs`, lector
`read-lineups.mjs` y UI preparados. Dry-run remoto de la muestra completo.
Usuario informa migración ejecutada, pero GET de lineup_observations devuelve
404/PGRST205: no se hizo apply. El lector selecciona última confirmada completa
sin retroceder fecha de actualización de fuente. Primera parcial puede mostrarse;
parciales posteriores no reemplazan el conjunto útil ni se mezclan. Predicciones
solo dejan registro de intento excluido. Toda retención advierte stale.

TTL inicial de advertencia de 6 h en `lineup-policy.json`, sin scheduler.
Límite de 100 observaciones; corrupción, ambigüedad o exceso falla cerrado.
114 pruebas, lint, tipos, build y HTTP de estado error aprobados. Mostrar datos
reales y revisar visualmente continúa pendiente de habilitar tabla y cargar.

Reutilizar el
patrón de observaciones inmutables, pero exigir también IDs externos de equipos
y tratar una predicción posterior como intento no habilitado, sin sobrescribir
la confirmada ni renovar su fecha. No crear estadísticas ni historial contractual
de jugadores a partir de esta muestra. Eventos requieren su bloque específico.
