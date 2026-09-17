# Modelo de datos --- Movete, Leproso Movete!

## Estado

Modelo conceptual inicial. No representa todavía migraciones SQL
definitivas.

Actualización: primera migración mínima preparada y probada localmente en
`supabase/migrations/20260917000100_initial_football.sql`, todavía no aplicada
en Supabase. Incluye teams, competitions, seasons, fixtures y sync_runs.
La evidencia BSD habilita esta persistencia; las restricciones históricas de
API-Football descritas abajo ya no bloquean el almacenamiento de fixtures.
El resto de entidades y las tablas de posiciones siguen siendo conceptuales.

Antes de fijar tablas y columnas finales debe verificarse la cobertura
real de API-Football Free. El objetivo de este documento es definir
conceptos, relaciones y reglas que la persistencia deberá soportar.

## Principios

### Ajustes del Bloque 2 — pendientes de muestras autenticadas

El relevamiento y la matriz están en `PROVEEDORES.md`. La primera prueba
autenticada identificó Newell's y su estadio habitual, pero Free denegó 2026
e indicó 2022–2024. Hasta decidir cómo obtener la temporada objetivo y verificar
muestras de partidos/tablas, no se fija una migración SQL.

La primera persistencia candidata se limita a equipo, competición, temporada,
fixture y registro de sincronización, según lo que demuestren las respuestas.
Jugadores, ratings, noticias, clima e históricos no integran esa primera migración
por anticipación. Los conceptos que siguen describen el alcance futuro.

- Distinguir el año usado por el proveedor de la identidad interna de una
  temporada y de su formato competitivo. No hardcodear zonas ni participantes.
- Mantener etiquetas originales de ronda/grupo hasta validar su correspondencia
  con fase y zona. No asumir que la primera tabla recibida es la general.
- Preservar `provider` y `external_id`; no usar el nombre como identidad externa.
  Si el árbitro solo llega como texto, no fabricar un ID del proveedor.
- Separar hora del partido, momento de consulta y fecha de actualización de la
  fuente. Esta última puede ser desconocida y no debe inventarse.
- Un fixture futuro puede tener goles desconocidos. No imponer cero como valor
  predeterminado de marcador o estadísticas.
- Conservar todos los grupos y el alcance temporal de standings. La anual y
  promedios requieren una fuente validada o reglas explícitas antes de calcularse.
- Un rating externo no pertenece a `own_ratings`; no sustituye el algoritmo propio.
- Las tablas expuestas por Supabase requerirán permisos mínimos y RLS en la
  migración. El cliente administrativo no prueba que el acceso público sea seguro.

La migración se diseñará después de confirmar claves, nulos, estados, cobertura
y consultas reales. No hay tablas creadas ni cambios remotos en este bloque.

### Reglas generales

-   Identificadores internos independientes de proveedores.
-   Entidades externas con `provider`, `external_id` y timestamps.
-   Ausencia de dato ≠ cero.
-   Conservar procedencia y frescura.
-   Separar estadísticas externas de cálculos propios.
-   No asumir estructura europea de competición.
-   Permitir múltiples temporadas y formatos.
-   Preparar el modelo para otros equipos sin dejar de priorizar
    Newell's.

## Entidades mínimas

### teams

Representa clubes/equipos.

Información conceptual: - identidad interna; - nombre; - escudo cuando
exista; - país/ciudad cuando exista; - proveedor e ID externo; -
timestamps.

Newell's no debe quedar representado únicamente mediante lógica
hardcodeada en componentes.

### players

-   identidad;
-   nombre;
-   datos personales/deportivos disponibles;
-   posición;
-   proveedor e ID externo;
-   timestamps.

No asumir que todos los atributos estarán disponibles.

### coaches

-   identidad;
-   nombre;
-   proveedor e ID externo;
-   timestamps.

### referees

-   identidad;
-   nombre;
-   proveedor e ID externo cuando exista;
-   timestamps.

### venues

-   identidad;
-   nombre;
-   ciudad;
-   capacidad cuando exista;
-   proveedor e ID externo;
-   timestamps.

### seasons

Representa una temporada/configuración temporal.

Debe permitir asociar las estructuras competitivas válidas para esa
temporada.

### competitions

Representa torneos/competiciones.

No asumir que una temporada contiene una única tabla.

### stages / phases

Debe permitir representar fases tales como: - liga; - zonas; -
playoffs; - otras fases configurables.

### groups / zones

Permite múltiples zonas/grupos y diferente cantidad de participantes
según competición/temporada.

### fixtures

Partidos.

Debe soportar: - competición/temporada/fase; - local y visitante; -
fecha/hora; - estadio; - árbitro cuando exista; - estado; - marcador; -
proveedor e ID externo; - timestamps de fuente/sincronización.

Los estados exactos se normalizarán a partir de la investigación del
proveedor.

### fixture_events

Eventos del partido disponibles: - goles; - tarjetas; - sustituciones; -
otros tipos provistos.

No crear eventos inexistentes para completar la interfaz.

### lineups

Alineaciones por partido/equipo cuando existan.

