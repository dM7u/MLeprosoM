# Escala y selección de standings — 29/09/2026

## Resultado y decisión

El crecimiento de revisiones y la validación de lotes denegados dominan los casos
medidos. 5000 revisiones de un solo lote requieren 102 consultas/~108,6 MB JSON.
100 lotes, con los 99 posteriores denegados, requieren 103 consultas/~18,7 MB.
1000 lotes con solo el primero revisado requieren 22 consultas/~426 KB.
La cantidad de lotes por sí sola no describe el costo de una visita.

Se mantiene ingesta manual. El siguiente bloque debe definir un contrato propio
de lectura coherente por ámbito y selección validada para lotes/revisiones antes
de implementar optimización. No se cambia runtime, SQL remoto ni permisos aquí.

## Método reproducible

```powershell
node --conditions=react-server tests/database/standings-volume.mjs docs/research/standings-volume-20260929.json
```

PGlite en memoria, migraciones reales, readStandingsSet y constructores reales de
lotes/revisiones. Sin red, .env, proveedor ni Supabase. Estructura del catálogo y
transcripción guardados en officialReviewSample: 30 equipos y siete selecciones.
Se generan copias de prueba con UUID/fechas de ensayo; no son nuevas evidencias
oficiales ni observaciones deportivas. Ninguna se publica. Preparación de tablas
como administrador efímero y lecturas/probes como service_role.

Tres ejes aislados:

- 0/1/100/1000 lotes completos, solo el primero revisado y habilitado.
- 1/100/1000/5000 revisiones habilitantes de un mismo lote.
- 1/10/100 lotes revisados; primero habilitado, posteriores con última revisión
  denegada. Fuerza recorrido de candidatos y fallback al primero como stale.

Tres repeticiones por escenario: 33 lecturas. Se exige resultado completo estable,
IDs y fechas originales, 30 filas anuales, siete vistas y posiciones oficiales
null. Se cuentan por separado metadatos, revisiones y payloads de lote recuperados.
Los filtros SQL/rangos/columnas del adaptador respetan las llamadas del lector.
No se simula que una consulta de metadatos transfiera un lote completo.

En cada escenario no vacío, fuera de las mediciones de tiempo/bytes reportadas,
se verifica TTL de evidencia vencido, inserción de denegación antes de la reconsulta
final y denegación visible en la siguiente lectura: 30 probes adicionales.
La inserción controlada usa conexión serializada; no es ensayo de carreras nativas.

## Resultados

| Eje | Tamaño | Consultas metadatos | Consultas revisiones | Payloads lote | Bytes JSON | Mediana local ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Lotes; solo primero revisado | 0 | 1 | 0 | 0 | 2 | 1.36 |
| Lotes; solo primero revisado | 1 | 1 | 2 | 1 | 197242 | 57.16 |
| Lotes; solo primero revisado | 100 | 1 | 2 | 1 | 219913 | 48.33 |
| Lotes; solo primero revisado | 1000 | 10 | 11 | 1 | 426040 | 105.65 |
| Revisiones de un lote | 1 | 1 | 2 | 1 | 197242 | 65.32 |
| Revisiones de un lote | 100 | 1 | 2 | 1 | 2343736 | 197.39 |
| Revisiones de un lote | 1000 | 1 | 20 | 1 | 21857138 | 1730.38 |
| Revisiones de un lote | 5000 | 1 | 100 | 1 | 108582858 | 8167.71 |
| Lotes; posteriores denegados | 1 | 1 | 2 | 1 | 197242 | 45.97 |
| Lotes; posteriores denegados | 10 | 1 | 2 | 10 | 1874841 | 420.84 |
| Lotes; posteriores denegados | 100 | 1 | 2 | 100 | 18650800 | 4278.95 |

Bytes JSON UTF-8 sin compresión; metadatos/revisiones como arrays y lote como objeto.
No incluyen cabeceras ni metadatos count HTTP. No son tamaño de almacenamiento DB.
Tiempo incluye SQL embebido, serialización y validación/recomputación JS; excluye
preparación, red, TLS, PostgREST, pooler y concurrencia. Tres repeticiones comparten
cachés y no certifican percentiles ni SLO remoto. No se mide memoria máxima.

Se llega a 1000 lotes y 5000 revisiones, no a 5000 lotes. Son ejes separados, no
prueba del producto cartesiano de ambos historiales. Tampoco se mide todo el HTTP
de Home ni varias visitas simultáneas. Los probes agregan una revisión por escenario
solo después de sus tres lecturas medidas. No medir preparación evita atribuir a
una visita el costo de fabricar los lotes y evidencias sintéticos.

## Reglas que condicionan la optimización

El código actual primero lee metadatos de todos los lotes del ámbito, luego todas
sus revisiones en grupos de hasta 100 IDs. Ordena lotes por data_as_of y generated_at.
Para cada completo revisado, recupera y recalcula lote y última revisión antes de
aceptar o descartar. Tras elegir uno, relee todo su historial de revisiones.

- La revisión más reciente manda, incluso si deniega. Filtrar primero por activated
  resucitaría aprobaciones revocadas.
- Empates de revisiones contradictorias y de orden de lotes fallan cerrados; UUID
  solo ordena transporte. No se introducen desempates deportivos.
- Un lote posterior denegado/no revisado/incompleto permite otro lote aprobado como
  stale, sin rescatar una aprobación anterior del mismo lote.
- La vigencia se calcula al leer, usando el menor TTL actual/guardado; conservar
  fechas de resultados, revisión de calendario y evidencia. No persistir fresh fijo.
- Las siete selecciones comparten un contexto por petición, sin cache global.
- La reconsulta detecta cambios del candidato hasta ese punto. No garantiza un
  snapshot común de todos los lotes/revisiones del ámbito. Una lectura atómica
  futura deberá declarar su punto de corte y cubrir ambos escritores.
- El lector actual valida profundamente candidatos visitados y sus últimas
  revisiones; no valida todos los payloads históricos descartados. No atribuirle
  la garantía de validación de prefijo usada por proyecciones de detalle.

## Próximo contrato técnico, aún pendiente

Definir selección por provider/competition/season con invalidación ante inserciones
de lotes y revisiones, incluidas denegaciones y retroactivos. Precisar integridad,
ambigüedad, fallback stale y errores antes de escoger una RPC o proyección persistida.
Evaluar lectura de revisiones relevantes sin transferir todas las evidencias y
cómo evitar recalcular todos los lotes denegados en cada visita, conservando la
validación necesaria. Cualquier estado persistido exige corte coordinado de ambos
escritores, reconstrucción y equivalencia con el lector vigente.

No copiar chosen/last de detalle: aquí hay dos historiales relacionados y la
revocación puede cambiar qué lote anterior se sirve. El siguiente bloque es el
contrato y contraejemplos verificables, seguido de implementación local acotada;
no aplicar migraciones ni cambiar modos de lectura por este benchmark.

33 lecturas y 30 probes aprobados; lint del script y diff verificados. Se conservan
202 pruebas, tipos/build del bloque previo porque no cambia runtime. Ratings,
promedios y desempates pendientes quedan fuera de alcance.
