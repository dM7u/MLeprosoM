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

Resumen consolidado al 24/09/2026. Este apartado y la cola inmediata prevalecen
sobre las notas de ejecución fechadas, que se conservan como historial.

- Fundación y cadena de partidos operativas: BSD para liga y GOAL para Copa.
- Pantalla básica de partidos; Home/dashboard completo todavía pendiente.
- Motor de zonas/anual y catálogo completo contrastados en cortes fechados.
- Lotes, revisión oficial, activación y lector persistido implementados y probados localmente.
- Ambas tablas de standings y sus columnas comprobadas en Supabase remoto:
  cero filas al 24/09/2026. Auditoría administrativa de permisos/restricciones pendiente.
- Operación manual de revisión y política inicial de vigencia implementadas.
- 87 pruebas unitarias, pruebas PostgreSQL locales, lint, typecheck y build aprobados.
- Seguimiento cerrado: backlog consolidado y avances anteriores guardados en `1dfe880`.

### Cola inmediata

1. Completar auditoría administrativa remota con `supabase/check-standings-access.sql`;
   obtener catálogo y evidencia oficial actuales, guardar lote y revisión y verificar lectura.
2. Construir Home/dashboard inicial con navegación, partidos y tablas.
3. Antes de automatizar cargas frecuentes, reemplazar los límites de historial
   del lector por una consulta paginada o transaccional validada.

### Operación manual — 24/09/2026

- [x] Comando review-standings con dry-run sin DB y apply de revisión inmutable.
- [x] Solicitud explícita de activación; reintentos con UUID/fecha estables;
  revisión antigua no evita comprobar vigencia al ejecutar.
- [x] Exportación opcional de lote a archivo nuevo para preparar evidencia ligada al hash.
- [x] Política editable: resultados/evidencia 6 h; calendario/zonas 7 días.
  No programa sincronizaciones ni promete datos en vivo.
- [x] Preflight remoto: ambas tablas vacías y columnas accesibles; cero escrituras.
- [ ] Auditoría SQL administrativa remota y primer lote actual revisado.
- Verificación: cuatro pruebas nuevas, 87 en total; PostgreSQL local, lint,
  typecheck y build. Evidencia de pruebas histórica, sin presentarla como actual.

### Lector persistido — 24/09/2026

- [x] Lectura privada por proveedor/competición/temporada y selección de tabla.
- [x] Validación del lote y revisión; última denegación invalida aprobaciones anteriores.
- [x] Frescura de resultados, calendario y evidencia; tabla anterior habilitada
  disponible como desactualizada ante un lote nuevo no habilitado.
- [x] Fallos de almacenamiento, corrupción, empates de revisión y cambios
  detectados durante lectura devuelven error sanitizado sin publicar filas.
- [x] Ocho pruebas nuevas; 83 en total. Sin consultas al proveedor ni escrituras.
- [ ] Conectar lector a API/UI después de preparar operación y esquema remoto.
- Límite inicial: 100 lotes/500 revisiones por ámbito; al excederlo falla de
  forma explícita. Relectura optimista de revisión, sin aislamiento transaccional.

### Capacidades y pendientes

