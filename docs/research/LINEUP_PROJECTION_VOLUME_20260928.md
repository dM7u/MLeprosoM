# Volumen de lectura de alineaciones con proyección — 28/09/2026

## Método

```powershell
node --conditions=react-server tests/database/lineup-projection-volume.mjs docs/research/lineup-projection-volume-20260928.json
```

PGlite en memoria, migraciones reales y SQL de alineaciones aplicado exclusivamente
en esa base efímera. Sin archivos de entorno, red, Supabase ni proveedores.
Payloads de prueba derivados de la estructura BSD guardada, con fechas sintéticas
de 2020; no representan nuevas observaciones deportivas. La preparación masiva y
TRUNCATE usan el administrador local; bootstrap y lecturas usan service_role.
created_at se fija al reloj del ensayo (posterior a todas las observaciones) para
que su precisión fraccionaria no introduzca diferencias ajenas al volumen.

0/1/100/1000/5000 observaciones; cinco terminaciones para tamaños positivos:
completa, parcial, predicted, fecha de fuente anterior y fecha ausente.
Tres pares por escenario, alternando el orden de lectores: 63 pares/126 lecturas.
Se compara el resultado completo y se comprueban estados, updatedAt,
lastObservedAt y source_updated_at, incluida su ausencia. Primera parcial se
muestra partial; predicted sin selección produce empty; los cuatro intentos no
elegibles posteriores conservan la alineación completa como stale.

Se utilizan normalizador, lectores, escritor de reconstrucción y RPC existentes.
El adaptador local cuenta páginas, filas y JSON UTF-8 serializado. Se exige una
RPC por lectura de proyección, sin consulta histórica ni commit. Bootstrap se
mide aparte, con replay completo y una publicación sin observaciones nuevas.

## Volumen

| Observaciones | Última | Consultas historial | Bytes historial | RPC proyección | Bytes proyección |
| ---: | --- | ---: | ---: | ---: | ---: |
| 0 | Ninguna | 1 | 2 | 1 | 194 |
| 1 | Completa | 1 | 5274 | 1 | 10798 |
| 1 | Parcial | 1 | 4284 | 1 | 8818 |
| 1 | Predicción | 1 | 582 | 1 | 804 |
| 1 | Fuente anterior | 1 | 5274 | 1 | 10798 |
| 1 | Fuente ausente | 1 | 5252 | 1 | 10754 |
| 100 | Completa | 1 | 527301 | 1 | 10800 |
| 100 | Parcial | 1 | 526311 | 1 | 9810 |
| 100 | Predicción | 1 | 522609 | 1 | 6108 |
| 100 | Fuente anterior | 1 | 527301 | 1 | 10800 |
| 100 | Fuente ausente | 1 | 527279 | 1 | 10778 |
| 1000 | Completa | 10 | 5273010 | 1 | 10801 |
| 1000 | Parcial | 10 | 5272020 | 1 | 9811 |
| 1000 | Predicción | 10 | 5268318 | 1 | 6109 |
| 1000 | Fuente anterior | 10 | 5273010 | 1 | 10801 |
| 1000 | Fuente ausente | 10 | 5272988 | 1 | 10779 |
| 5000 | Completa | 50 | 26365050 | 1 | 10801 |
| 5000 | Parcial | 50 | 26364060 | 1 | 9811 |
| 5000 | Predicción | 50 | 26360358 | 1 | 6109 |
| 5000 | Fuente anterior | 50 | 26365050 | 1 | 10801 |
| 5000 | Fuente ausente | 50 | 26365028 | 1 | 10779 |

Con 5000 observaciones: 50 páginas/~26,36 MB frente a una RPC/6,1–10,8 KB;
reducción de bytes superior al 99,95 %. La respuesta depende de las dos filas
seleccionadas, no del prefijo histórico. En estos casos, desde 100 hasta 5000 filas
solo cambia un byte del contador. Cuando chosen=last, la RPC incluye la misma
fila en ambas propiedades; por eso no se afirma ahorro con cero/una observación.

## Tiempo local y bootstrap

| Última, 5000 filas | Mediana historial (ms) | Mediana proyección (ms) | Bootstrap (ms) |
| --- | ---: | ---: | ---: |
| Completa | 3415.03 | 3.22 | 3472.13 |
| Parcial | 3628.18 | 1.58 | 3466.50 |
| Predicción | 3440.42 | 1.51 | 3693.46 |
| Fuente anterior | 3380.87 | 1.91 | 3412.07 |
| Fuente ausente | 3697.74 | 1.88 | 3747.07 |

Bootstrap conserva 5000 filas/50 páginas, lectura inicial de proyección y una RPC
de commit. El ahorro corresponde a las lecturas posteriores, no a reconstrucción.

Los tiempos incluyen SQL embebido, serialización y validación JS. Excluyen carga
de filas, HTTP, red, TLS, PostgREST, pooler y concurrencia. Tres repeticiones con
cachés compartidas no certifican latencia de ficha, percentiles ni SLO de Supabase.
Bytes sin compresión, sin cabeceras ni metadatos de conteo HTTP. No se midieron
memoria máxima, append, retroactivos, planes remotos ni escritores concurrentes;
la concurrencia tiene evidencia propia en LINEUP_CONCURRENCY_20260928.md.

## Decisión y verificación

63 pares aprobados; lint y git diff --check aprobados. Sin cambios de runtime:
no se repiten las 192 pruebas unitarias, typecheck y build del bloque previo.
La primera ejecución detectó variabilidad de created_at; la evidencia JSON
corresponde a la ejecución final completa con ese timestamp controlado.

La lectura de ficha queda respaldada a esta escala local. Home conserva historial
y no recibe este ahorro automáticamente. Ingesta manual, nuevos fixtures con
bootstrap explícito, importaciones con --storage=projection. No repetir SQL remoto.
Próximo bloque: proyección de eventos conservando reemplazo íntegro de listas,
con pruebas locales y su propia transición operacional antes de activarla.
Standings mantiene evaluación separada; ratings, promedios y desempates pendientes
siguen fuera de alcance. No se habilita scheduler ni se modifica configuración.
