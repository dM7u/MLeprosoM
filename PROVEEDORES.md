# Proveedores — MLeprosoM

## Estado del relevamiento (2026-09-17)

Investigación pública y primera tanda autenticada del Bloque 2. La clave funciona,
pero **Free rechaza la temporada 2026**. La respuesta indica acceso a 2022–2024.
Se detuvieron las pruebas dependientes. No se crearon tablas.

La documentación sirve para elegir qué probar; no certifica datos de la cuenta.
Se verificó el ID externo de Newell's (457) y el de su estadio informado (93).
No se confirmaron IDs de competiciones ni fixtures para la temporada objetivo.

## Evidencia autenticada — 2026-09-17 (UTC)

Tres solicitudes GET, secuenciales, sin reintentos. Clave leída desde `.env.local`
y enviada solo en la cabecera al host oficial; no se registró su valor.

| Hora UTC | Operación | HTTP | Resultado |
|---|---|---|---|
| 12:16:55 | `/status` | 200 | Plan Free activo; consumo 0/100; límite por minuto 10 |
| 12:17:06 | `/teams?search=Newell` | 200 | 3 coincidencias, 1 página; 99 consultas diarias restantes |
| 12:17:20 | `/leagues?team=457&season=2026` | 200 | `errors.plan`, cero resultados y sin cabeceras de cuota |

Mensaje de la tercera respuesta: `Free plans do not have access to this season,
try from 2022 to 2024.` El HTTP 200 no es éxito de datos. Tampoco demuestra que
Newell's no participe en competiciones de 2026: es una denegación del plan.

La búsqueda distinguió al primer equipo `Newells Old Boys`, Argentina, ID 457,
de U20 (18371) y Reserva (18691). El proveedor informa estadio Marcelo Alberto
Bielsa, ID 93, Rosario, capacidad 42.000. Son datos del proveedor, sin contraste
independiente, y el estadio habitual no demuestra el de un fixture concreto.

La consulta de estado no incrementó el contador visible; tras la búsqueda quedó
en 99. No se conoce el saldo posterior al rechazo porque no trajo cabeceras y
se detuvieron las consultas. No se probó todavía un año histórico: el rango
2022–2024 proviene del mensaje de restricción, no de una muestra de esos años.

## Fuentes oficiales y límites documentados