-   [x] Alcance funcional inicial definido.
-   [x] Arquitectura conceptual definida.
-   [x] Proveedor inicial elegido.
-   [x] Estrategia conceptual de datos en vivo documentada.
-   [x] Confirmado que el proyecto comienza sin código previo.
-   [x] Bloque 1 --- Fundación técnica: base local, acceso Supabase y primer commit verificados.
-   [x] Repositorio publicado en GitHub: https://github.com/dM7u/MLeprosoM.
-   [~] Bloque 2: fixtures y tablas básicas contrastados; pendientes cobertura ampliada, condiciones de adopción, históricos y sanciones.
-   [x] Alternativas gratuitas investigadas (2026-09-17), registradas en `PROVEEDORES.md`.
-   [x] Validar acceso BSD y muestras reales de Newell's; utilizado para fixtures LPF. Condiciones de adopción definitiva y cobertura ampliada siguen pendientes.
-   [x] BSD: clave renombrada localmente y acceso autenticado a 2026 validado el 2026-09-17; ocho consultas HTTP 200, incluyendo un partido con XI, eventos y estadísticas individuales.
-   [x] BSD: resolver Apertura/Clausura y significado de grupos acumulados; no usarlos como tablas oficiales de torneo.
-   [x] Diagnosticar estructura BSD: temporada 2026 combinada, jornadas repetidas y fila acumulada de Newell's comprobada contra 25 resultados.
-   [x] Resolver fuente/mapeo de torneo y anual, motor propio y contraste fechado. Promedios/históricos siguen pendientes.
-   [x] Vincular los 32 partidos BSD de Newell's 2026 con los fixtures oficiales LPF: 16 Apertura + 16 Clausura, sin ambigüedades ni uso de fecha calendario. Evidencia en `docs/research/newells-2026-competition-map.json`.
-   [x] Extender validación a toda la liga: zonas y anual contrastadas. Desempates inferiores, sanciones y promedios no resueltos.
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
-   [x] Incorporar esta documentación al repositorio (documentos de trabajo en fuentes/).
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
-   [x] Contrastar standings de zonas/anual en cortes fechados; no acredita sanciones ni vigencia permanente.
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
-   [~] Modelo de partidos y tablas validado con muestras reales; entidades ampliadas pendientes.
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

Actualización 2026-09-18: BSD recuperado. Dry-run exitoso (3 requests/32 fixtures),
dos apply exitosos consecutivos (3 requests cada uno). Lectura remota confirma
32 fixtures, 17 equipos, una competición y una temporada, sin duplicados.
`readTeamFixtures` consulta exclusivamente Supabase y usa estados de frescura;
prueba remota devuelve 32 partidos, nombres completos y 7 marcadores null.
TTL de 60 segundos usado solo para la prueba, no política definitiva del vivo.
Quince pruebas unitarias, lint y typecheck aprobados. UI/API pública pendientes.

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

-   [x] Implementar cliente backend BSD (API-Football sustituido para esta cadena mínima).
-   [x] Implementar manejo básico de errores/rate limit.
-   [x] Normalizar equipo/competición/temporada/fixture según cobertura
    confirmada.
-   [x] Crear migraciones mínimas necesarias.
-   [x] Sincronizar Newell's y rivales de sus fixtures.
-   [x] Sincronizar fixtures disponibles de la temporada 2026.
-   [x] Persistir en Supabase y verificar repetición sin duplicados.
-   [x] Exponer mediante servicio server-only consumido por Server Component.
-   [x] Mostrar partidos programados, resultados y otros estados desde Supabase.
-   [x] Tests de normalización y lectura de datos ausentes/parciales/desactualizados.
-   [x] Verificar cadena proveedor → Supabase → UI local: 32 partidos, siete marcadores pendientes, carga y stale visibles; HTTP 200 y sin secretos en HTML. Sin despliegue público.

Vista mínima 2026-09-18: equipo/proveedor por configuración privada; TTL local
de registros 900 segundos (conservador, configurable, no política del vivo).
Horarios de Argentina; null no se representa como cero; estados no reconocidos
se muestran sin confirmar. 16 pruebas, lint, typecheck, build y revisión visual
local aprobados. Sin Home, tablas, ratings ni sincronización automática.

## BLOQUE 4 --- Standings y Home inicial

-   [x] Modelar calendario y membresías configurables para estructura argentina revisada.
-   [~] Standings: motor, almacenamiento y activación locales listos; lector/remoto/UI pendientes.
-   [~] Tabla anual: cálculo y contraste implementados; lectura/publicación pendientes.
-   [ ] Promedios/descenso si corresponde.
-   [ ] Navegación lateral.
-   [ ] Próximo partido.
-   [ ] Posiciones.
-   [~] Listas básicas de resultados/programados implementadas; tarjetas Home pendientes.
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

