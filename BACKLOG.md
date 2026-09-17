# BACKLOG --- Movete, Leproso Movete!

> Fuente de verdad del estado del proyecto. Actualizar después de cada
> bloque relevante.

## Estados

-   [ ] Pendiente
-   \[\~\] En progreso
-   [x] Completado
-   \[!\] Bloqueado
-   \[?\] Requiere decisión

## Reglas

-   El código y los datos reales son la fuente de verdad.
-   No marcar tareas como completadas sin implementación y verificación.
-   Mantener tareas pequeñas y verificables.
-   Registrar decisiones técnicas importantes.
-   Si una tarea depende de una decisión pendiente, detenerse y
    registrarla.
-   Priorizar datos reales + `Sin datos` por sobre datos inventados.
-   No definir fórmulas definitivas de ratings antes de su tarea
    específica.

## Estado actual

-   [x] Alcance funcional inicial definido.
-   [x] Arquitectura conceptual definida.
-   [x] Proveedor inicial elegido.
-   [x] Estrategia conceptual de datos en vivo documentada.
-   [x] Confirmado que el proyecto comienza sin código previo.
-   [x] Bloque 1 --- Fundación técnica: base local, acceso Supabase y primer commit verificados.
-   [x] Repositorio publicado en GitHub: https://github.com/dM7u/MLeprosoM.
-   [~] Bloque 2: BSD permite 2026 y el fixture completo está mapeado contra LPF; pendientes tablas oficiales, históricos y cierre del modelo mínimo.
-   [x] Alternativas gratuitas investigadas (2026-09-17), registradas en `PROVEEDORES.md`.
-   [ ] Validar BSD con cuenta gratuita y muestras reales de Newell's; candidato recomendado, todavía no seleccionado. Confirmar condiciones vigentes y cobertura antes de reemplazar API-Football.
-   [x] BSD: clave renombrada localmente y acceso autenticado a 2026 validado el 2026-09-17; ocho consultas HTTP 200, incluyendo un partido con XI, eventos y estadísticas individuales.
-   [ ] BSD: resolver separación Apertura/Clausura y significado de tablas acumuladas por grupo; contrastar calidad y condiciones antes de adopción definitiva. Bloque 2 continúa abierto.
-   [x] Diagnosticar estructura BSD: temporada 2026 combinada, jornadas repetidas y fila acumulada de Newell's comprobada contra 25 resultados.
-   [ ] Resolver fuente/mapeo verificable para tablas por torneo, anual y promedios; no inferir torneo por calendario ni publicar standings BSD como tabla oficial.
-   [x] Vincular los 32 partidos BSD de Newell's 2026 con los fixtures oficiales LPF: 16 Apertura + 16 Clausura, sin ambigüedades ni uso de fecha calendario. Evidencia en `docs/research/newells-2026-competition-map.json`.
-   [ ] Extender validación a todos los equipos antes de calcular posiciones; verificar sanciones, desempates y promedios. Clasificación de Newell's resuelta, tablas completas pendientes.
-   [x] Extender mapeo a toda la liga: 480 encuentros oficiales vinculados uno a uno, 240 por torneo, 30 equipos, 16 partidos por equipo. Los 15 registros adicionales BSD son eliminatorias excluidas del mapeo de zonas.
-   [ ] Certificar posiciones y ajustes disciplinarios con fuente oficial; validar base histórica de promedios. Ausencia de resultados de búsqueda no acredita ausencia de sanciones.
-   [x] Relevar reglas oficiales de zonas, anual y descenso: `docs/research/REGLAS_TABLAS_2026.md`. Distinguir clasificación pendiente, ajustes disciplinarios e históricos incompletos.

## Decisiones ya tomadas

-   [x] Nombre corto: **MLeprosoM**, conservando “Movete, Leproso Movete!”
    como nombre completo. Identificador npm: `mleprosom` (minúsculas).
-   [x] Repositorio indicado por el usuario: https://github.com/dM7u/MLeprosoM.
    Remoto local `origin` configurado y rama `main` publicada.

-   [x] Proveedor inicial: API-Football / API-Sports Free.
-   [x] Proyecto inicialmente centrado en Newell's Old Boys.
-   [x] Stack objetivo: Next.js + TypeScript + Tailwind CSS.
-   [x] Backend/persistencia: Supabase PostgreSQL, Edge Functions y Cron
    cuando corresponda.
