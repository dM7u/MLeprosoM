# Selección atómica de historiales de detalle

Estado 27/09/2026: contrato y primera integración local de estadísticas probados.
Propuesta SQL en supabase/pending/, sin aplicar; lectores paginados e importadores
actuales siguen siendo el camino operativo. Ver actualización al pie.
Alcance: estadísticas, alineaciones y eventos BSD por fixture. Standings,
revisiones editoriales, actualización de fixtures y polling quedan fuera.

## Semántica que se conserva

| Recurso | Reemplaza selección | Conserva selección anterior |
| --- | --- | --- |
| Estadísticas | Primera útil; luego una observación que conserve todas las métricas no null de ambos lados | failed, empty o pérdida de alguna métrica conocida |
| Alineaciones | Primera no unavailable; después solo complete, si source_updated_at no retrocede ni desaparece cuando ya era conocido | unavailable, partial posterior, revisión de fuente anterior/desconocida |
| Eventos | Cada available/partial reemplaza la lista entera, incluso más corta | empty o failed |

`last` es la observación de mayor observed_at, aunque no aporte datos. `chosen`
es la elegida por el replay ordenado. No fusionar payloads, no desempatar por UUID,
no transformar null en cero. Estado stale/partial/empty/error y TTL se calculan
al leer usando los selectores/dataState existentes y el reloj de esa lectura.
No guardar una aprobación fresh permanente. updatedAt y lastObservedAt mantienen
fechas originales. Alineaciones unavailable sin chosen sigue empty; failed sin
chosen de estadísticas/eventos sigue error: no homogeneizar esas diferencias.

## Por qué no basta un puntero a la última fila

Contraejemplo ejecutable en tests/history-projection-contract.test.mjs:
A(t20) aporta tiros; B(t30) aporta corners y es rechazada por perder tiros;
C(t40) es vacía. La selección es A. Llega X(t10), con corners: el replay completo
rechaza A y selecciona B. Si solo se conservaron A y C para reducir con X, B ya
no está disponible y el resultado difiere. El historial inmutable es necesario
para reconstruir después de inserciones retroactivas.

También se prueba que una fila histórica corrupta no puede desaparecer de la
validación por seleccionar una posterior sana. El estado resumido solo es válido
si todo el prefijo que representa fue validado por la versión declarada.

## Estado persistido propuesto

Una proyección privada por recurso/fixture, con versión del contrato/reductor,
generación monotónica, cantidad de observaciones validadas, ID chosen nullable,
ID last nullable y marca de reconstrucción validada. IDs referencian el mismo
historial/fixture; el tipo concreto de recurso debe tener FKs verificables, no
una referencia polimórfica sin integridad. No duplicar el payload en la proyección.
El esquema físico se prepara en la implementación local, sin tabla genérica
anticipada ni cambios a los historiales existentes hasta probarlo.

Generación identifica publicaciones confirmadas del estado, no reloj, UUID ni
fecha deportiva (incluye bootstrap/corrección de proyección; ver implementación). El estado vacío también tiene identidad/generación estable.
El contador se incrementa una vez por observación nueva, no por reintento.
Una versión desconocida, proyección incompleta o referencia ausente falla cerrada.

## Escritura compare-and-swap

1. Backend valida la observación con el normalizador existente; lee proyección,
   chosen y last de un único corte. No acepta contenido editorial ni de usuario
   como resultado del reductor.
2. Si observed_at es estrictamente posterior a last y la versión está vigente,
   calcula candidato con chosen/last/nueva mediante la misma regla compartida.
   Deduplicar chosen=last antes de reducir. No copiar la lógica en SQL y JS.
3. Si es retroactiva, no hay proyección inicializada o cambia versión, leer y
   validar historial completo bajo generación G; incluir la nueva observación
   en replay. No reducir retroactivos solo desde chosen/last. Una colisión de
   observed_at de UUID distinto es conflicto, nunca prioridad por UUID.