## Copa Argentina — revisión 2026-09-18

- [x] Revisar candidato gratuito complementario: GOAL API anuncia Copa Argentina
  2021–2026 y plan gratuito de 1.000 requests/día; verificación pública en navegador.
  Evidencia, divergencia de autenticación y protocolo en `PROVEEDORES.md`.
- [x] Probar cuenta GOAL API y cotejar muestra Newell's 2026 contra Copa Argentina. Siete GET: seis HTTP 200 y un 404 por ID público incompatible. Cuota 1.000/día, restante 993; muestra contrastada con ficha oficial. Sin importación.
- [x] Resolver identidad entre proveedores para el alcance revisado: Newell's, LPF/BSD y Copa/GOAL API; carga y lectura verificadas.

Solo documentación y variable de ejemplo reservada; sin adaptador, migraciones
ni consultas autenticadas nuevas. BSD sigue alimentando la vista local.
Revisión de diferencias y formato; no corresponde repetir tests de producto.

## Decisiones pendientes

-   [x] Incorporar Copa Argentina mediante GOAL API: importación y lectura conjunta
    verificadas el 18/09. No equivale a sincronización automática ni cobertura universal.
-   [x] Equivalencias revisadas de equipos para combinar ámbitos disjuntos LPF/Copa;
    no existe fusión automática de partidos entre proveedores.

-   Proveedores: API-Football Free denegó 2026; BSD operativo para LPF y GOAL API integrado para Copa. Revalidar condiciones/cobertura antes de ampliar uso.
-   Actualizar ESLint a una rama soportada cuando los plugins de Next sean compatibles.
-   Modelo DB: base de partidos aplicada; lotes/revisiones de tablas probados localmente, remoto pendiente. Ampliar otras entidades según cobertura.
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

## Ubicación local — 2026-09-18

Proyecto copiado a `C:\MLeprosoM` por pedido del usuario, conservando Git y
claves locales. Los seis documentos de trabajo residen únicamente en `fuentes/`.
Se comprobó la igualdad de las copias antes de eliminar los duplicados de la raíz.
Se retiró `scripts/sync-docs.mjs`; las actualizaciones se hacen directamente en `fuentes/`.
Espejo original retenido como respaldo. 16 pruebas aprobadas desde el destino
en la migración anterior; esta consolidación modifica solo documentación.
AGENTS.md heredado no se modificó: el sistema rechazó su escritura (EPERM);
las instrucciones de ubicación están en `fuentes/README.md`.

## Validación GOAL API — 2026-09-18

Credencial confirmada sin exponerla. La prueba anterior de documentación queda
complementada por siete consultas reales; evidencia y límites en PROVEEDORES.md.
No se completó paginación ni se certificaron estadísticas, vivo o históricos.
Próximo paso: identidad compartida de equipos y deduplicación antes de importar.
Cambios solo documentales; diff verificado, sin repetir tests de producto.

## Preparación de identidad — 2026-09-18

Alcance acotado: resolver identidad sin reescribir DB; riesgo principal, unir
clubes/partidos distintos. Sin dependencias nuevas ni consultas externas.

- [x] Implementar registro explícito BSD/GOAL API para Newell's primer equipo.
- [x] Resolver server-only con desconocidos sin asignar y rechazo de conflictos.
- [x] Documentar idempotencia y separación inicial LPF/BSD y Copa/GOAL API.
- [x] Cuatro pruebas nuevas de identidad y conflictos; 20 pruebas totales OK.
- [x] Conectar identidad y alcance revisados al adaptador GOAL API; dry-run completo, cinco páginas y un fixture de Copa Argentina 2026.
- [x] Persistir Copa Argentina y habilitar lectura conjunta con procedencia (verificación remota 2026-09-18).

