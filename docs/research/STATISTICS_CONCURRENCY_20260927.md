# Concurrencia de estadísticas — 27/09/2026

Ensayo aprobado en PostgreSQL 17.11 nativo para Windows, con `pg@8.23.0` y Node
24.21.0. No se ejecutó en Supabase. Datos sintéticos exclusivos de un cluster
local desechable; migraciones actuales y SQL pendiente aplicados desde el repo.

## Procedencia del motor

Archivo portable ofrecido por [EDB](https://www.enterprisedb.com/download-postgresql-binaries),
sin instalación global ni servicio Windows:
`https://get.enterprisedb.com/postgresql/postgresql-17.11-4-windows-x64-binaries.zip`.
SHA-256 calculado sobre la descarga:
`b9424ee7bc60b52450ff910a3630225df32e633f3cb29c1d126d9299d59aea28`.
Este hash registra el archivo usado, no es una firma/verificación independiente
del distribuidor. Binarios y cliente están bajo .tools, fuera de Git.

## Método y resultados

Runner: tests/database/run-statistics-concurrency.ps1. Ensayo:
tests/database/statistics-concurrency.mjs. Puerto loopback dinámico, autenticación
SCRAM, sin configuración del proyecto ni llamadas a proveedores. Antes de cambios
se verifica que data_directory coincide con el cluster propio y que está vacío.

Los escritores usan dos conexiones con pg_backend_pid distintos y SET ROLE
service_role. El primero retiene la transacción; el segundo debe aparecer bloqueado
por el primero en pg_blocking_pids antes de liberarla. Esto evita confundir una
intercalación serializada con concurrencia real. Un tercer lector verifica que
observación y proyección no son visibles antes de commit. Hay timeouts acotados.

| Caso | Resultado |
| --- | --- |
| Raíz inexistente y dos candidatos | Uno confirma; el segundo detecta generación cambiada y puede recalcular |
| Misma generación ya creada | Conflicto CAS sin pérdida de observaciones |
| UUID y contenido idénticos | Una inserción; segundo retorna replay |
| UUID idéntico y contenido diferente | Conflicto de idempotencia, sin sobrescritura |
| Primer escritor hace rollback | El segundo continúa y confirma su candidato |
| Error de conteo después de INSERT | Historia y proyección se revierten juntas |
| Backend completo ante bloqueo y CAS | Dos intentos; relee, recalcula y confirma automáticamente |
| UUID distintos con igual observed_at | Segundo rechazado tras conflicto, sin desempate por UUID |
| Respuesta descartada y conexión cerrada | Retry tras otra generación no duplica ni modifica estado |
| Observación retroactiva | Replay conserva equivalencia con lector completo |

76 controles ACL aprobados sobre el motor nativo. Tras los escenarios se compara
la salida completa del lector de proyección con statisticsView del historial.
El runner detiene el motor y elimina los dos archivos que contienen contraseña;
conserva datos sintéticos/logs ignorados para diagnóstico. No modifica runtime.

## Límites y siguiente paso

La respuesta descartada simula al consumidor que no conserva una confirmación;
no inyecta una caída real de red. El adaptador usa SQL con las mismas RPC y una
consulta por página/conteo, pero no certifica PostgREST, pooler ni fallos de red.
El ensayo usa READ COMMITTED predeterminado y no certifica otros aislamientos.
La equivalencia retroactiva que cambia la selección por métricas diferentes sigue
cubierta adicionalmente por la prueba SQL PGlite y los tests de contrato previos.

El SQL continúa en pending: falta auditar el catálogo/rol en destino, coordinar
el corte de escritores y reconstruir todos los fixtures BSD servidos antes de
activar STATISTICS_READ_MODE=projection. Esto no activa sincronización frecuente,
alineaciones/eventos ni standings. No hubo escrituras remotas ni datos inventados
en la aplicación.