4. Una RPC privada, en una transacción, serializa la fila de proyección (incluida
   su creación concurrente), verifica generación esperada G, UUID/idempotencia,
   pertenencia de IDs, versión y restricciones; inserta observación y actualiza
   la proyección juntas. Si falla cualquier paso, rollback de ambos.
5. Un cambio de generación devuelve conflicto reintentable sin insertar. El
   escritor relee/recalcula con el mismo UUID y contenido; máximo tres intentos
   por ejecución antes de error sanitizado. No consulta de nuevo al proveedor.
   Un retry ya persistido se compara antes del CAS y devuelve replay aunque G
   haya avanzado; no modifica contador, selected ID, fechas ni orden.

En la reconstrucción, paginación existente comprueba conteos; CAS detecta cualquier
inserción confirmada después del corte, incluso retroactiva. Bajo el contrato de
solo inserción, generación estable implica mismo conjunto. El bloqueo se retiene
solo durante commit, no durante requests HTTP ni validación de todo el historial.
No hace falta ni se permite una transacción abierta a través de varias Data API.

El backend operativo sigue siendo una frontera de confianza: actualmente puede
insertar payloads que solo el validador JS verifica en profundidad. La nueva RPC
no certificará por sí sola que un cliente privilegiado arbitrario ejecutó el
reductor. Se revocará DML directo y se limitará EXECUTE; la cuenta administrativa
siempre puede romper invariantes. Auditar esa intervención obliga a reconstruir.
No presentar un hash de contenido como prueba de ejecución correcta del reductor.

## Permisos y corte de lectura

Rol operativo: SELECT historiales y EXECUTE de funciones explícitas; sin INSERT
 directo ni UPDATE/DELETE/TRUNCATE de historial/proyección. RPC de escritura con
propietario controlado, permisos mínimos, search_path fijo, objetos cualificados,
sin SQL dinámico ni EXECUTE público. Si requiere SECURITY DEFINER, auditar alcance
antes de habilitarla; no otorgar ese privilegio a funciones de lectura por comodidad.
Las credenciales siguen solo en backend. Ninguna visita escribe o llama proveedores.

Lector obtiene versión, generación, selected/last y sus filas con un único SELECT
mediante RPC. Revalida esas filas y el contexto, calcula frescura al leer. Una
inserción después del SELECT se observa en la siguiente lectura. La ficha sigue
con tres cortes independientes por recurso; no promete transacción conjunta con
fixtures, standings o contexto de reprogramación.

Durante transición se conserva el lector completo como referencia/fallback de
versión no migrada. Una vez activada la proyección, corrupción/error de RPC se
muestra como error, sin rescatar silenciosamente una selección antigua. No hay
cache global de aprobación ni reprocesamiento de toda la historia en cada visita.

## Migración y verificación antes de activación

1. Implementar localmente reductores compartidos y equivalencia con selectores
   actuales, incluyendo matriz de nulls, partial, correcciones y fechas de fuente.
2. Preparar tablas/RPC/ACL locales y cambiar escritores a CAS; lectores nuevos
   detrás de selección explícita, sin activación automática por existencia SQL.
3. Para el corte remoto, pausar importaciones, drenar escritores existentes y
   aplicar migración/revocación con bloqueo que excluya INSERT en curso. Verificar
   que scripts antiguos fallan sin insertar. No dejar dos caminos de escritura.
4. Reconstruir bajo generación controlada con evidencia del replay completo. Una
   fila inválida impide activar su ámbito. Comparar proyección contra lector actual;
   habilitar por ámbito solo tras conteo/versión y lectura equivalentes.
5. Rollback funcional: volver a lector paginado conservando escritor atómico e
   historia; no reabrir INSERT directo ni borrar observaciones/proyecciones para
   evitar una incompatibilidad. La reconstrucción debe ser repetible/idempotente.