No se importaron partidos, modificaron tablas ni cambió la vista. La tarea de
identidad integrada permanece abierta hasta conectar y verificar el flujo.
Validación final: 20 tests, lint, typecheck y build de producción aprobados.

## GOAL API: adaptador de lectura — 2026-09-18

Alcance: cliente backend, normalización y paginación limitada, sin SQL ni UI.
Sin dependencias nuevas. Riesgos cubiertos: credenciales, páginas incompletas,
mezcla de competiciones/ediciones, duplicados y conversión indebida de null.

- [x] Cliente server-only con origen fijo, timeout, sin redirecciones/reintentos.
- [x] Validar IDs, fechas, alcance y marcadores; conservar FT/prórroga/penales.
- [x] Recorrer catálogo con presupuesto diez páginas y rechazo de inconsistencias.
- [x] Conectar equivalencia revisada de Newell's al comando dry-run.
- [x] Ejecutar prueba real: 5 consultas, 226 IDs, 225 excluidos, 1 en alcance.
- [x] 25 pruebas unitarias, lint y typecheck aprobados.
- [x] Persistencia Copa y lectura conjunta completadas para la muestra verificada; marcadores separados y estados conocidos normalizados.

No se importó ningún partido ni se modificó Supabase. La vista sigue usando BSD.
Build de producción también aprobado; revisión final de diferencias sin errores.

## Persistencia Copa y lectura conjunta — 2026-09-18

Alcance: ampliación aditiva de fixtures, importador manual y lectura/UI con
procedencia. Dependencia externa: aplicar SQL en Supabase. Sin datos simulados
remotos ni nuevas dependencias del producto; pruebas DB usan PGlite local.

- [x] Preparar migración de ronda textual y marcadores FT/prórroga/penales.
- [x] Probar restricciones, nulos, unicidad y permisos con PostgreSQL embebido.
- [x] Importador validado, upserts y registro de sincronizaciones/errores;
  preflight de esquema impide consumir cuota/cargar antes de la migración.
- [x] Conectar equivalencia de Newell's y ámbitos disjuntos a lectura conjunta.
- [x] Mostrar competición, fuente y estados por proveedor; GOAL FINISHED/SCHEDULED.
- [x] Dry-run real del importador: seis GET, 226 registros, uno en alcance.
- [x] Lectura remota y navegador: 32 registros BSD conservados, GOAL Sin datos.
- [x] Tests unitarios, lint, typecheck y build aprobados; prueba SQL local aprobada.
- [x] Aplicar `supabase/migrations/20260918000100_cup_score_breakdown.sql`: usuario confirmó ejecución; columnas verificadas por preflight e importación reales.
- [x] Dos apply exitosos y lectura remota: 33 partidos, 32 BSD y uno GOAL API, sin duplicación de la muestra.

No se ejecutó apply ni se modificó Supabase. La integración de Copa en producción
local sigue pendiente del SQL y carga remota. Preview comprobada en puerto 3101.
Conteo final: 31 pruebas unitarias aprobadas, además de la prueba de migración SQL.

## Copa Argentina activada — 2026-09-18

Usuario confirmó migración. Dos ejecuciones apply exitosas, seis requests cada
una, ambas sync_runs succeeded y error_code null. Consulta remota confirma GOAL
con un fixture, dos equipos, una competición y una temporada. Lectura conjunta:
33 partidos, 32 BSD + Newell's 0–2 Acassuso por Copa Argentina. Penales null.
BSD conserva frescura stale de su snapshot anterior; GOAL fresh al verificar.
No se refrescó BSD ni se alteraron sus partidos. Sin scheduler ni datos vivos.
La prueba remota completa los pendientes de activación registrados arriba;
los párrafos anteriores describen estados históricos, no bloqueos actuales.

Verificación en navegador: Copa Argentina · GOAL API, 29/03/2026 20:15,
Newell's–Acassuso 0–2 dentro de Resultados guardados. Preview en puerto 3101.

## Identificación Apertura/Clausura — 2026-09-18