Debe permitir distinguir titulares y banco y conservar
formación/posición cuando estén disponibles.

### player_match_performances

Rendimiento de un jugador en un partido.

Debe almacenar únicamente estadísticas realmente recibidas o
derivaciones explícitamente documentadas.

Será la base futura para ratings propios.

### standings

Posiciones dentro de una competición/fase/grupo.

Debe soportar snapshots o frescura suficiente según la estrategia que se
defina.

### annual_standings

La tabla anual/general puede provenir del proveedor o requerir cálculo
propio según disponibilidad.

Si se calcula internamente, debe quedar identificada como cálculo propio
y ser testeable.

### relegation_averages

Promedios/descenso cuando correspondan.

No asumir que existen en todas las temporadas ni que su fórmula es
inmutable.

La metodología debe ser configurable y validada contra reglas reales de
la competición.

### weather

Datos meteorológicos asociados al contexto del partido cuando sean
necesarios.

Fuente prevista: Open-Meteo.

Debe conservar fuente y timestamp.

### sync_runs

Registro de sincronizaciones: - proveedor; - operación; - inicio/fin; -
resultado; - error sanitizado; - cantidad de requests cuando pueda
conocerse; - timestamp de datos.

### own_ratings

Contenedor conceptual para resultados de algoritmos propios.

Debe permitir identificar: - entidad evaluada; - partido/período; -
valor; - versión/metodología; - fecha de cálculo.

No definir todavía fórmulas.

### news

Noticias normalizadas: - título/resumen cuando corresponda; -
categoría; - fuente; - tipo de fuente; - fecha de publicación; - fecha
de ingesta; - referencia; - estado de validación/deduplicación.

### player_public_facts

Información pública/verificable complementaria del jugador: - tipo de
dato; - valor; - fuente; - fecha de la fuente; - fecha de verificación.

Ejemplos posibles: monto de llegada, condición de canterano, contrato
público o préstamo. No inferir datos faltantes.

### user_votes

Base conceptual para "Jugador HDP de la fecha".

Debe relacionar: - partido/fecha relevante; - jugador elegible; -
voto; - mecanismo de identidad/anti-abuso que se defina.

La política anti-abuso todavía está pendiente.

## Competición argentina

Las relaciones deben permitir:

`season → competition → stage/phase → group/zone → standings/fixtures`

sin exigir que todos los niveles existan siempre.

Una temporada puede cambiar: - cantidad de equipos; - cantidad de
zonas; - formato; - reglas de clasificación; - existencia de
Apertura/Clausura; - tabla anual; - promedios; - fases eliminatorias; -
criterios de descenso.

Estas reglas no deben quedar dispersas en la UI.

## Procedencia

Para información externa se debe poder responder: - ¿de dónde salió?; -
¿cuándo se obtuvo?; - ¿qué identificador tenía en la fuente?; - ¿cuándo
se actualizó?; - ¿es oficial, periodística o cálculo propio?

## Datos faltantes

Reglas: - `null`/ausencia se interpreta como dato no disponible, no como
cero; - la UI mostrará `Sin datos`; - respuestas parciales deben poder
persistirse sin fabricar campos; - un dato stale puede mostrarse si está
identificado como tal.

## Próximo paso del modelo

### Evidencia BSD 2026

El cotejo se extendió a los 480 partidos de zonas de los 30 clubes, con
coincidencias únicas. Evidencia completa en
`docs/research/lpf-2026-competition-map.json`. Las 15 eliminatorias BSD se
mantienen separadas. Este mapeo resuelve pertenencia a torneo, no posiciones,
ajustes disciplinarios o promedios.

Actualización: se verificó un mapeo explícito de los 32 IDs de partidos de
Newell's contra el fixture oficial LPF (16 por torneo), mediante equipos,
localía y jornada, sin fechas calendario. Evidencia en
`docs/research/newells-2026-competition-map.json`. Puede orientar el futuro
mapeo con fuente y fecha de validación; no generalizarlo a todos los equipos
ni cargarlo automáticamente como tabla oficial.

La temporada externa 1635 combina torneos: Newell's tiene dos jornadas 1
con igual stage/group. No usar temporada + stage + round como clave única
ni deducir Apertura/Clausura por fecha de juego. Identificar partidos mediante
provider/external_id y permitir asignación local de torneo pendiente, con
procedencia y estado de validación. Conservar etiquetas originales.

Cuatro partidos aparecen como league-phase sin grupo; no excluirlos de la
competición por ese motivo. Standings acumula los 25 resultados anuales de
Newell's, pero no certifica tablas oficiales por torneo ni anual. No persistir
esas etiquetas como verificadas. Ver evidencia y fuente LPF en PROVEEDORES.md.

Después de verificar API-Football Free: 1. crear matriz dato requerido →
endpoint/disponibilidad; 2. eliminar conceptos que no necesiten
persistencia; 3. definir claves y relaciones concretas; 4. crear primera
migración mínima; 5. agregar constraints e índices según consultas
reales; 6. evitar diseñar tablas futuras sin necesidad comprobada.