- [Precios](https://www.api-football.com/pricing): Free anuncia 100 requests/día,
  todos los endpoints y competiciones, con restricciones de temporadas. No
  confirma qué años admite esta cuenta. Pro anuncia USD 19/mes y 7.500/día;
  es una alternativa a evaluar solo si Free no cubre la necesidad, no una compra aprobada.
- [Rate limits](https://www.api-football.com/news/post/how-ratelimit-works): Free
  admite 10 requests/minuto. Cabeceras diarias: `x-ratelimit-requests-limit` y
  `x-ratelimit-requests-remaining`; por minuto: `X-RateLimit-Limit` y
  `X-RateLimit-Remaining`. Ante 429, espaciar solicitudes y aplicar backoff.
- [Condiciones del servicio](https://www.api-football.com/terms): en la cuenta
  directa del dashboard el reinicio diario ocurre a las 00:00 UTC; al agotar
  cuota se bloquea el acceso hasta el siguiente período. RapidAPI tiene otras
  condiciones: no mezclar credenciales, hosts ni reglas de facturación.
- [Catálogo de cobertura](https://www.api-football.com/coverage): incluye Liga
  Profesional Argentina, Copa Argentina y Copa de la Liga Profesional. Su
  presencia no demuestra participación actual de Newell's ni acceso Free.
- [Guía oficial](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide):
  base `https://v3.football.api-sports.io`, método GET y cabecera `x-apisports-key`.
  La cobertura se declara por competición/temporada y no garantiza cada partido.
- [Referencia v3](https://www.api-football.com/documentation-v3): el lector web
  no obtuvo contenido y la consulta directa devolvió una protección del sitio.
  Los endpoints siguientes se contrastaron con la guía oficial; las variantes
  de parámetros deberán verificarse con la referencia accesible y respuestas reales.

## Matriz inicial

Estado **D/P**: operación documentada / disponibilidad real pendiente de prueba.
Estado **N/V**: no verificado como dato directo; requiere investigación adicional.
Estado **V**: verificado en esta muestra. Estado **B**: bloqueado por el plan
para 2026; no equivale a ausencia del dato. El resto sigue pendiente.

| Necesidad | Operación documentada | Estado | Prueba o decisión propia de MLeprosoM |
|---|---|---|---|
| Identidad de Newell's | `/teams` | V | ID 457; Argentina; primer equipo diferenciado de Reserva/U20 |
| Competiciones y temporadas | `/leagues` | B | La cuenta Free deniega 2026; indica 2022–2024 |
| Próximos/últimos partidos | `/fixtures` | D/P | Consultar temporada objetivo, fechas y resultados reales |
| Fases y fechas | `/fixtures/rounds` | D/P | Comparar etiquetas con formato argentino; no inferir IDs de fase |
| Posiciones/zonas | `/standings` | D/P | Revisar todos los grupos, nombres y timestamps |
| Jugadores | `/players` | D/P | Primera página, paginación y estadísticas presentes |
| XI y suplentes | `/fixtures/lineups` | D/P | Partido terminado; no asumir probable XI |
| Rendimiento individual | `/fixtures/players` | D/P | Inventario de variables, unidades y nulos |
| Estadísticas del partido | `/fixtures/statistics` | D/P | Comparar campos de ambos equipos |
| Eventos | `/fixtures/events` | D/P | Secuencia y referencias a jugadores; revisar penales/rojas |
| Técnico | `/coachs` | D/P | Identidad y períodos; contrastar con alineaciones |
| Estadio | `/venues`, `/teams` | V parcial | Estadio habitual ID 93 recibido en teams; fixture sin verificar |
| Árbitro | Campo en `/fixtures` | D/P | Comprobar identidad disponible antes de crear entidad |
| Anual y promedios | Sin operación específica verificada | N/V | Inspeccionar tablas; derivar solo con reglas y partidos completos |
| Historial del árbitro | Sin operación específica verificada | N/V | Evaluar identidad y muestra; no extrapolar historial completo |
| Posible XI | Sin operación específica verificada | N/V | Alineación oficial no equivale a probable formación |
| Vivo efectivo | `/fixtures` y operaciones del partido | D/P | Requiere muestra durante un partido y acceso a esa temporada |

Fuentes de las operaciones: guía oficial y referencia v3 anteriores. La evaluación
de suficiencia, las pruebas y decisiones de la última columna son propias.
Si una fila falla, la alternativa inicial es `Sin datos`. AFA/LPF, club u otro
proveedor podrán investigarse después; no hay integración alternativa aprobada.

## Plan acotado de pruebas autenticadas

Usar exclusivamente la clave directa API-Sports en `.env.local`, nunca en
documentación, argumentos de comandos, URLs, navegador del producto ni Git.

1. Consultar `/status` para confirmar suscripción y consumo. Está documentado
   en las condiciones del servicio. Conservar solo metadatos de plan/cuota,
   omitiendo identidad personal y claves. No asumir que la consulta es gratuita
   hasta contrastar el contador.
2. Resolver Newell's mediante `/teams` y país. Obtener sus competiciones mediante
   `/leagues`; seleccionar la temporada objetivo explícitamente (2026 al realizar
   este relevamiento). Una temporada histórica accesible no valida la actual.
3. Leer flags por temporada y probar fixtures. Si el plan deniega el año objetivo,
   detener las pruebas dependientes y decidir entre un plan con acceso, otro
   proveedor o un prototipo histórico claramente rotulado.
4. Solo con acceso confirmado: elegir un partido terminado y uno futuro de la
   respuesta, inspeccionar standings completos y los detalles necesarios.
   Reutilizar cualquier información ya incluida antes de consultar suboperaciones.
5. Evaluar jugadores, técnico y estadio con el mínimo de consultas. Una página
   de jugadores es una muestra; no presentarla como plantilla completa.
6. Si no hay partido en curso, dejar la validación del vivo pendiente. Los datos
   posteriores al partido no demuestran que hayan estado disponibles en vivo.

Presupuesto inicial propio: máximo 15 consultas, secuenciales y separadas al
menos 7 segundos, ajustado hacia abajo si la cuota remanente es menor. Cada
reintento cuenta dentro del presupuesto. No paginar ni repetir automáticamente.
Con 401/403, restricción de plan o 429, detener el relevamiento y registrar la
causa; no agotar cuota intentando combinaciones al azar.

Registrar por prueba: fecha UTC, operación y parámetros no secretos, HTTP,
errores sanitizados, resultados/paginación, cabeceras de cuota, entidades
encontradas, campos presentes/nulos y alcance de la muestra. Un HTTP 200 por sí
solo no alcanza: comprobar errores del cuerpo, datos y paginación.

## Consecuencias para el diseño (análisis propio)

- No fijar todavía SQL, IDs externos o estructura Apertura/Clausura. Mantener
  el modelo conceptual y preparar el primer esquema después de las muestras.
- La tabla anual no será una suma automática de tablas de zonas. Primero
  validar qué partidos cuentan, las deducciones y reglas de la temporada.
- El rating del proveedor, si aparece, es externo. No se utilizará como rating
  propio ni como fórmula de “Jugador a putear”.
- Evaluar minutos, titularidad, posición, goles/asistencias, tiros, pases,
  duelos, recuperaciones, faltas, tarjetas y penales como variables candidatas.
  Su utilidad y disponibilidad se validarán; no se asignan pesos ni fórmulas.
- No convertir marcadores pendientes, estadísticas nulas o ausencia de
  información en cero. Separar ausencia legítima, parcialidad, error y falta
  de acceso al plan.

### Presupuesto del vivo: cálculo ilustrativo, no política aprobada

90 minutos activos × 60 / 150 segundos = 36 intervalos.

| Operaciones por intervalo | Consultas aproximadas |
|---|---:|
| Una | 36 |
| Dos | 72 |
| Cuatro | 144 |

No incluye inicio/final, descuento, alargue, XI, standings, reintentos ni otras
sincronizaciones. Con 100/día, cuatro operaciones por ciclo no caben. Verificar
si la consulta del fixture permite reutilizar detalle y cuál es su completitud;
no asumir un ahorro hasta verlo. La frecuencia definitiva sigue pendiente.

La pausa total en HT plantea otra decisión: cómo detectar la reanudación sin
seguir consultando. Diseñar un despertar programado y su control de estado
durante el bloque de vivo; no dar por resuelto HT→2H con datos históricos.

## Cierre pendiente

### Mapeo oficial de Newell's resuelto — 2026-09-17

Fuente: [agenda oficial LPF 2026](https://www.ligaprofesional.ar/?p=75980),
que enumera separadamente ambos fixtures. Se contrastaron sus 32 encuentros
de Newell's contra una consulta BSD de temporada 1635, limit 100, sin paginación
pendiente. Coincidencia exacta tras revisar alias de equipos, local/visitante
y número de jornada: **32/32, un único ID BSD por encuentro**, 16 por torneo.
No se utilizó kickoff para asignar torneo. El evento 223691 queda en Apertura
fecha 9 pese a su fecha de juego de mayo. Interzonales con Banfield y Central
quedan incluidos, aunque BSD los publique sin grupo.

Evidencia estructurada en `docs/research/newells-2026-competition-map.json`.
Es una instantánea de investigación, no configuración automática ni tabla de
posiciones. Cambios oficiales de fixture o IDs requieren revalidación; no
extrapolar a otras temporadas. La falta de separación BSD tiene solución para
estos partidos; siguen pendientes el resto de equipos, rankings, sanciones,
desempates y promedios. No se creó scraper de producción ni endpoint LPF.

### Estructura argentina BSD — 2026-09-17

Tres GET adicionales HTTP 200: `/api/v2/leagues/85/seasons/` y dos lecturas
de `/api/v2/events/?team_id=4997&season_id=1635&limit=100` para inspección
y comprobación aritmética. 32 IDs únicos, count 32, next null.
BSD separa temporadas Apertura/Clausura 2025 (1637/1636), pero solo devuelve
una temporada 2026 (1635). Las jornadas 1 del 24 de enero y 25 de julio
comparten stage group-stage y Group A: stage/round no identifica un torneo.
Cuatro encuentros (fechas 6 y 8 de ambas mitades) tienen league-phase y grupo
null; filtrarlos fuera eliminaría resultados.

Los 25 partidos finished suman 6 victorias, 10 empates, 9 derrotas, GF 25,
GC 35 y 28 puntos: coinciden con la fila de standings. Es acumulación anual
para esta muestra, no certificación de posición anual oficial.

El [reglamento LPF 2026, art. 24](https://www.ligaprofesional.ar/wp-content/uploads/2026/01/Reglamento-Torneos-LPF-Primera-2026-1.pdf)
define la general con las fases de zonas de ambos torneos, con desempates y
tratamiento específico del descenso. Concatenar grupos no verifica esa tabla.
La [guía BSD](https://goaldir.com/docs/football/competition-structure/) propone
agrupar stage/round, insuficiente para esta muestra argentina.

Decisión: conservar etiquetas crudas, permitir clasificación local pendiente
y exigir fuente/mapeo verificable contra fixture oficial antes de asignar
torneo. No deducirlo solo por calendario por posibles reprogramaciones.
Standings no homologado para Apertura, Clausura, anual ni promedios. Se puede
continuar el relevamiento de partidos, pero no publicar esas tablas ni cerrar
el Bloque 2. No se cambió código de producto o SQL.

### Prueba autenticada BSD — 2026-09-17

El usuario confirmó que reemplazó la clave anterior por BSD. Se renombró solo
esa variable de `.env.local` a `BSD_API_KEY`; no se imprimió ni versionó su valor.
Ocho GET de lectura, todos HTTP 200, sin reintentos ni paginación automática:

- `/api/v2/leagues/?country=Argentina`: una liga, ID 85; temporada actual
  1635, Primera LPF 2026. Primera cabecera RateLimit: football, restante 7500.
  Ese contador aislado no certifica cómo se contabilizan todas las consultas.
- `/api/v2/events/?team_name=Newell&season_id=1635&limit=2`: count 32;
  Newell's Old Boys ID 4997. Muestra futura con estado `notstarted`, scores null.
  No asumir orden ascendente: los dos primeros resultados eran de noviembre.
- `/api/v2/events/?team_id=4997&season_id=1635&status=finished&limit=1`:
  count 25; evento 223705, Newell's–Vélez, 2026-09-11, 1–1 según BSD,
  estado finished/FT. IDs de árbitro, estadio y técnicos presentes.
- `/api/v2/leagues/85/standings/?season_id=1635`: grupos A/B;
  Newell's aparece con played 25 y pts 28. No hay separación explícita
  Apertura/Clausura en la respuesta inspeccionada. No etiquetar esta tabla
  como Clausura ni anual oficial. La temporada combina fases y requiere análisis.
- `/api/v2/events/223705/lineups/`: confirmed, 11 titulares y 12 suplentes
  por equipo; bajas listadas; updated_at presente.
- `/api/v2/events/223705/player-stats/`: 46 registros, con minutos, pases,
  duelos, tarjetas y otras variables; existen nulls. Los ratings recibidos
  son del proveedor y no sustituyen el algoritmo propio.
- `/api/v2/events/223705/stats/`: estadísticas de equipos y tiempos,
  22 tiros en shotmap, 92 puntos de momentum; xg_estimated false en raíz.
  Diferencia observable para el local: expected_goals 2.05 y xg.actual 2.17;
  mantener procedencia y no fusionar campos como si fueran idénticos.
- `/api/v2/events/223705/incidents/`: 16 entradas.

Resultado: acceso real a temporada actual y detalle de una muestra confirmado;
exactitud independiente, cobertura histórica completa, vivo/HT→2T, tablas por
torneo, anual y promedios siguen sin certificar. La documentación usa upcoming
como filtro pero la respuesta contiene notstarted: normalizar desde evidencia.
No se implementó adaptador, SQL ni UI. Siguiente trabajo: resolver semántica de
competición y contrastar muestras antes de adopción definitiva.

### Alternativas gratuitas — revisión pública del 2026-09-17

Alcance: comparar acceso gratuito a Argentina actual sin registrar cuentas,
comprar planes ni cambiar código. Estas son declaraciones de los proveedores;
ninguna alternativa fue validada todavía con muestras autenticadas de Newell's.

| Proveedor | Evidencia pública | Evaluación para MLeprosoM |
|---|---|---|
| BSD / Bzzoiro Sports Data | [Cuota](https://goaldir.com/docs/conventions/): 7.500 requests/día gratis, reinicio UTC, uso razonable. [Cobertura](https://goaldir.com/football-coverage/): anuncia Liga Profesional argentina 2026, alineaciones, eventos y estadísticas. | Primer candidato para una prueba; falta verificar fixtures, zonas/tablas, actualidad y variables individuales de Newell's. |
| GOAL API | [Cobertura](https://goal-api.com/coverage): Liga Profesional con temporadas hasta 2026; [sitio](https://goal-api.com/) anuncia plan gratuito. | Segundo candidato. La página de precios no permitió recuperar la cuota gratuita; no confirmar viabilidad ni frescura todavía. |
| football-data.org | [Lista gratuita](https://www.football-data.org/coverage) sin Argentina. | No resuelve el objetivo sin pagar. |
| Sportmonks | [Plan gratuito](https://www.sportmonks.com/football-api/free-plan/) para Dinamarca y Escocia. | No resuelve Argentina gratis. |
| TheSportsDB | [Documentación](https://www.thesportsdb.com/documentation): respuestas gratuitas limitadas (15 eventos por temporada, 5 filas de tabla), vivo de pago. | Insuficiente como proveedor principal. |
| OpenFootAPI | [Sitio](https://openfootapi.com/): vista pública de hasta 5 resultados; acceso completo con clave de pago. | Demo, no base gratuita completa verificada. |

BSD documenta REST gratuito y WebSockets como complemento de pago: no confundir
consulta periódica con conexión continua. Su [licencia publicada](https://goaldir.com/docs/api-license/)
permite almacenamiento interno, visualización y resultados derivados, prohíbe
redistribuir datos brutos como servicio y separa derechos sobre imágenes.
Sin embargo, la versión visible 4.0 indica vigencia desde el **1 de octubre de
2026**, posterior a esta revisión: confirmar condiciones aplicables antes de
adoptarlo. Declara fuentes públicas, terceros y cálculos propios; no presentar
su contenido como datos oficiales de una federación.

Siguiente paso recomendado: cuenta gratuita de BSD mediante su
[registro](https://sports.bzzoiro.com/register/), clave guardada localmente
fuera del chat y prueba acotada de Newell's. Resolver IDs mediante búsquedas,
no reutilizar IDs de API-Football. Verificar temporada, próximos/últimos partidos,
tablas por fase/zona, un partido terminado y estadísticas individuales;
registrar faltantes y cuota. No cambiar provider, SQL ni polling antes de esa
evidencia. La recomendación de prueba no constituye selección definitiva.

La matriz no certifica cobertura de partidos actuales. La clave está configurada;
falta resolver el acceso a 2026. Opciones: evaluar un plan de pago de API-Football,
investigar otro proveedor para Argentina actual, o aceptar un prototipo histórico
rotulado como tal. No comprar ni cambiar el alcance sin decisión del usuario.
Tras resolverlo, repetir la consulta de acceso y continuar con las muestras.
La primera migración y el Bloque 3 permanecen pendientes.
