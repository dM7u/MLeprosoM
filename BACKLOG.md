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
-   [!] Publicación en GitHub pendiente de autenticación de la cuenta.

## Decisiones ya tomadas

-   [x] Nombre corto: **MLeprosoM**, conservando “Movete, Leproso Movete!”
    como nombre completo. Identificador npm: `mleprosom` (minúsculas).
-   [x] Repositorio indicado por el usuario: https://github.com/dM7u/MLeprosoM.
    Remoto local `origin` configurado; publicación todavía pendiente.

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
- Git inicializado sin remoto ni commit inicial: no hay identidad de autor
  configurada. Para el primer commit falta nombre/email de autor; para publicar,
  proveedor, cuenta/organización, nombre, visibilidad y acceso autorizado.
- Los archivos siguen sin seguimiento: `git add` falló por permisos del entorno
  sobre `.git/index.lock`, aun con permiso concedido. No se pudo validar el diff
  staged; build, lint, typecheck y pruebas sí verificaron los archivos del disco.
- Supabase: acceso autenticado verificado después de la configuración privada
  del usuario. `.env.local` sigue excluido de Git. No se crearon tablas ni datos.
- No se inició Bloque 2. Bloque 1 permanece parcial por el registro Git pendiente.

### Continuación: nombre corto y repositorio

- Nombre corto MLeprosoM registrado; package.json y lockfile coherentes con
  `mleprosom`. Referencias sincronizadas en sources/ sin modificar.
- Se resolvió la escritura de configuración Git mediante ejecución con permisos
  ampliados. `origin` apunta al repositorio indicado por el usuario.
- Consulta remota con el Git instalado en Windows: exitosa, sin referencias
  devueltas (sin ramas publicadas). Todavía no se comprobó permiso de escritura.
- No se publicó código. Falta identidad de autor para el primer commit.
- Archivos preparados en el índice de Git; revisión del diff sin errores de
  espacios. `.env.local` no está incluido. El bloqueo inicial de registro de
  archivos quedó resuelto mediante ejecución con permisos ampliados.

### Criterio de salida

Cumplido localmente. Primer commit creado con autor `dM7` y correo
`mp8@live.com.ar`, configurados únicamente en este repositorio. `.env.local`
permanece excluido. El intento de push no publicó cambios: GitHub requiere
autenticación. Falta iniciar sesión mediante un flujo seguro de GitHub y repetir
la publicación; no se requieren contraseñas ni tokens en el chat.

Bloque 1 termina cuando el proyecto puede ejecutarse y verificarse
localmente, la configuración sensible está protegida, la arquitectura
mínima es coherente y el repositorio contiene la documentación vigente.

## BLOQUE 2 --- Cobertura real y modelo mínimo

-   [ ] Investigar documentación actual de API-Football Free.
-   [ ] Verificar límites/cuota reales.
-   [ ] Verificar cobertura de Newell's y competiciones necesarias.
-   [ ] Verificar fixtures.
-   [ ] Verificar standings.
-   [ ] Verificar jugadores.
-   [ ] Verificar alineaciones.
-   [ ] Verificar estadísticas de jugadores/partido.
-   [ ] Verificar técnicos.
-   [ ] Verificar árbitros.
-   [ ] Verificar estadios.
-   [ ] Verificar eventos y estadísticas en vivo.
-   [ ] Crear matriz requerido/disponible/no disponible/fuente
    alternativa.
-   [ ] Crear `PROVEEDORES.md` si la investigación produce información
    estable que deba conservarse.
-   [ ] Ajustar `MODELO_DE_DATOS.md`.
-   [ ] Diseñar primera migración mínima.

## BLOQUE 3 --- Primera cadena de datos real

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

-   Cobertura exacta de API-Football Free.
-   Actualizar ESLint a una rama soportada cuando los plugins de Next sean compatibles.
-   Organización, región y plan del proyecto Supabase independiente; conexión real.
-   Acceso autenticado al repositorio dM7u/MLeprosoM para publicar.
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