Pruebas de salida: dos escritores compitiendo por misma generación y por raíz
vacía; retry tras timeout de commit y tras avance de generación; UUID conflictivo;
error posterior a INSERT revierte todo; retroactivos que cambian chosen; timestamps
iguales; corrupción histórica; versiones distintas; privilegios públicos y DML
directo; equivalencia del resultado completo incluyendo fechas/estados; reconstrucción
interrumpida. PGlite serializado no certifica carreras multi-conexión: añadir ensayo
PostgreSQL aislado con dos conexiones antes de afirmar esa propiedad operativa.

Repetir benchmark con 1/100/1000/5000 filas comparando resultados, bytes y páginas.
La meta estructural es una lectura acotada por recurso independiente del tamaño
del historial; no se fija un SLO de latencia con el benchmark local anterior.
Nada de este diseño habilita scheduler, cambia cuota ni implementa ratings.

## Reductor compartido implementado — 27/09/2026

history-selection.mjs concentra selección/replay/presentación, versión 1.
Los tres lectores existentes conservan validación completa de cada fila antes
 de reducir; recorrido paginado y escrituras no cambian. appendHistorySelection
acepta únicamente estado/filas previamente validados dentro del backend: no es
un deserializador seguro ni reemplaza validación de una futura RPC/proyección.
Rechaza timestamps iguales, retroactivos y versiones desconocidas. Replay ordena
una copia; append no muta estado ni fila. Conserva chosen, last y count.
La comparación chosen/last se hace por ID para soportar serialización JSON;
identidad/contenido del estado sigue requiriendo validación al hidratarlo.

Referencia de compatibilidad: tests/fixtures/history-selection-baseline.json,
capturada con los lectores anteriores al refactor (commit base 4da3835). Tres
hashes SHA-256 de 130 resultados completos por recurso, generados por los casos
 de tests/fixtures/history-selection.mjs: 390 salidas, dos TTL, permutación de
entrada y combinaciones de cobertura/fallos/revisiones. No regenerar la referencia
con el nuevo reductor para ocultar diferencias; cambios deliberados de contrato
requieren revisar salidas y versionar metodología. Además de hashes, los tests
comparan cada prefijo incremental con replay, ausencia de mutación y roundtrip JSON.
Pruebas previas mantienen casos explícitos de payload/fechas y errores.

Pendiente: validador de estado persistido, esquema/RPC/CAS, transición de permisos,
reconstrucción y prueba multi-conexión. No hay mejora de tráfico todavía: los
lectores actuales siguen leyendo/validando toda la historia.

## Primera integración local: estadísticas — 27/09/2026

Propuesta aislada en supabase/pending/statistics_history_projection.sql, excluida
 de migraciones activas. Implementación backend en statistics-projection.mjs;
ningún importador, lector de UI o scheduler la invoca automáticamente.

- read_statistics_projection devuelve proyección/chosen/last en una consulta SQL
  estable invoker; validateStatisticsProjection valida versión, contadores seguros,
  referencias, identidad y payload mediante el validador existente. Rechaza datos
  incompletos y selección incompatible con chosen/last; confía en validación del
  prefijo completo por el escritor. No acredita integridad de filas no devueltas.
- commitStatisticsSelection admite observación o null (reconstrucción explícita).
  Usa append validado o replay completo, hasta tres conflictos de generación.
  Errores de transporte sanitizados. Comparación de retry normaliza instantes
  equivalentes con distinto offset sin rejuvenecer observaciones.
- commit_statistics_projection usa rol dedicado y fila bloqueada. UUID idéntico
  puede reintentarse tras avance de generación; conflicto no sobrescribe. Conteo,
  last real y FK se verifican en SQL. Fallo tras INSERT revierte también la fila.
- Reconstrucción inicial publica generación 1 incluso sin observaciones. Por eso
  generación cuenta publicaciones del estado (bootstrap/corrección además de INSERT),
  no equivale a observation_count. Retry/reconstrucción idéntica no la incrementan.
  Solo versión 1 soportada; una versión desconocida falla, requiere migración futura.