-   [x] Clima: Open-Meteo.
-   [x] APIs externas solo desde backend.
-   [x] Arquitectura: proveedor → normalización → cache/DB → servicios →
    API interna → UI.
-   [x] Un único proceso backend sincroniza el partido activo.
-   [x] Rating de jugadores: algoritmo propio, a definir más adelante.
-   [x] "Jugador a putear": algoritmo propio, a definir más adelante.
-   [x] Votación de usuarios para "Jugador HDP de la fecha".
-   [x] Noticias clasificadas por categorías y con fuente identificada.
-   [x] Fuentes sociales/periodísticas podrán complementar noticias y
    posible XI si son viables.
-   [x] Datos económicos/contractuales solo si son públicos y
    verificables.
-   [x] Supabase será un proyecto independiente del utilizado por
    Argentoma.

## BLOQUE 1 --- Fundación técnica

Objetivo: obtener un proyecto mínimo ejecutable, seguro y preparado para
crecer sin implementar funcionalidades de producto prematuramente.

-   [x] Verificar Node.js, npm y Git del entorno de desarrollo.
-   [x] Verificar versiones/documentación actual de Next.js y stack
    antes de inicializar.
-   [x] Crear proyecto Next.js + TypeScript + Tailwind.
-   [x] Verificar ejecución local (servidor de producción, HTTP y CSS).
-   [x] Inicializar/configurar Git (rama main, exclusiones y finales de línea).
-   [x] Crear primer commit: `b62eaea`, con identidad autorizada por el usuario.
-   [x] Definir estructura mínima de código sin abstracciones
    prematuras.
-   [x] Crear configuración de variables de entorno.
-   [x] Crear `.env.example` sin secretos.
-   [x] Crear proyecto Supabase independiente: creación confirmada por el usuario.
-   [x] Preparar conexión segura con Supabase (fábrica server-only, validación
    diferida y sesiones desactivadas).
-   [x] Validar acceso real a la Data API de Supabase: consulta autenticada de
    solo lectura a `/rest/v1/`, HTTP 200. Configuración cargada desde `.env.local`;
    clave y cuerpo de respuesta no mostrados ni registrados. Esto no verifica
    todavía operaciones sobre tablas ni políticas RLS.
-   [x] Definir frontera cliente/servidor.
-   [x] Preparar capa provider sin implementar cobertura no verificada.
-   [x] Incorporar esta documentación al repositorio (copias operativas en raíz).
-   [x] Ejecutar build/lint/typecheck disponibles.
-   [x] Actualizar backlog con el estado real del bloque.

### Registro de ejecución — 2026-09-17

- Alcance estimado antes de implementar: 20–30 minutos, complejidad baja;
  dependencias externas: registro npm, cuenta Supabase y futuro remoto Git.
- Next 16.3.5, React 19.3.0, Tailwind 4.3.3, TypeScript 6.0.3,
  ESLint 9.39.5 y Supabase JS 2.116.0. Node 24.19.0, npm 12.0.2,
  Git 2.53.0.windows.3. Versiones exactas y lockfile incorporados.
- TypeScript 7 no se adoptó porque el parser ESLint requiere <6.1.
  ESLint 10 provocó incompatibilidades de plugins y error de lint; 9 pasa.
  ESLint 9 está fuera de soporte según npm: revisar su actualización cuando
  los plugins transitivos de Next permitan 10, sin forzar sus dependencias.
- npm se preparó en `.tools/npm`, ignorado por Git. No se modificaron
  instalaciones globales. npm bloqueó el postinstall opcional de
  `unrs-resolver`; lint y build funcionan con los binarios distribuidos.
- Build de producción: OK con `MOVETE_BUILD_WORKER_THREADS=1`.
  Sin esa opción, el entorno Windows bloquea procesos auxiliares con
  `spawn EPERM`. La opción usa hilos y la API de TypeScript 6; mantiene
  activa la validación de tipos. No se tocaron archivos de dependencias.
- Lint sin warnings y typecheck: OK. Tres pruebas de configuración: OK,
  usando el ejecutor nativo sin procesos aislados. Sin credenciales reales.
- HTTP local: `/` 200, CSS 200 y ruta inexistente 404; sin cabecera
  `X-Powered-By`. Importación de backend fuera del contexto servidor rechazada
  por `server-only`. `.env.local` y `.env.production` excluidos de Git;
  `.env.example` incluido.
