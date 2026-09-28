# Volumen de lectura de estadísticas con proyección — 28/09/2026

## Método

```powershell
node --conditions=react-server tests/database/statistics-projection-volume.mjs docs/research/statistics-projection-volume-20260928.json
```

Base PGlite en memoria, migraciones reales y SQL de proyección aplicado localmente.
Sin .env, red ni Supabase. Payloads sintéticos a partir de la estructura guardada
de BSD, con fechas de prueba de 2020. No son nuevas estadísticas deportivas.
Las inserciones masivas y TRUNCATE son exclusivamente preparación administrativa
de esa base efímera. La reconstrucción y las lecturas se ejecutan como service_role.

Historiales de 0, 1, 100, 1000 y 5000 filas. Para cada tamaño positivo se ensayan
última observación útil y última failed. El caso vacío se ensaya una vez. Tres
pares de lecturas por escenario, alternando cuál lector se ejecuta primero:
27 pares / 54 lecturas. Se comparan los resultados completos, estados y fechas;
se exige una sola RPC sin consultas históricas en el lector de proyección.

El bootstrap se mide por separado: ejecuta el escritor real sin observación nueva,
valida el historial completo y publica la proyección. Su costo no se oculta dentro
de la preparación ni se atribuye a una visita. No se mide aquí costo de append,
retroactivos o escritores concurrentes; esos casos tienen pruebas propias.

## Resultados de volumen

| Observaciones | Última observación | Consultas historial | Bytes historial | RPC proyección | Bytes proyección |
| ---: | --- | ---: | ---: | ---: | ---: |
| 0 | Ninguna | 1 | 2 | 1 | 194 |
| 1 | Útil | 1 | 892 | 1 | 2034 |
| 1 | Fallida | 1 | 367 | 1 | 589 |
| 100 | Útil | 1 | 89101 | 1 | 2036 |
| 100 | Fallida | 1 | 88576 | 1 | 1511 |
| 1000 | Útil | 10 | 890910 | 1 | 2037 |
| 1000 | Fallida | 10 | 890285 | 1 | 1512 |
| 5000 | Útil | 50 | 4454550 | 1 | 2037 |
| 5000 | Fallida | 50 | 4454125 | 1 | 1512 |

Con 5000 filas, reducción estructural de 50 consultas a una y más del 99,95 % del
JSON transferido por el adaptador. Cuando chosen=last, la RPC devuelve esa fila en
ambas propiedades: el mayor tamaño frente a un historial de una fila es esperado.
No se afirma ahorro para historiales vacíos o de una sola observación. El tamaño
de la proyección depende de los payloads elegidos, no de todo el prefijo histórico;
el contador agrega como máximo unos dígitos en estos escenarios.

## Tiempo local y costo de reconstrucción

| 5000 observaciones | Mediana lector histórico | Mediana proyección | Bootstrap (una ejecución) |
| --- | ---: | ---: | ---: |
| Última útil | 806,54 ms | 0,95 ms | 835,03 ms |
| Última fallida | 791,52 ms | 0,95 ms | 812,93 ms |

Bootstrap leyó las 5000 filas/50 páginas y publicó mediante una RPC de commit,
además de su lectura inicial de proyección. Mantiene el costo del replay completo
cuando se reconstruye; la mejora corresponde a las lecturas posteriores.

Tiempo incluye SQL embebido, serialización para medir bytes y validación JS.
Excluye preparación de filas, red, TLS, PostgREST, pooler y concurrencia. Tres
repeticiones con cachés compartidas no permiten estimar percentiles, SLO ni
latencia remota. No se midió memoria máxima ni planes de ejecución de Supabase.
Bytes: JSON UTF-8 sin compresión, arreglos de filas históricas frente al envelope
completo de la RPC. Conteos/cabeceras HTTP quedan fuera. Las representaciones de
timestamps y created_at pueden variar frente a otros ensayos; usar la comparación
pareada de este reporte, no diferencias entre ejecuciones previas.

## Decisión

La proyección de estadísticas activada conserva el resultado y limita la lectura
a un corte acotado. Se mantiene ingesta manual y no se habilita polling por estos
números. El siguiente bloque es extender el mecanismo a alineaciones, conservando
sus reglas de completitud y fecha de fuente, seguido de eventos. Ambos requieren
su propia transición de permisos y verificación antes de activarse. Standings
continúa separado por sus reglas de selección y revisión.