Bloque acotado de clasificación del fixture, sin tablas de posiciones ni DB nueva.

- [x] Promover el mapeo revisado de Newell's 2026 a configuración versionada
  en src/server/competitions/newells-2026.json, conservando fuente y revisión.
- [x] Resolver por proveedor, competición, temporada, ID de partido, participantes,
  localía y jornada; no usar fecha calendario para inferir torneo.
- [x] Mostrar Apertura/Clausura y jornada; discrepancias quedan Torneo sin confirmar.
- [x] Contrastar los registros remotos actuales: 16 Apertura + 16 Clausura,
  ninguna discrepancia entre los 32 partidos BSD guardados.
- [x] 34 pruebas, lint, typecheck y build aprobados. HTTP local 200 con Apertura,
  Clausura, jornada y Copa Argentina; servidor 3101 reiniciado con el build nuevo.

No se consultó el proveedor ni se escribió en Supabase. Copa Argentina conserva
su identificación independiente. El snapshot revisado no certifica cambios
posteriores del fixture oficial ni posiciones, sanciones o promedios.
Siguiente pendiente: verificación de tablas y ajustes antes de implementar standings.

## Validación de tablas — 2026-09-18

Alcance: cerrar el contraste antes bloqueado por caída BSD y observar tablas LPF.
Sin cambios de producto, importación, migraciones ni fórmulas definitivas.

- [x] Revalidar 480 IDs mapeados con equipos/localía/jornada en catálogo de 495.
- [x] Comparar acumulados de 375 partidos finalizados con standings BSD:
  30/30 equipos coinciden en ocho campos básicos, eliminatorias excluidas.
- [x] Contrastar puntos y PJ de los 30 equipos con Tabla General oficial renderizada.
- [x] Registrar orden publicado y muestra Newell's de Clausura/promedios con fuente.
- [x] Verificar Apertura final publicado y zonas completas de ambos torneos: 60/60 filas y orden coincidentes en corte 2026-09-18.
- [x] Implementar snapshots en memoria por ámbito con empates y ajustes explícitamente pendientes (2026-09-24); persistencia/publicación aún pendientes.
- [ ] Verificar históricos/denominadores de promedios para todos los equipos.

Evidencia JSON y conclusión en docs/research/REGLAS_TABLAS_2026.md. Igualdad actual
no certifica ausencia de sanciones. No publicar standings BSD como Clausura.
Validación mediante aserciones de integridad/alcance y comparación; no se
repitieron tests de aplicación porque no cambió el código de producto.

## Cierre del contraste de zonas — 2026-09-18

- [x] Leer tablas LPF renderizadas: Apertura/Clausura, grupos A/B, 60 filas.
- [x] Comparar ocho campos por fila con fixtures BSD mapeados: cero diferencias.
- [x] Verificar orden PTS/DG/GF contra posiciones publicadas: coincide en las
  cuatro zonas; ningún empate residual en esta muestra.
- [x] Guardar evidencia, fuentes, fecha y límites en
  docs/research/lpf-zones-validation-20260918.json.
- [x] Motor de acumulados por ámbito con snapshots en memoria, tests de
  nulos/partidos computables y empates no resueltos; no implementar promedios aún.

Cinco consultas BSD, sin escrituras Supabase ni cambios UI. Aserciones de
integridad y comparación aprobadas; no corresponde repetir build por archivos
de investigación. Fair Play/H2H/sorteo y sanciones futuras no certificados.
El contraste de zonas ya no bloquea implementar el alcance mínimo documentado.


## Motor mínimo de tablas — 2026-09-24

Alcance pequeño: servicio puro de servidor y pruebas. Reutiliza las reglas ya
contrastadas; no necesita dependencias nuevas, migraciones ni credenciales.

