# Propuestas SQL pendientes

Estos archivos NO forman parte del conjunto activo `supabase/migrations/` y NO
se deben ejecutar mediante el procedimiento habitual de carga del proyecto.
Son propuestas locales con cambios de permisos que requieren corte coordinado.

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
activación remota de lectura/reconstrucción ya implementadas localmente, auditoría
administrativa y prueba multi-conexión. También revisar disponibilidad del nombre
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
No se encontró PostgreSQL nativo ni Docker en PATH o instalación PostgreSQL bajo
Program Files en este equipo; el ensayo real de dos conexiones sigue pendiente.