- Exportación del validador de estadísticas permite reutilizar validación de payload;
  lectores actuales y resultados históricos conservan su comportamiento.

Prueba SQL aislada aprobada, incluyendo corte de DML directo, privilegios del dueño,
raíz vacía y conflictos serializados. 175 pruebas unitarias: entre ellas 130
comparaciones de proyección contra replay y fallos de hidratación/transporte.
Pendiente: integración de importadores, activación del lector, ampliación a otros
recursos y ensayo de concurrencia real. No aplicar el SQL hasta completar el corte.

## Integración explícita de importador — 27/09/2026

El CLI de estadísticas admite --storage=projection; history sigue siendo default
para la base vigente. No hay fallback entre escritores. previewStatisticsSelection
reutiliza validación y planificación, pero nunca invoca commit; devuelve generación
esperada y selección candidata. Apply recalcula: el preview no reserva ni aprueba
un estado futuro. La RPC de lectura se exige también antes de aceptar un retry,
aunque exista la observación histórica. Un retry no inicializa proyección pendiente.

Prueba SQL incorpora lookup acotado del importador real, preview sin mutaciones,
apply exclusivo mediante RPC y retry; los permisos impiden INSERT directo. Pruebas
unitarias cubren modo inválido, RPC faltante aun con UUID existente y flags CLI.
Pendiente activación del lector/reconstrucción operacional y concurrencia real.
No se activó esta opción remotamente ni se aplicó la propuesta SQL.

## Reconstrucción y lector configurables — 27/09/2026

rebuild-statistics-projection.mjs comparte lookup acotado con el importador y
reconstruye un evento explícito; preview sin commit, apply sin insertar historia.
Verificación post-commit compara replay completo entre dos lecturas de generación
estable, hasta tres intentos. Resultado separa commit y verificación fallida.
Un retry idéntico no cambia generación. La comprobación no certifica cambios
administrativos que rompan el contrato de inmutabilidad/CAS.

statistics-view.ts usa statistics-reader.mjs con STATISTICS_READ_MODE: history
por defecto; projection explícito, sin fallback. Ausencia de bootstrap es error,
no empty inventado. Un bootstrap válido sin observaciones sí es empty. Valor
inválido falla cerrado. UI no escribe, no reconstruye y no consulta proveedores.
Activación global para fixtures BSD servidos requiere reconstruir todos, incluso
vacíos; no existe allowlist por fixture. No se cambió .env.local ni el modo remoto.
La propuesta sigue pendiente de auditoría administrativa remota. La concurrencia
real local se verificó posteriormente como se detalla abajo.

## Concurrencia PostgreSQL verificada — 27/09/2026

PostgreSQL 17.11 portable: dos escritores independientes con bloqueos observados
mediante pg_blocking_pids. Diez escenarios aprobados, incluidos raíz inexistente,
CAS, UUID concurrentes, rollback, retry automático del backend, timestamps iguales
y respuesta descartada seguida de retry tras avance de generación. ACL 76/76.
Runner aislado y límites en docs/research/STATISTICS_CONCURRENCY_20260927.md.
Esto cierra el ensayo local pendiente de las notas anteriores; no certifica la
base remota ni activa la propuesta. Corte, auditoría y reconstrucción siguen pendientes.

## Estadísticas activadas localmente sobre Supabase — 28/09/2026

SQL aplicado por el propietario y auditoría administrativa 76/76 informada.
Reconstrucción remota de 32 fixtures del ámbito revisado, cero observaciones nuevas,
equivalencia completa y retry idempotente verificados por Data API. Configuración
local projection activa; 32 lecturas con una RPC cada una, 31 empty/un stale.
Evidencia: docs/research/statistics-activation-20260928.json. Esto reemplaza los
pendientes de activación de estadísticas de las notas anteriores; los demás
recursos siguen pendientes. No implica despliegue ni cambio de modo en otros entornos.
Nuevos fixtures requieren bootstrap explícito; visitas nunca reconstruyen.