- Árbol npm sin incompatibilidades declaradas; auditoría de producción:
  cero vulnerabilidades reportadas al verificar.
- No hay Home, datos deportivos, ratings, vivo, noticias, endpoints,
  migraciones ni modelo físico de DB. No se consumió cuota de API-Football.
- `sources/` se mantuvo intacto y solo lectura; documentación operativa en raíz.
- Git configurado localmente con autor `dM7` y correo autorizado por el usuario.
  El primer commit y el remoto quedaron creados y verificados.
- Supabase: acceso autenticado verificado después de la configuración privada
  del usuario. `.env.local` sigue excluido de Git. No se crearon tablas ni datos.
- No se inició Bloque 2. El Bloque 1 está completo.

### Continuación: nombre corto y repositorio

- Nombre corto MLeprosoM registrado; package.json y lockfile coherentes con
  `mleprosom`. Referencias sincronizadas en sources/ sin modificar.
- Se resolvió la escritura de configuración Git mediante ejecución con permisos
  ampliados. `origin` apunta al repositorio indicado por el usuario.
- Acceso de GitHub autorizado mediante el flujo oficial de dispositivo.
- Rama `main` publicada y configurada para seguir `origin/main`.
- Archivos preparados en el índice de Git; revisión del diff sin errores de
  espacios. `.env.local` no está incluido. El bloqueo inicial de registro de
  archivos quedó resuelto mediante ejecución con permisos ampliados.

### Criterio de salida

Cumplido. Primer commit creado con autor `dM7` y correo `mp8@live.com.ar`,
configurados únicamente en este repositorio. `.env.local` permanece excluido.
La rama `main` fue publicada en GitHub mediante el flujo oficial de dispositivo.

Bloque 1 termina cuando el proyecto puede ejecutarse y verificarse
localmente, la configuración sensible está protegida, la arquitectura
mínima es coherente y el repositorio contiene la documentación vigente.

## BLOQUE 2 --- Cobertura real y modelo mínimo

-   [x] Investigar documentación pública actual de API-Football Free.
-   [x] Configurar API_FOOTBALL_API_KEY en .env.local y validar autenticación.
-   [x] Verificar límites/cuota reales: Free activo, 100/día y 10/minuto.
-   [x] Identificar Newell's primer equipo: ID externo 457 (API-Football).
-   [!] Acceder a temporada 2026: denegada; el mensaje de Free indica 2022–2024.
-   [ ] Verificar cobertura de Newell's y competiciones necesarias.
-   [x] Verificar correspondencia de fixtures 2026 BSD/LPF: 480 encuentros de zonas, sin certificar cada marcador.
-   [ ] Verificar standings.
-   [ ] Verificar jugadores.
-   [x] Verificar alineaciones en muestra BSD 223705; no equivale a cobertura universal ni vivo.
-   [x] Verificar estadísticas de jugadores/partido en muestra BSD 223705, con faltantes registrados.
-   [ ] Verificar técnicos.
-   [ ] Verificar árbitros.
-   [ ] Verificar estadios.
-   [ ] Verificar eventos y estadísticas en vivo.
-   [x] Crear matriz inicial requerido/documentado/pendiente/fuente alternativa.
-   [ ] Completar matriz con resultados autenticados, alcance y muestras.
-   [x] Crear `PROVEEDORES.md` si la investigación produce información
    estable que deba conservarse.
-   [x] Ajustar `MODELO_DE_DATOS.md` con límites del relevamiento público.
-   [ ] Validar ajustes del modelo contra respuestas reales.
-   [x] Diseñar y probar primera migración mínima: equipos, competiciones, temporadas externas, partidos y sincronizaciones. RLS y restricciones verificadas en PostgreSQL embebido.
-   [x] Aplicar `20260917000100_initial_football.sql` en Supabase: ejecución manual confirmada por el usuario; cinco tablas accesibles desde backend con HTTP 200 (2026-09-17).
-   [x] Auditar permisos/RLS en Supabase remoto: usuario ejecutó `supabase/check-access.sql` y confirmó cinco filas, RLS true y todos los privilegios comprobados de anon/authenticated false. Resultado comunicado por el usuario, no leído directamente por el agente.

### Investigación inicial — 2026-09-17

