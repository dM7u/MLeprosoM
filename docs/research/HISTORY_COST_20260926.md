# Costo e aislamiento de lecturas de historiales

Medición de solo lectura el 26/09/2026. Resultados sin payloads ni secretos en
`history-read-cost-20260926.json`. Se usaron los cuatro lectores reales con
Supabase JS instalado y configuración privada local. Fixture BSD 223728 y tabla
anual del ámbito configurado en reviewed-primary-scope.json; TTL vigentes.

## Muestra observada

| Servicio | GET | Bytes JSON decodificado | Tiempo total observado |
| --- | ---: | ---: | ---: |
| Standings anual | 4 | 221096 | 1822 ms |
| Estadísticas | 1 | 956 | 208 ms |
| Alineaciones | 1 | 5767 | 261 ms |
| Eventos | 1 | 5591 | 284 ms |

Dos GET adicionales resolvieron fixture/equipos para preparar el contexto de la
medición. Nueve GET en total, sin escrituras ni proveedores. Cada historial tiene
una fila en este alcance, según Content-Range; no es el conteo global de la DB.
Los cuatro lectores devolvieron datos stale. La lectura no renueva observaciones.

Se midió una sola ejecución secuencial de cada servicio, incluyendo red,
decodificación, validación local y copia de respuesta para medir bytes. No son
percentiles, benchmarks del servidor, tiempo SQL ni bytes facturados de red.
La ficha ejecuta los tres detalles en paralelo; no sumar estos tiempos como
latencia de página. Tampoco se midió aquí la lectura conjunta de fixtures.

## Qué crece

Detalle: se descarga y revalida todo el historial de cada recurso. Con páginas
completas de 100 filas, N observaciones requieren max(1, ceil(N/100)) requests;
un límite inferior del servidor aumenta el número. Tráfico y memoria crecen con
el payload histórico; el ordenamiento por fecha agrega costo de CPU. El límite
de 1000 páginas es defensivo, no una capacidad de producción certificada.

Standings: se recorren metadatos de todos los lotes, revisiones agrupadas en
filtros de 100 IDs, payloads de candidatos inspeccionados y todas las revisiones
del candidato final nuevamente. No existe un tope global de requests equivalente
al de un solo recorrido. Con un lote/revisión hay cuatro GET; su payload ocupa
195435 bytes de los 221096 medidos. El lector revalida por recálculo ese payload.

Home (`src/app/page.tsx`) obtiene primero anual y luego otra selección cuando
se pide Apertura/Clausura. En el caso observado de un lote aprobado, eso implica
ocho GET de standings, además de fixtures, y repetir el payload/revisiones.
Es una deducción del código, no una medición de navegación ni de ocho GET remotos.

## Decisión técnica

La muestra actual no justifica afirmar capacidad para ingesta frecuente o vivo.
Mantener cargas deportivas manuales. El job de salud es independiente: solo lee
un ID, no incorpora observaciones ni recorre historiales.

Siguiente bloque acotado recomendado: reutilizar la lectura/validación del lote
en una misma petición de Home para producir anual y torneo con el mismo contexto.
Debe conservar validación de todas las revisiones, denegaciones, TTL y selección;
sin cache global que pueda mantener una aprobación revocada entre peticiones.
No se implementó en esta evaluación.

Antes de automatizar escrituras frecuentes, diseñar selección transaccional de
candidatos/revisiones o un corte coherente equivalente. El conteo entre páginas
detecta inserciones dentro de un recorrido append-only, pero no convierte todos
los recorridos en una transacción. La reconsulta final acota revocaciones, sin
evitar una posterior a esa consulta. Dos lecturas de Home pueden ver cortes distintos.
No quitar la comprobación final para ahorrar un GET ni seleccionar solo la última
observación: se perderían retención y denegaciones. Una futura solución debe
probar concurrentemente inserciones, revisiones retroactivas y revocaciones.

No se fija presupuesto de latencia ni frecuencia de ingesta con esta muestra
única. El siguiente diseño debe medirse con volumen representativo en entorno
local/aislado; no insertar historia sintética en producción.