- [x] Acumular PJ/G/E/P/GF/GC/DG/PTS por torneo, zona o anual; incluir interzonas.
- [x] Validar calendario revisado, IDs, ámbito, localía, jornada y timestamps.
- [x] Excluir fixtures ajenos/eliminatorias no mapeadas y rechazar duplicados.
- [x] Bloquear filas ante cobertura incompleta, resultado nulo o estado incierto.
- [x] Orden PTS/DG/GF; empate residual sin posición asignada. Ajustes no verificados
  explícitos y posiciones oficiales siempre null.
- [x] Conservar fuente, fecha de revisión, fecha de cálculo y observación más antigua.
- [x] 43 pruebas aprobadas (9 nuevas), lint, typecheck y build aprobados.
- [x] Orden contrastado con las 60 filas históricas del 18/09; no son datos actuales.

Código y contrato en src/server/standings. No consultas a BSD/GOAL, cambios en
Supabase ni tablas visibles nuevas. La DB actual contiene partidos de Newell's,
no resultados suficientes de toda la liga. complete indica cobertura frente al
calendario entregado, no oficialidad, frescura ni ausencia de sanciones.

Siguiente bloque: adaptador y dry-run sobre catálogo completo actualizado, con
calendario/membresías revisados y contraste oficial. Luego definir persistencia y
publicación con frescura y ajustes visibles. H2H/Fair Play/sorteo, sanciones,
promedios y ratings siguen pendientes; no se asumieron reglas nuevas.

## Catálogo completo y dry-run — 2026-09-24

Alcance evaluado: bloque acotado de lector paginado, adaptación, revisión externa
y pruebas; riesgo principal en cobertura y cambios de identidad del proveedor.
Sin dependencias nuevas, migraciones ni cambios UI. Base inspeccionada limpia:
`c7d64a0`. Documentación de trabajo en fuentes/; sources/ intacto.

- [x] Consultar catálogo actualizado completo de liga 85/temporada 1635: cinco
  páginas, 496 IDs únicos; un GET previo de inspección (seis GET BSD totales).
- [x] Releer agenda LPF: 480 cruces/localías/jornadas coinciden con el mapeo;
  revisar las membresías de las 60 filas de zonas actuales. Cantidades por
  equipo/jornada/torneo verificadas. No se revisaron todos los horarios futuros.
- [x] Resolver explícitamente Sarmiento–River, Clausura fecha 11: registro
  223766 aplazado sustituido por 604493; nuevo horario oficial 07/10 22:30 UTC.
  BSD tiene replaced_by null en ambos. Excepción manual con controles, sin
  inferencia automática por calendario ni conteo doble.
- [x] Adaptar estados comprobados y los 60 interzonales league-phase; bloquear
  catálogo no revisado, cambios de fase/reemplazo y datos inciertos.
- [x] Ejecutar dry-run sin escrituras remotas sobre el catálogo recién obtenido:
  siete snapshots; 480 encuentros de calendario y 390 finalizados (240 + 150).
  Excluir 15 eliminatorias y el registro aplazado sustituido.
- [x] Contrastar 90 filas oficiales (60 zonas + 30 anual): ocho campos y orden
  coincidentes, cero diferencias. Evidencia del 18/09 conservada como histórica.
- [x] Conservar catálogo sin secretos y configuración/evidencia reproducibles en
  docs/research; comando check-standings documentado, apply rechazado sin red.
- [x] 53 pruebas aprobadas (10 nuevas), lint, typecheck y build aprobados.

Fuentes oficiales: agenda https://www.ligaprofesional.ar/?p=75980,
Apertura https://www.ligaprofesional.ar/torneo-apertura-2026/ y
Clausura https://www.ligaprofesional.ar/torneo-clausura-mercado-libre-2026.
Observación nocturna: 23/09 UTC, 24/09 Europe/Paris. Archivos con fecha local;
timestamps ISO UTC de consultas/revisión/cálculo conservados. Informe:
`docs/research/standings-dry-run-20260924.json`.