Actualización autenticada: tres solicitudes entre 12:16:55 y 12:17:20 UTC.
Estado de cuenta y búsqueda de Newell's exitosos; ligas por equipo/temporada
devolvió HTTP 200 con `errors.plan`. Se detuvieron las consultas dependientes.
Estadio habitual recibido dentro de teams; el estadio por partido sigue pendiente.
Evidencia sanitizada en `PROVEEDORES.md`. Clave protegida, sin tablas ni cambios
en la aplicación. Falta decidir entre plan con acceso actual, otro proveedor o
prototipo histórico antes de completar la matriz y diseñar la migración.

Registro previo de investigación pública:

- Estimación previa: 15–25 minutos para documentación y matriz inicial; pruebas
  dependientes de una clave directa de API-Sports y cuota disponible.
- Fuentes oficiales y protocolo de pruebas en `PROVEEDORES.md`.
- Free documenta 100/día y 10/minuto; la cuenta y sus temporadas accesibles
  siguen sin verificar. No marcar cobertura de Newell's como confirmada.
- El catálogo incluye competiciones argentinas, pero no demuestra su acceso
  para la temporada objetivo. No se asignaron IDs externos ni se hicieron requests autenticadas.
- Se detectó que cuatro operaciones cada 150 segundos excederían 100 consultas
  en un partido de 90 minutos. Polling definitivo y transición HT→2H pendientes.
- Sin cambios de código de producto ni DB. La primera migración sigue pendiente
  hasta resolver acceso a temporada y muestras. No se inició Bloque 3.

## BLOQUE 3 --- Primera cadena de datos real

Tolerancia inicial a fallos: [x] reintento acotado de lecturas BSD, respeto de
Retry-After, conteo real de intentos y registro de caídas en apply; [x] función
de estados de frescura probada con snapshots simulados; [ ] conectar esa función
al servicio/API/UI cuando exista. Once pruebas, lint, typecheck y build aprobados.
No se consultó BSD ni se cargaron datos simulados para estas pruebas.

Avance 2026-09-17: cliente BSD y sincronización manual preparados en
`scripts/sync-bsd.mjs`; normalización valida alcance, nulos, duplicados y páginas
incompletas. Siete pruebas unitarias, lint, typecheck y build aprobados. Dos intentos
dry-run fallaron por conexión BSD, incluido uno fuera del sandbox: no se
ejecutó apply ni se guardaron fixtures. Escritura e idempotencia remotas pendientes.
Auditoría pública preparada en `supabase/check-access.sql`, aún sin ejecutar
en la base remota. No se implementó UI ni scheduler.

Actualización posterior: auditoría remota ejecutada y resultado esperado
confirmado por el usuario. Nuevo dry-run BSD falló con BSD_CONNECTION_FAILED;
no se ejecutó apply ni se cargaron partidos. La auditoría ya no bloquea la carga;
queda pendiente recuperar conectividad y validar la primera escritura real.

-   [ ] Implementar cliente backend API-Football.
-   [ ] Implementar manejo básico de errores/rate limit.
-   [ ] Normalizar equipo/competición/temporada/fixture según cobertura
    confirmada.
-   [ ] Crear migraciones mínimas necesarias.
-   [ ] Sincronizar Newell's.
-   [ ] Sincronizar próximos/últimos fixtures.
-   [ ] Persistir en Supabase.
-   [ ] Exponer mediante servicio/API interna.
-   [ ] Mostrar primera información real en UI.
-   [ ] Tests de normalización.
-   [ ] Verificar cadena proveedor → UI.

## BLOQUE 4 --- Standings y Home inicial

-   [ ] Modelar estructura argentina confirmada.
-   [ ] Standings.
-   [ ] Tabla anual si corresponde.
-   [ ] Promedios/descenso si corresponde.
-   [ ] Navegación lateral.
-   [ ] Próximo partido.
-   [ ] Posiciones.
-   [ ] Últimos/próximos partidos.
-   [ ] Tablas disponibles.
-   [ ] Estados loading/empty/error/stale/parcial/`Sin datos`.
-   [ ] Responsive inicial.

## BLOQUE 5 --- Panel de equipo

-   [ ] Últimos 3 + drilldown.
-   [ ] Próximos 3 + drilldown.
-   [ ] Posición contextual.
-   [ ] XI más utilizado.
-   [ ] Estadísticas de jugadores.
-   [ ] Técnico.
-   [ ] Drilldowns.

