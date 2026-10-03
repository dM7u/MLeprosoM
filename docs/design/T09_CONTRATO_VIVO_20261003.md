# T09 — Contrato del primer corte de datos en vivo

Revisión técnica: 03/10/2026. Especificación para implementación local;
**ningún scheduler, SQL ni endpoint remoto fue activado por este documento**.
La cuota quedó comprobada con una lectura real. La elección de ejecución
autónoma en Supabase o supervisada en PC fue consultada al PO; la propuesta
base es Supabase. Los contratos de datos/exclusión siguientes sirven en ambos.

## 1. Alcance y evidencia

- Fixture permitido: el que se habilite expresamente por identidad persistida,
  proveedor, competición, temporada y equipo seguido. Para el ensayo actual:
  BSD 223765, liga 85, temporada 1635, Newell's 4997–Lanús 785.
- Una lectura GET de detalle el 03/10 a las 10:41 UTC dio HTTP 200,
  `notstarted` y kickoff 20:00 UTC. Cabeceras: cuota 7.500/día, restante
  informado 7.500, reinicio en 47.907 s. No se infiere si el contador incluye
  esa misma petición ni se promete que siga disponible después.
- Evidencia sin credenciales: [cuota](../research/T09_BSD_CUOTA_20261003.json).
  El ensayo previo [Independiente–Instituto](../research/T09_BSD_EN_VIVO_20261003.md)
  acredita `1st_half`/`1T`, marcador, alineación, eventos y estadísticas en una
  muestra. No acredita todas las fases de Newell's–Lanús.
- El detalle trae `current_minute`, no `minute`. No entrega `updated_at` en la
  muestra actual: registrar fecha de consulta y dejar actualización de origen
  desconocida. Consultar recientemente no garantiza que BSD haya actualizado.

El primer corte muestra estado, minuto recibido, marcador, XI confirmado,
suplentes, incidencias y estadísticas disponibles. Ratings, rankings propios,
fotos e históricos de árbitro no bloquean el vivo: sus paneles muestran
`Sin datos` hasta sus tareas correspondientes. No inferir jugadores en cancha
de sustituciones incompletas: distinguir XI inicial de equipo actual.

## 2. Ejecución recomendada

Supabase Cron revisa cada 30 s si existe una sesión habilitada y vencida; solo
entonces invoca una Edge Function mediante pg_net. La función toma el lock y
hace un ciclo corto; no duerme entre ciclos. Secrets de BSD y del job quedan
en servidor; token de invocación privado en Vault. Una clave publicable no
autoriza sincronizar. Validar token y método antes de consultar DB/proveedor.
No recibir URL, IDs libres ni frecuencias desde el navegador.