Newell's observado: Apertura A 14.º/15 puntos; Clausura A 8.º/16 puntos;
anual 22.º/31 puntos. No implica publicación ni vigencia indefinida.
official_position continúa null y adjustments_status unverified. Igualdad de
puntos no prueba inexistencia de sanciones. No se implementaron promedios,
ratings ni desempates pendientes. Sin modificaciones en Supabase.

Siguiente bloque pendiente: definir persistencia/publicación de snapshots,
frescura y actualización de evidencia oficial/ajustes. No avanzar a publicación
automática con esta observación estática. La paginación no garantiza aislamiento
ante cambios simultáneos del proveedor que mantengan total e IDs.

## Contrato de snapshots y política de lectura — 2026-09-24

Alcance evaluado: bloque pequeño, sin dependencias externas; separar definición
de almacenamiento y lectura antes de crear tablas/publicar datos. Reutilizar
dataState y salidas del motor. Riesgos: rejuvenecer datos al recalcular, mezclar
ámbitos o perder el último resultado válido al fallar una actualización.

- [x] Definir contrato en `src/server/standings/PERSISTENCE.md`: lote inmutable
  de liga, inserción atómica, idempotencia por ejecución, entrada reproducible,
  versión/hashes, auditoría y evidencia oficial ligada al lote. Es diseño;
  todavía no existen migración, tabla, persistencia ni activación implementadas.
- [x] Implementar `standingsSnapshotView`: selección por ámbito, rechazo de
  snapshots incompletos/ajenos y conservación del último válido ante fallos.
- [x] Separar frescura de resultados y revisión con dos TTL explícitos; sin
  valores de despliegue arbitrarios. Recalcular no renueva la observación.
- [x] Preservar etiquetas de cálculo provisional, ajustes sin verificar y
  empates pendientes. Sin datos no se transforma en una tabla de ceros.
- [x] Evitar que una observación anterior desplace a otra más nueva solo por
  tener fecha de cálculo posterior; salida independiente sin mutar entradas.
- [x] 61 pruebas (8 nuevas), lint, typecheck y build aprobados.
- [x] Preparar migración y almacenamiento manual de lotes con validación de
  payload, idempotencia, atomicidad/RLS y pruebas locales.
- [x] Persistir contraste oficial ligado al lote y controlar activación ante
  diferencias: implementado y probado localmente; esquema remoto pendiente.
- [ ] Fijar TTL explícitos de despliegue y conectar lector persistido; luego
  activar esquema/carga remotos y publicar tablas provisionales en UI.

La política nueva funciona en memoria sobre snapshots ya validados del motor;
no es un validador de JSON externo ni habilita publicación por sí sola.
Sin consultas BSD/GOAL/Supabase, cambios remotos, cron o UI en este bloque.
Promedios, ratings, sanciones y desempates inferiores continúan pendientes.
Los cambios de este bloque y del catálogo anterior siguen locales, sin commit.

## Almacenamiento inmutable de lotes — 2026-09-24

AGENTS.md actualizado leído y respetado; cambios del usuario conservados.
Alcance: completar el almacenamiento privado definido en el bloque anterior,
sin activar producto ni requerir decisiones funcionales nuevas. Riesgos evaluados:
escrituras parciales, reintentos que sobrescriben historia, payload inconsistente
y acceso público. Sin dependencias nuevas; PGlite local existente reutilizado.

- [x] Preparar migración `20260924000100_standings_batches.sql`: una fila por
  lote completo/incompleto, JSONB, UUID de ejecución, ámbito externo, versiones,
  hashes y fechas. RLS; service_role solo SELECT/INSERT, sin acceso público.
- [x] Construir lotes con entrada normalizada de liga y todos sus ámbitos;
  conservar observaciones originales, incidencias e IDs excluidos. Campos
  adicionales del catálogo no se copian al payload.
- [x] Validar por recálculo antes de escribir: filas, versiones, identidad y
  hashes; rechazar alteraciones y fecha de cálculo futura.