## BLOQUE 6 --- Partido en vivo

Todo el bloque debe respetar `DATOS_EN_VIVO.md`.

-   [ ] Detección automática de partido activo.
-   [ ] Scheduler/proceso central.
-   [ ] Exclusión para evitar polling duplicado.
-   [ ] Cache.
-   [ ] Polling configurable.
-   [ ] Pausa HT.
-   [ ] Reanudación 2H.
-   [ ] ET/P.
-   [ ] Finalización.
-   [ ] Eventos.
-   [ ] Alineaciones.
-   [ ] Estadísticas.
-   [ ] Suplentes/sustituciones.
-   [ ] `lastKnownGoodData`.
-   [ ] Frescura/stale.
-   [ ] Tests de estados, errores, cache y rate limits.

## BLOQUE 7 --- Ratings y participación

No iniciar fórmulas antes de relevar variables reales.

-   [ ] Relevar variables disponibles para rating.
-   [ ] Diseñar metodología de rating de jugadores.
-   [ ] Validar metodología.
-   [ ] Implementar/versionar rating.
-   [ ] Diseñar metodología "Jugador a putear".
-   [ ] Validar e implementar.
-   [ ] Diseñar rating del técnico.
-   [ ] Validar e implementar.
-   [ ] Diseñar sistema "Jugador HDP de la fecha".
-   [ ] Definir identidad/anti-abuso.
-   [ ] Implementar votación.
-   [ ] Tests.

## BLOQUE 8 --- Contexto: árbitro, estadio y clima

-   [ ] Árbitro del partido.
-   [ ] Histórico con Newell's.
-   [ ] Resultados/tarjetas/penales/rojas cuando existan datos.
-   [ ] Histórico con rival cuando haya muestra suficiente.
-   [ ] Separar histórico/temporada/partido actual.
-   [ ] Estadio.
-   [ ] Open-Meteo.
-   [ ] Clima contextual.

## BLOQUE 9 --- Noticias y probable XI

-   [ ] Definir fuentes confiables.
-   [ ] Categorías iniciales.
-   [ ] Modelo/atribución.
-   [ ] Evaluar fuentes oficiales.
-   [ ] Evaluar periodistas partidarios.
-   [ ] Evaluar Instagram/redes según viabilidad técnica/legal.
-   [ ] Deduplicación.
-   [ ] Validación/moderación.
-   [ ] Diferenciar oficial/periodística.
-   [ ] Investigar datos útiles para probable XI.
-   [ ] Definir metodología solo si existe evidencia suficiente.
-   [ ] Mostrar `Sin datos` cuando no exista base suficiente.

## BLOQUE 10 --- Perfiles de jugadores

-   [ ] Identidad y estadísticas.
-   [ ] Trayectoria.
-   [ ] Canterano verificable.
-   [ ] Monto de llegada público/verificable.
-   [ ] Contrato público.
-   [ ] Préstamo y condiciones públicas.
-   [ ] Fuente/fecha de cada dato.
-   [ ] Diferenciar oficial/externo/no disponible.

## BLOQUE 11 --- Calidad y producto

-   [ ] Seguridad y validación de inputs.
-   [ ] Observabilidad completa.
-   [ ] Detección de respuestas incompletas.
-   [ ] Optimización de requests.
-   [ ] Responsive completo.
-   [ ] PWA.
-   [ ] Rendimiento.
-   [ ] Cobertura de tests prioritaria.

## Decisiones pendientes

-   Reemplazo gratuito de API-Football: Free denegó 2026; BSD candidato a validar, GOAL API alternativa secundaria con cuota pendiente de confirmar.
-   Actualizar ESLint a una rama soportada cuando los plugins de Next sean compatibles.
-   Modelo DB físico después de conocer cobertura.
-   Cache/TTL por tipo de dato.
-   Polling final según cuota.
-   Scheduler y mecanismo de lock.
-   Variables reales para algoritmos.
-   Fórmula de rating de jugadores.
-   Metodología "Jugador a putear".
-   Rating del técnico.
-   Fuentes concretas de noticias.
-   Política de confianza/moderación.
-   Viabilidad de Instagram/redes.
-   Fuentes de contratos/transferencias.
-   Anti-abuso de votaciones.
-   Metodología de probable XI cuando el proveedor no lo ofrezca.
