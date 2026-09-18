# Arquitectura --- Movete, Leproso Movete!

## Estado

Vista mínima de partidos implementada como Server Component dinámico. Consume
`fixtureView` → `readTeamFixtures` → Supabase; nunca BSD durante una visita.
Configuración privada: FOOTBALL_PROVIDER, FOOTBALL_TEAM_ID y
FIXTURES_STALE_AFTER_SECONDS. Localmente bsd/4997/900, sin claves públicas.
TTL solo para advertir antigüedad del snapshot; no programa refrescos ni vivo.
No hay endpoint HTTP de datos adicional: la frontera de lectura es server-only.

Actualización 2026-09-18: cadena mínima BSD → validación → Supabase comprobada,
con sincronización manual en `scripts/sync-bsd.mjs`. Lectura independiente en
`src/server/db/read-fixtures.mjs`, sin consultas al proveedor y con TTL explícito
del consumidor. Conserva nulls y clasifica frescura por el registro más antiguo;
si faltan nombres devuelve datos parciales. API/UI y scheduler aún pendientes.

Arquitectura conceptual con una base mínima implementada en el Bloque 1.
El flujo completo todavía no está implementado.

## Estructura implementada

```text
src/
  app/                         Página de construcción, layout y estilos
  server/
    env.ts                     Configuración privada, validada al usarla
    db/supabase.ts             Fábrica de cliente administrativo, sin consultas
    providers/api-football/    Identidad del adaptador; cobertura no verificada
```

App Router utiliza Server Components por defecto. No se necesitan Client
Components en este bloque. Los módulos de backend importan `server-only`:
Next.js debe rechazar que un Client Component los incorpore. No serializar
configuración privada en props, respuestas o logs.

La página no importa proveedores ni consulta servicios externos. No hay API
interna, normalizadores, cron, cache ni servicios de dominio todavía. Se crearán
al implementar una operación real, evitando contratos y carpetas sin uso.

Supabase está preparado exclusivamente en servidor, sin persistencia de sesión
ni refresco automático. Su fábrica no se utiliza desde la UI. La conexión real
se verificó mediante una consulta autenticada de solo lectura a la Data API del
proyecto independiente. Las operaciones sobre tablas se verificarán después de
definir el modelo mínimo y sus permisos.

## Objetivos

-   Evitar acoplamiento con API-Football.
-   Proteger API keys y secretos.
-   Centralizar sincronizaciones.
-   Reducir consumo de cuota.
-   Separar datos externos, normalización, dominio y presentación.
-   Permitir incorporar otros equipos y eventualmente otros proveedores.
-   Poder representar correctamente competiciones argentinas.
-   Tratar datos ausentes, parciales y desactualizados explícitamente.

## Flujo principal

`PROVEEDOR → NORMALIZACIÓN → CACHE/DB → SERVICIOS DE DOMINIO → API INTERNA → UI`

### 1. Proveedor

Responsable de comunicarse con APIs externas.

Proveedor inicial: - API-Football / API-Sports Free.

Otros servicios previstos: - Open-Meteo para clima. - Fuentes
adicionales solo cuando se investigue y apruebe su viabilidad.

La capa provider debe encapsular: - autenticación; - endpoints; -
parámetros; - formatos de respuesta; - códigos/estados propios; -
errores; - límites relevantes.

No debe contener reglas visuales.

### 2. Normalización

Convierte respuestas externas al modelo interno.

Debe: - mapear IDs externos; - preservar `provider` y `external_id`; -
transformar estados externos a representaciones internas cuando
corresponda; - conservar datos fuente necesarios para trazabilidad; -
detectar respuestas incompletas; - no convertir ausencia en cero; - ser
testeable sin UI.

### 3. Cache y persistencia

Supabase PostgreSQL será la persistencia principal prevista.

Objetivos: - evitar requests repetidos; - servir datos a múltiples
usuarios sin multiplicar consultas externas; - conservar histórico; -
conocer frescura; - soportar análisis posteriores; - registrar
sincronizaciones.

La política de cache se definirá por tipo de dato después de verificar
la cobertura y cuota real del proveedor.

### 4. Servicios de dominio

Exponen conceptos de la aplicación independientemente del proveedor.

Ejemplos conceptuales: - fixtures; - standings; - competiciones; -
equipos; - jugadores; - partido en vivo; - noticias; - perfiles.

Los nombres concretos de módulos/funciones se definirán al implementar;
este documento no prescribe archivos inexistentes.

### 5. API interna

La UI consume exclusivamente interfaces internas de la aplicación.

Reglas: - validar inputs; - no exponer secretos; - no permitir que una
visita del usuario dispare directamente una consulta al proveedor; -
devolver metadatos de frescura cuando sean relevantes; - distinguir
error, ausencia y dato stale.

### 6. UI

