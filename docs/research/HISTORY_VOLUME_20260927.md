# Volumen local de historiales de detalle — 27/09/2026

Ejecución reproducible, sin red, variables privadas ni conexión a Supabase:

```powershell
node --conditions=react-server tests/database/history-volume.mjs docs/research/history-volume-20260927.json
```

El destino JSON es opcional. Requiere el PGlite aislado ya instalado en
.tools/db-validation. Crea una base en memoria, aplica las migraciones y usa
SELECT como service_role. Los TRUNCATE se limitan a esa base efímera.

## Método y alcance

Tres lectores reales: estadísticas, alineaciones y eventos. Historiales de
1, 100, 1000 y 5000 observaciones por partido/recurso; tres recorridos secuenciales
por escenario. Clones sintéticos de la estructura de muestras guardadas, IDs y
fechas de prueba en 2020; no son observaciones deportivas reales adicionales.
No se escriben esos clones en archivos ni en Supabase. La última observación
se hace failed/predicted cuando hay más de una; se comprueba retención de la
anterior con su fecha, última fecha observada y estado stale.

El adaptador local implementa el contrato usado por los lectores (select/eq/
order/range), no PostgREST. Conteo y página salen del mismo SELECT SQL. El contador
pages mide consultas al adaptador, no requests HTTP. Se comprueba recorrido
completo, IDs ordenados y conteos. El caso 1000 se repite con cap servidor 25:
40 páginas frente a 10, sin truncamiento ni cambio de fecha retenida.

Tiempo incluye SQL embebido, serialización para contar bytes y validación del
lector; excluye preparación/inserciones, HTTP, TLS, red y concurrencia remota.
No es una medición de latencia Supabase, un SLO, ni percentiles de producción.
Las tres repeticiones comparten base/cachés y se ejecutan en orden fijo; no usar
los tiempos para afirmar mejoras entre motores. No se midió memoria máxima.
Los bytes son JSON UTF-8 de páginas, sin cabeceras ni compresión; la representación
SQL de timestamps difiere de la Data API y del muestreo remoto del 26/09.

## Resultados con 5000 observaciones

| Recurso | Páginas de 100 | Bytes JSON por recorrido | Mediana local (3 recorridos) |
| --- | ---: | ---: | ---: |
| Estadísticas | 50 | 4453625 | 958,43 ms |
| Alineaciones | 50 | 26379658 | 3012,43 ms |
| Eventos | 50 | 25419931 | 3250,25 ms |

Las tres lecturas suman 150 páginas y 56253214 bytes JSON. Es suma de trabajo y
volumen, no latencia de ficha: la aplicación consulta los detalles en paralelo.
Alineaciones/eventos dominan este escenario por sus listas. El historial completo
se vuelve a transferir y revalidar aunque casi todas las observaciones coincidan.
Los resultados y las tres repeticiones de cada escenario están en el JSON adjunto.
Los 45 recorridos terminaron con las comprobaciones aprobadas.

## Decisión y siguiente diseño

Mantener ingesta manual. La paginación evita truncamiento, pero no resuelve costo
ni aislamiento; aumentar pageSize reduciría viajes sin reducir bytes/validación.
No sustituir lectores por ORDER BY fecha DESC LIMIT 1: el caso fallido final de
esta prueba perdería lastKnownGoodData. Tampoco eliminar validación del historial
sin trasladar sus invariantes a una frontera de escritura comprobada.

Antes de sincronización frecuente, diseñar una proyección validada/versionada por
fixture/recurso, actualizada atómicamente junto con la observación mediante una
única operación de escritura. Preservar observación seleccionada, última observada,
estado de refresco y fechas originales; reglas distintas por recurso. Para impedir
que una escritura directa deje la proyección desactualizada, habrá que resolver
permisos, transición de importadores e idempotencia antes de migrar.

La selección debe leer un corte único. Requerirá pruebas de dos escritores,
fallos/rollback, correcciones, inserciones retroactivas y equivalencia con replay
completo, además de reconstrucción auditada del historial existente. No se eligió
ni implementó aún un mecanismo de lock/RPC ni se amplió acceso remoto.

Standings y sus revisiones tienen otra política: quedan fuera de este benchmark.
Su aislamiento y volumen siguen pendientes de medición propia. Este bloque no
habilita vivo, scheduler, ni certifica capacidad con muchos partidos/usuarios.
