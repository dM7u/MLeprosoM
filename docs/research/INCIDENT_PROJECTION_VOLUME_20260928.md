# Volumen de lectura de eventos con proyección — 28/09/2026

## Método

```powershell
node --conditions=react-server tests/database/incident-projection-volume.mjs docs/research/incident-projection-volume-20260928.json
```

PGlite en memoria, migraciones reales y propuesta de eventos aplicada solo en esa
base efímera. Sin .env, red, Supabase ni proveedores. Datos de prueba derivados de
la estructura BSD guardada, fechas sintéticas de 2020 y created_at fijo posterior
a las observaciones. No representan nueva evidencia deportiva. Preparación masiva
como administrador local; reconstrucción y lectores como service_role.

0/1/100/1000/5000 observaciones. Cinco terminaciones para tamaños positivos:
lista válida de 22 eventos, lista de 21 sin el gol, parcial con tipo desconocido,
empty y failed. Tres pares por escenario, alternando orden: 63 pares/126 lecturas.
Resultados completos de ambos lectores idénticos. Comprobaciones adicionales de
estados, updatedAt, lastObservedAt, payload entero, orden y cobertura unverified.
El caso corto no recupera el gol retirado; partial sustituye la lista entera;
empty/failed retienen fecha y lista útil previa. Sin lista útil, empty queda empty
y failed queda error. Fechas comparadas por instante frente al input sintético:
PostgreSQL puede representar el mismo instante con otro offset.

Se usan normalizador, lectores y escritor reales. El bootstrap se mide aparte:
replay completo sin observaciones nuevas, lectura inicial y una RPC de commit.
Cada lectura posterior exige una sola RPC, cero consultas históricas y cero commits.

## Volumen

| Observaciones | Última | Consultas historial | Bytes historial | RPC proyección | Bytes proyección |
| ---: | --- | ---: | ---: | ---: | ---: |
| 0 | Ninguna | 1 | 2 | 1 | 194 |
| 1 | Válida | 1 | 5082 | 1 | 10414 |
| 1 | Más corta, gol retirado | 1 | 4865 | 1 | 9980 |
| 1 | Parcial | 1 | 649 | 1 | 1548 |
| 1 | Vacía | 1 | 522 | 1 | 744 |
| 1 | Fallida | 1 | 363 | 1 | 585 |
| 100 | Válida | 1 | 508101 | 1 | 10416 |
| 100 | Más corta, gol retirado | 1 | 507884 | 1 | 9982 |
| 100 | Parcial | 1 | 503668 | 1 | 1550 |
| 100 | Vacía | 1 | 503541 | 1 | 5856 |
| 100 | Fallida | 1 | 503382 | 1 | 5697 |
| 1000 | Válida | 10 | 5081010 | 1 | 10417 |
| 1000 | Más corta, gol retirado | 10 | 5080793 | 1 | 9983 |
| 1000 | Parcial | 10 | 5076577 | 1 | 1551 |
| 1000 | Vacía | 10 | 5076450 | 1 | 5857 |
| 1000 | Fallida | 10 | 5076291 | 1 | 5698 |
| 5000 | Válida | 50 | 25405050 | 1 | 10417 |
| 5000 | Más corta, gol retirado | 50 | 25404833 | 1 | 9983 |
| 5000 | Parcial | 50 | 25400617 | 1 | 1551 |
| 5000 | Vacía | 50 | 25400490 | 1 | 5857 |
| 5000 | Fallida | 50 | 25400331 | 1 | 5698 |

Con 5000 filas: 50 páginas/~25,4 MB frente a una RPC/1,55–10,42 KB. Reducción
superior al 99,95 % del JSON medido. Tamaño dependiente de chosen/last y sus listas,
no de todo el historial. Desde 100 a 5000 filas varía un byte de contador en estos
casos. Chosen=last se devuelve en ambas propiedades; no se afirma ahorro con
historial vacío o una fila. No es un límite absoluto si crece la lista de eventos.

## Tiempo local y reconstrucción

| Última, 5000 filas | Mediana historial (ms) | Mediana proyección (ms) | Bootstrap (ms) |
| --- | ---: | ---: | ---: |
| Válida | 2959.47 | 1.56 | 2911.74 |
| Más corta, gol retirado | 2827.45 | 1.58 | 2950.08 |
| Parcial | 2683.63 | 0.91 | 2763.70 |
| Vacía | 2936.91 | 1.17 | 3178.97 |
| Fallida | 2784.80 | 1.17 | 2842.78 |

Bootstrap conserva 5000 filas/50 páginas, además de lectura inicial y commit RPC.
El ahorro corresponde a lecturas posteriores. Los tiempos incluyen SQL embebido,
serialización y validación JS; excluyen preparación, red, HTTP/TLS, PostgREST,
pooler y concurrencia. Tres repeticiones con cachés compartidas no certifican
percentiles, SLO ni latencia remota. Bytes JSON UTF-8 sin compresión, sin cabeceras
ni conteos HTTP. No se mide memoria máxima, planes remotos, append ni retroactivos.
Concurrencia tiene evidencia propia en INCIDENT_CONCURRENCY_20260928.md.

## Cierre y siguiente bloque

63 pares aprobados; lint del script y diff verificados. Sin cambio de runtime,
configuración ni DB remota: se conservan las 202 pruebas, tipos y build previos.
Queda cerrada la medición local de los tres recursos de detalle. Ingesta manual;
no habilita scheduler ni cambia cuota o la lectura histórica de Home.

Siguiente bloque de la cola: evaluar costo y reglas de selección/revisión de
standings con volumen representativo, antes de decidir una optimización propia.
No trasladar automáticamente el contrato de detalle a tablas. Ratings, promedios
y desempates pendientes siguen fuera de alcance.