[Supabase documenta Cron por segundos](https://supabase.com/docs/guides/cron)
y [la invocación de Edge Functions con pg_net/Vault](https://supabase.com/docs/guides/functions/schedule-functions).
Verificar extensiones y runtime del proyecto antes de activar. Vercel sirve
la UI y lee Supabase; no necesita un cron de su plan. En
[Vercel Hobby el cron es diario](https://vercel.com/docs/cron-jobs/usage-and-pricing),
por lo que no es el disparador propuesto para este refresco.

El runner de PC, si se elige, respeta la misma sesión/lock/presupuesto y requiere
equipo encendido. Nunca pueden habilitarse dos coordinadores independientes
para la misma cuenta/fixture. No depende de este chat ni de una automatización
de Codex. La implementación debe validar el bundle Deno: los módulos actuales
con `server-only` y `process.env` no se importan a Edge sin adaptar sus fronteras.
Compartir normalización pura; no duplicar reglas deportivas en dos runtimes.

## 3. Cadencia y límites de trabajo

Decisiones técnicas iniciales configurables en una única política versionada:

| Situación verificada | Operaciones | Siguiente consulta |
| --- | --- | --- |
| Antes de kickoff | Verificación puntual al armar; otra a T−15 min para horario/teamsheet | Primer sondeo de inicio al kickoff verificado |
| Sigue NS desde kickoff | Solo detalle | 150 s; detener a +30 min y requerir revisión del horario |
| 1H/2H/ET/P | Detalle primero; luego alineación, incidencias y estadísticas | 150 s desde inicio del ciclo, sin recuperar ticks perdidos |
| HT | Solo detalle para detectar salida | 150 s; recursos deportivos pausados |
| FT observado | Persistir FT; consultar recursos pendientes de cierre | Máximo 3 intentos por recurso a 150 s; luego cierre completo/parcial |
| Aplazado/cancelado/abandonado/suspendido | Persistir el estado | Detener; rearmado explícito tras nueva evidencia |
| Estado desconocido o contradictorio | Conservar crudo y marcar estado no confirmado | Solo detalle a 300 s, máximo 3 intentos; luego detener |

HT no se convierte en 2H por haber pasado quince minutos. Se pausa la consulta
de recursos, manteniendo solo el sondeo de fase: esta precisión resuelve el
despertar pendiente en `DATOS_EN_VIVO.md`. El cron de 30 s introduce hasta un
tick de demora nominal, además de red/proveedor; no es una garantía de latencia.

- Timeout HTTP: 20 s. Un intento por recurso/ciclo, secuencial. Adaptar el
  cliente compartido con una opción explícita; preservar los dos intentos que
  usan los comandos manuales actuales. Nada de reintentos ocultos en vivo.
- Ciclo: deadline 100 s y lease 120 s; no iniciar HTTP sin al menos 25 s de
  lease restante. Cortar por deadline y registrar recursos pendientes.
  Compatible como objetivo con el
  [límite de 150 s de Edge Free](https://supabase.com/docs/guides/functions/limits);
  medir CPU/bundle y configurar también timeout de pg_net.
- Ventana dura: hasta kickoff +4 h. No inferir FT al vencer; cerrar sesión
  como incompleta y conservar último dato. Si cambia kickoff antes de empezar,
  recalcular la ventana a partir del dato validado; cambio durante juego se revisa.
- Techo propio: 500 intentos BSD por sesión, 1.000 diarios UTC para el worker,
  reserva de cuenta de 500. Cada intento reserva presupuesto en DB antes del GET;
  una reserva sin respuesta también cuenta. No usar `sync_runs` como contador
  atómico ni reembolsar un timeout cuyo consumo real se desconoce.
- A 150 s, 90 minutos activos son aproximadamente 36 ciclos ×4 =144 consultas;
  más inicio, HT, cierre y errores. Son estimaciones, no uso observado. Los
  topes y la ventana son límites efectivos incluso si hay reinicios del worker.

BSD publica cuota diaria y cabeceras `RateLimit`/`RateLimit-Policy`, además de
un límite por IP. Parsear sus Structured Fields con una librería compatible,
validando scope y rangos. Conservar la muestra fechada; no confiar en un saldo
como garantía futura. Si faltan cabeceras, no suponer saldo cero ni ilimitado:
mantener el techo local y registrar cuota no informada. Los detalles y
significado de `429` están en [las convenciones BSD](https://sports.bzzoiro.com/docs/conventions/).

## 4. Exclusión, recuperación y escrituras

Una sesión por fixture con `enabled`, identidad fija, `next_due_at`,
`lease_owner`, `lease_until`, contador monotónico `fence`, presupuesto gastado,
fase, intentos de cierre y último resultado. Los nombres son esquema propuesto,
no tablas/RPC ya existentes. Una fila de presupuesto diario se comparte por
cuenta BSD, sin guardar el token como identificador.

1. **Claim atómico en DB:** con reloj de PostgreSQL y bloqueo de fila, comprobar
   habilitación, ventana, vencimiento, backoff, límites y lease libre/expirado.
   Asignar UUID de dueño, incrementar `fence` y fijar lease 120 s. Solo uno gana.
2. **Reserva de intento:** misma identidad/dueño/fence y lease vigente; incrementar
   contadores de sesión/día en transacción antes de cada GET. Orden de locks
   consistente: presupuesto diario → sesión → recurso. Si DB falla, no consultar BSD.
3. **Commit por recurso:** volver a validar dueño/fence/lease bajo lock dentro
   de la misma transacción que escribe el snapshot y su metadato. Sin llamada
   HTTP dentro de la transacción. Un dueño expirado no publica ni cambia fase,
   cuota observada, errores o `next_due_at`, aunque su respuesta llegue tarde.
4. **Finalizar ciclo:** liberar solo el lease propio y calcular el próximo
   vencimiento bajo el mismo fence. Repetir un commit confirmado devuelve el
   resultado ya guardado; mismo ID con contenido distinto es conflicto.
5. **Muerte del proceso:** conservar reservas y commits hechos. Tras expirar el
   lease, otro dueño retoma recursos pendientes; no depende de un `finally`.
   Ningún reinicio resetea ventana, presupuesto ni cantidad de intentos finales.

La garantía es exclusión del dueño autorizado y rechazo de escrituras tardías.
No prometer «exactamente un GET»: un proceso pausado puede reanudar cuando una
petición ya salió o su lease venció. El resultado se descarta y el consumo sigue
acotado por reservas. No mantener locks de conexión/advisory entre llamadas
PostgREST independientes.

## 5. Persistencia y datos parciales

Agregar solo control de sesión/presupuesto y snapshots operativos por
`fixture_id + recurso` necesarios para el vivo. Cada snapshot conserva:
último intento/código/fecha, última respuesta válida completa o parcial,
última completa si existe y fechas de origen/consulta por separado.

No escribir el catálogo `fixtures` desde este worker en el primer corte. El
servicio de lectura aplica el snapshot vigente del fixture sobre el catálogo
guardado. Así el importador manual antiguo no puede sobrescribir el estado
vivo. Validar el binding de ambas fuentes y no renovar las fechas de otros partidos.
No duplicar el historial completo: el cierre posterior puede incorporarse por
los importadores `--storage=projection`, con idempotencia, en una tarea explícita.

Reutilizar normalizadores y validación de identidad; no usar como selector de
vivo `historySelectionView` sin cambios. Su política histórica puede conservar
una observación completa anterior. En vivo se presenta el último payload válido
con sus nulls; ante error se conserva el último válido indicando stale. La copia
completa anterior se mantiene para inspección, sin rellenar huecos y mezclar tiempos.

**Alineaciones v2 para el vivo:** conservar jugadores sin ID externo como
entradas locales del snapshot, con `external_id:null`, lado, grupo e índice de
origen. Esa ubicación sirve para renderizar, jamás como identidad deportiva.
No unir por nombre, no agregar al XI histórico por titularidades ni enlazar a
ratings. Marcar parcial, conservar nombre/dorsal que pasen validación y un issue
explícito. IDs presentes inválidos o duplicados siguen siendo error; no tratarlos
como ID ausente. Probar el roundtrip completo de la nueva versión. El contrato v1
histórico queda intacto y no acepta silenciosamente la nueva forma.

`unavailable` con `lineups:null` es falta legítima de datos. `predicted`/beta se
excluye de confirmado. Si una alineación confirmada pasa a unavailable, mostrar
la última confirmada con su fecha y aviso; no presentar una predicción como sustituta.

## 6. Estados, frescura y errores

NS (`notstarted` observado), 1H (`1st_half`/`1T` observado) y FT (`finished` ya
usado en históricos) tienen evidencia. El catálogo público usa también nombres
generales como `live`; no prueba los códigos específicos HT/2H/ET/P del detalle.
Es requisito de implementación revisar esquema/muestras para esas equivalencias,
conservar crudos y rechazar combinaciones contradictorias. Nunca calcular fase
por minuto ni minutos jugados por reloj del teléfono.

TTL operativo propuesto: 360 s por recurso consultado en fase activa. El sondeo
de HT solo actualiza el estado: recursos pausados mantienen su fecha sin afirmar
que se actualizaron. Alineación inicial confirmada es válida para ese partido,
pero no acredita quién sigue en cancha. Error posterior fuerza stale aun dentro
de TTL. Estado activo para navegación predeterminada requiere snapshot reciente
y sin fallo posterior; el servidor y el cliente deben hacer vencer ese estado,
sin mantener el semáforo activo indefinidamente en una pestaña abierta.
El estado FT verificado se conserva al terminar; la completitud de recursos y
fecha del cierre siguen visibles, sin presentarlo como sincronización continua.

- Fallo de detalle: abortar recursos del ciclo. Fallo de un recurso: conservar
  los demás, marcar el afectado y reintentar solo cuando le corresponda.
- Timeout/5xx: backoff 150, 300, 600, 900 s; reiniciar tras éxito. Respetar
  `Retry-After` si exige más. Error de auth: deshabilitar sesión y registrar código.
- 429: persistir pausa compartida de cuenta; esperar el plazo de cabecera.
  Si falta o es inválido, 15 min y máximo tres respuestas 429 antes de deshabilitar.
  No mantener una función dormida. Error de JSON/identidad: no publicar; tres
  fallos consecutivos del recurso requieren revisión, sin resetear por reinicio.
- Resultado puede corregirse hacia abajo (VAR): no imponer monotonicidad del
  marcador. Regresión de fase requiere revisión; no reabrir FT automáticamente.
- Logs: fixture, ciclo, intento, recurso, latencia, resultado, cuota y frescura;
  ninguna credencial, header Authorization o cuerpo de error externo.

## 7. Seguridad, pruebas y salida

RLS y permisos de sesiones/snapshots: sin lectura/escritura directa para
`anon`/`authenticated`. Worker usa RPC con validación de fence; revocar escritura
directa al rol invocador sobre esas tablas. Funciones con search_path fijo,
inputs acotados y privilegios mínimos. Vercel solo lee DTOs deportivos filtrados;
no serializa control, tokens ni datos de cuota. Preparar rollback por `enabled=false`,
invalidación de fence y desactivación de cron; conservar snapshots/evidencia.

Antes de activación deben pasar:

1. Pruebas con reloj controlado de NS→1H→HT→2H→FT, ET/P, suspensión, desconocido,
   cambio de kickoff, reloj futuro, pérdida de campos y gol anulado.
2. Pruebas de presupuesto/reservas, reinicio, cambio UTC y 429 compartido.
3. PostgreSQL real: dos claims simultáneos, expiración con respuesta tardía,
   muerte antes/después de commit, replay conflictivo y permisos públicos denegados.
4. Payload v2 con suplente sin ID, ausencias válidas y predicción excluida;
   compatibilidad de módulos compartidos con Node y bundle Edge.
5. UI leyendo exclusivamente DB: navegación activa vence con TTL; error/parcial
   por panel; cero GET a BSD originados por visitas.
6. Preflight de entorno y ensayo remoto autorizado. Activación de SQL/secrets/job
   y publicación son pasos posteriores; no afirmar vivo operativo por este diseño.

Estado local 03/10: [SQL propuesto](../../supabase/pending/live_session_control.sql)
para sesiones, presupuesto, reservas y snapshots. Sin aplicación remota ni
activación. Pasaron pruebas locales de restricciones/ACL/lease/fence, otra con
dos conexiones PostgreSQL reales y ocho pruebas de normalización de fixture y
alineaciones parciales. Los normalizadores están en `src/server/live/` y solo
promueven a fase activa las combinaciones BSD ya observadas. HT/2H/ET/P aún
requieren contraste de códigos reales antes de activarse.

Faltan worker Supabase, integración de recursos, política completa de backoff,
preflight/auditoría remota y UI que lea snapshots. Las pruebas enumeradas arriba
son criterios del corte completo; este bloque verificó solo control SQL y
normalización inicial. Siguiente bloque T09: worker/backend y contrato de
lectura, con Sol ligero; Astra revisa concurrencia/seguridad antes del corte
remoto.

### Avance local de lectura Home

`LIVE_HOME_ENABLED` permanece en `false` por defecto. Con la bandera activada,
el servidor consulta solo `live_sessions` y el snapshot persistido de `fixture`
para fixtures BSD ya presentes en el catálogo. Verifica identidad, fase y edad
máxima de 360 s antes de reemplazar los paneles de Home; una pestaña visible
refresca la lectura cada 150 s. Un snapshot final válido se superpone al catálogo
para que el partido terminado no vuelva a figurar como próximo, aun si el
intento posterior falla. No consulta BSD desde la visita.

El panel vivo inicial muestra marcador y minuto recibidos; estadio, árbitro,
XI, estadísticas y suplentes quedan en `Sin datos` hasta conectar snapshots de
esos recursos. La tabla viva no se activó ni se aplicó SQL remoto, por lo que
este flujo todavía no puede verse con datos reales. Falta comprobar el flujo
completo con worker, SQL, pruebas de Safari y cierre FT antes de habilitar la
bandera o publicar el corte.