- [x] Insertar lote atómicamente e implementar reintento idéntico sin duplicar.
  Reutilizar UUID con otro contenido falla, sin UPDATE ni borrado.
- [x] Agregar comando manual `scripts/store-standings.mjs`: dry-run sin red ni
  credenciales y apply privado; sin consultas BSD ni activación/publicación.
- [x] Probar sobre las tres migraciones en PostgreSQL local: siete snapshots
  del catálogo observado, reintento, conflicto, rechazo atómico de filas
  inválidas, RLS/permisos e historial completo conservado ante lote incompleto.
- [x] 67 pruebas unitarias (6 nuevas), prueba PostgreSQL local, lint, typecheck
  y build aprobados. Dry-run reproducible aprobado sin escrituras remotas.
- [ ] Aplicar migración y verificar esquema/permisos en Supabase remoto.
- [x] Implementar contraste oficial persistido ligado al lote y control de
  activación, probado localmente; lector DB y TTL de despliegue pendientes.

complete significa cobertura del motor, no lote habilitado para UI. No existe
publicación en este comando. Los fallos anteriores a construir el lote siguen
sin registro persistido de intento; se devuelven códigos sanitizados. El payload
reproduce el cálculo, no toda la investigación del adaptador: la evidencia de
sustituciones permanece en docs/research. No se agregaron promedios ni ratings.

Sin consultas a proveedores/Supabase en este bloque; migración remota pendiente,
UI intacta. Archivos locales sin commit. Próximo bloque prioritario: contraste
oficial por lote y activación controlada, antes de conectar lectura/publicación.

## Contraste oficial y activación por lote — 2026-09-24

Alcance evaluado: bloque de complejidad media, sin proveedores ni dependencias
nuevas; reutilizar motor, validación de lote y política de frescura. Riesgos:
heredar evidencia vieja, activar datos incompletos o separar la aprobación de
su evidencia. Se conserva historial inmutable con una única escritura por revisión.

- [x] Validar evidencia ligada al ID y hash exactos del lote, con fuente HTTPS,
  fecha, anual y todas las zonas/equipos. No heredar el match histórico.
- [x] Comparar ocho campos y orden básico; registrar diferencias sin cambiar
  puntos ni asignar posiciones oficiales al motor.
- [x] Controlar activación explícita: lote completo, match, resultados/revisión/
  evidencia frescos, evidencia no anterior al catálogo. Tres TTL obligatorios.
- [x] Revalidar vigencia al escribir y rechazar reloj futuro o activación vencida.
- [x] Guardar evidencia, diferencias, política y decisión en una fila privada
  inmutable, con reintento idempotente y conflicto de UUID explícito.
- [x] Preparar migración `20260924000200_standings_official_reviews.sql`: FK a
  ID/hash, trigger que rechaza activar lote incompleto, RLS y permisos mínimos.
- [x] 75 pruebas unitarias (8 nuevas), prueba PostgreSQL de las cuatro
  migraciones, lint, typecheck y build aprobados. SQL verifica hashes ajenos,
  activación de incompletos, auditoría de diferencias y denegación pública.

No se consultaron fuentes externas ni se renovó evidencia deportiva: las pruebas
reutilizan el corte observado y relojes/TTL controlados. HTTPS por sí solo no
certifica una fuente oficial; la transcripción exige revisión explícita.
La activación es provisional, no una posición oficial ni vigencia permanente.
Las migraciones siguen sin aplicar remotamente; no hubo escrituras Supabase.

Próximo bloque: lector persistido por ámbito. Debe considerar la última revisión
de cada lote (también denegaciones), impedir que reaparezcan aprobaciones viejas,
bloquear empates temporales contradictorios y revalidar TTL al leer. Quedan
pendientes comando operativo de revisión, TTL de despliegue, activación remota
y UI. Fallos anteriores a construir lote/revisión aún no tienen auditoría DB.
Cambios locales sin commit; promedios, ratings y sanciones fuera de este bloque.