Next.js + TypeScript + Tailwind CSS.

La UI: - no conoce API keys; - no conoce formatos específicos de
API-Football; - no inventa valores; - presenta `Sin datos` cuando
corresponda; - diferencia estadísticas oficiales y cálculos propios; -
contempla loading/empty/error/stale/parcial.

## Backend y secretos

Todas las APIs externas se consultan desde backend.

Los secretos se almacenarán mediante variables de entorno/configuración
segura. Nunca deben: - quedar en repositorio; - enviarse al navegador; -
aparecer en logs; - copiarse en documentación.

## Supabase

Se utilizará un proyecto Supabase independiente del proyecto Argentoma.

Razones: - separación de datos; - migraciones independientes; -
políticas de seguridad independientes; - variables y entornos
independientes; - menor riesgo de afectar Argentoma.

Compartir la misma cuenta de Supabase no implica compartir el mismo
proyecto ni base de datos.

## Sincronización

Las sincronizaciones deben ser centralizadas y observables.

Para partidos en vivo rige `DATOS_EN_VIVO.md`.

Para datos no vivos se definirá una frecuencia apropiada según: -
variabilidad; - cuota disponible; - costo; - posibilidad de reutilizar
cache; - necesidad real de actualización.

## Probable XI

Nunca se inventa.

Jerarquía conceptual: 1. probable XI explícito de una fuente aceptada,
si existe; 2. inferencia propia únicamente si existe una metodología
futura definida, trazable y claramente identificada como cálculo propio;
3. en ausencia de evidencia suficiente: `Sin datos`.

Antes de implementar una metodología propia deben relevarse alineaciones
recientes, titularidades/minutos, posiciones, disponibilidad y datos que
realmente entregue el proveedor.

## Ratings

Los ratings de jugadores, técnico y "Jugador a putear" pertenecen a una
capa de análisis propia.

No forman parte de la normalización de estadísticas oficiales.

Debe conservarse suficiente información para poder: - reproducir un
cálculo; - identificar su versión/metodología; - distinguirlo del dato
del proveedor.

La fórmula se definirá posteriormente.

## Noticias y fuentes externas

Las noticias requieren una capa separada de ingesta/normalización.

Cada elemento debe permitir identificar: - fuente; - tipo de fuente; -
URL/referencia cuando corresponda; - fecha de publicación; - fecha de
ingesta; - categoría; - estado de validación; - posible duplicado.

No asumir acceso programático a Instagram u otras redes hasta
verificarlo.

## Observabilidad

Registrar como mínimo: - sincronización; - proveedor; - operación; -
inicio/fin; - resultado; - error sanitizado; - timestamps de datos; -
consumo/request count cuando sea posible.

Nunca registrar secretos.

## Principios de implementación

-   Cambios pequeños.
-   Sin abstracciones prematuras.
-   Sin duplicar lógica.
-   Sin hardcodear datos variables.
-   Código y datos reales como fuente de verdad.
-   Tests en normalización y lógica de dominio.
-   Arquitectura extensible a otros equipos sin generalizar
    prematuramente todo el producto.

## Preparación multiproveedor — 2026-09-18

Resolver server-only de identidad de equipos en src/server/identity, con registro
explícito revisado y rechazo de conflictos. Aún sin conectar al flujo operativo.
Reglas de alcance y deduplicación en MODELO_DE_DATOS.md. La vista sigue leyendo BSD.

Adaptador GOAL API de solo lectura disponible en src/server/providers/goal-api.
El comando scripts/check-goal.mjs valida identidad, alcance y catálogo paginado.
Todavía no integra DB ni UI; no crea llamadas externas al visitar la página.

### Lectura conjunta preparada — 2026-09-18

fixtureView resuelve el equipo revisado y consulta en paralelo snapshots de
Supabase: BSD limitado a su competición/temporada revisadas, GOAL limitado a
Copa Argentina 2026. readCombinedFixtures conserva resultados aunque falle otra
fuente; informa estados independientes y frescura del snapshot más antiguo.
La página muestra competición, proveedor y penales cuando existen, sin llamadas
al proveedor. La migración remota y la carga inicial GOAL siguen pendientes;
por ahora la vista muestra los 32 registros BSD y GOAL API Sin datos.

## Activación verificada — 2026-09-18

Migración remota aplicada por el usuario y comprobada mediante el preflight y
la carga. Dos apply GOAL exitosos (6 requests cada uno) conservan un solo fixture,
dos equipos, una competición y una temporada. Ambas sincronizaciones succeeded.
Lectura conjunta: 33 partidos (32 BSD + Newell's–Acassuso, Copa Argentina, 0–2).
Penales siguen null. BSD continúa stale; GOAL actualizado al verificar. La
activación reemplaza los pendientes de migración/importación de notas previas.
