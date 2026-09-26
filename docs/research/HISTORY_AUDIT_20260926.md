# Contraste de catálogos de historiales — 26/09/2026

Los cinco resultados administrativos fueron aportados por el usuario desde
`supabase/check-history-access.sql`. No hubo conexión ni escrituras remotas del
agente. Eventos y estadísticas se recibieron como texto completo en la conversación;
los tres adjuntos originales se conservan en los archivos `*-audit-20260926.json`.

| Tabla | Columnas | Constraints recibidos | Índices válidos | Resultado |
| --- | ---: | ---: | ---: | --- |
| standings_batches | 14 | 14 | 3 | Coincide |
| standings_official_reviews | 10 | 8 | 2 | Coincide |
| team_statistics_observations | 10 | 7 | 2 | Coincide |
| lineup_observations | 12 | 9 | 2 | Coincide |
| incident_observations | 10 | 7 | 2 | Coincide |

Todos los constraints recibidos están validados. Las cinco tablas son ordinarias,
de public, propiedad de postgres, con RLS activo y sin políticas adicionales.
Los privilegios efectivos auditados de anon/authenticated están denegados;
service_role solo tiene SELECT/INSERT, sin UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
Se contrastaron también tipos, nulabilidad, defaults, claves y checks de payload.

Standings conserva la FK al ID/hash del lote. Su único trigger de usuario,
`standings_activation_complete`, está habilitado (`O`), BEFORE INSERT por fila.
La definición completa de `check_standings_activation` coincide: search_path
pg_catalog/public, búsqueda por ID/hash y estado complete, rechazo mediante
STANDINGS_BATCH_NOT_COMPLETE. Las otras tablas no tienen triggers de usuario.

Los tres adjuntos se compararon programáticamente contra el catálogo PGlite
creado con todas las migraciones versionadas. Se normalizaron CRLF/LF dentro
de la función. El catálogo local enumera además constraints NOT NULL: se verificó
cada uno contra `columns.not_null` remoto antes de excluir esa representación
redundante de la comparación. No hubo otras diferencias. Estadísticas y eventos
se contrastaron directamente con sus migraciones, campo por campo.

Se cierra el pendiente de contraste de los campos exportados para los cinco
historiales. Esto no certifica todo el proyecto Supabase: la consulta no exporta
ACL de funciones, otros roles, ownership efectivo de esos roles, configuración
de API ni definiciones completas de las tablas fixtures/teams referenciadas.
Tampoco prueba aislamiento entre peticiones ni escala de lectura. No se deben
reaplicar migraciones ni habilitar cargas automáticas por este resultado.
