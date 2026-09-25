# Movete, Leproso Movete!

Nombre corto: **MLeprosoM**. Usarlo cuando no corresponda el nombre completo.
El identificador del paquete npm es `mleprosom`, en minúsculas por compatibilidad
con las reglas de nombres de paquetes. Repositorio: [dM7u/MLeprosoM](https://github.com/dM7u/MLeprosoM).

## Estado

La ruta `/` muestra la Home inicial con partidos guardados, navegación y tablas
provisionales de liga. Incluye frescura, fuentes y estados Sin datos.
La ficha de partido muestra estadísticas, alineaciones confirmadas y eventos
guardados, con estados independientes de disponibilidad y antigüedad.
El panel completo, seguimiento en vivo y algoritmos propios siguen pendientes.

Este documento describe el producto y sirve como puerta de entrada a la
documentación. El estado operativo de las tareas se mantiene
exclusivamente en `BACKLOG.md`.

## Objetivo

Crear una aplicación web deportiva inicialmente centrada en Newell's Old
Boys que combine datos reales, análisis propios y humor futbolero.

La prioridad es:

**DATOS REALES + DATO NO DISPONIBLE** antes que **DATO INVENTADO +
INTERFAZ COMPLETA**.

La arquitectura debe permitir incorporar otros equipos en el futuro sin
rehacer la aplicación.

## Stack previsto

-   Frontend: Next.js + TypeScript + Tailwind CSS.
-   UI: componentes reutilizables, diseño responsive y PWA.
-   Backend: Supabase PostgreSQL + Edge Functions + Cron cuando
    corresponda.
-   Proveedor futbolístico inicial: API-Football / API-Sports Free.
-   Clima: Open-Meteo.
-   APIs externas: únicamente desde backend.
-   Secretos/API keys: nunca expuestos al cliente.

Las versiones exactas están en `package.json` y `package-lock.json`.

## Desarrollo local

Requisitos: Node 24 LTS (>=24.15, <25) y npm 12. Entorno utilizado:
Node 24.19.0, npm 12.0.2 y Git 2.53.0.windows.3.

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. La página funciona sin `.env.local`.
Verificaciones: `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`.
Para ejecutar la compilación: `npm start`.

En este Windows restringido los procesos auxiliares de Node fallan con
`spawn EPERM`. Para construir aquí, usar en PowerShell
`$env:MOVETE_BUILD_WORKER_THREADS='1'` antes del build: activa workers de Next
en hilos y usa la API de TypeScript 6, sin omitir el chequeo de tipos.
Fuera de este entorno no hace falta. Las pruebas usan el ejecutor nativo de Node
sin aislamiento en procesos: existe una sola suite y restaura el entorno al finalizar.

En el entorno de esta tarea Node y Git ya estaban disponibles. npm se preparó
localmente en `.tools/npm` (excluido de Git), sin instalaciones globales.
Aquí se puede reemplazar `npm` por `node .tools/npm/bin/npm-cli.js`.
Un clon nuevo utiliza una instalación normal de Node/npm y `npm ci`.

## Configuración privada

Copiar `.env.example` a `.env.local` solo al conectar los servicios. Nunca
versionar ese archivo ni pegar claves en chats. Las variables no usan
`NEXT_PUBLIC_`; los módulos sensibles tienen la protección `server-only`.

- `SUPABASE_URL`: origen HTTPS del proyecto independiente de Argentoma.
- `SUPABASE_SECRET_KEY`: clave secreta de backend del proyecto.
- `API_FOOTBALL_API_KEY`: reservada; no hay cliente HTTP implementado aún.

El cliente Supabase se crea explícitamente y valida su configuración al ser
usado. Importarlo no conecta ni exige secretos durante el build. Es un cliente
administrativo con privilegios elevados: no exponerlo a rutas o acciones públicas
sin autorización. Acceso autenticado a la Data API verificado con HTTP 200;
todavía no hay tablas ni migraciones, ni operaciones sobre datos verificadas.

El usuario creó el proyecto independiente y cargó la configuración en `.env.local`.
Las credenciales se ingresan allí o en un gestor de secretos, nunca en el chat.
El remoto `origin` apunta a `https://github.com/dM7u/MLeprosoM.git`, indicado por
el usuario. La consulta de referencias remotas funcionó y no devolvió ramas.
El primer commit de la fundación es `b62eaea`. La rama `main` está publicada y
sigue `origin/main` en [dM7u/MLeprosoM](https://github.com/dM7u/MLeprosoM).

## Documentación de trabajo

Los documentos de `fuentes/` son las únicas versiones de trabajo; `fuentes/BACKLOG.md`
es la fuente de verdad del avance. `sources/` conserva las referencias
sincronizadas de solo lectura y queda fuera de Git. No editar esas referencias.
Git contiene el primer commit de la fundación técnica. La escritura de Git
requiere ejecución con permisos ampliados en este
entorno. Para HTTPS se usa el Git instalado en `C:/Program Files/Git/cmd/git.exe`.
La identidad del autor está configurada únicamente para este repositorio.

## Versiones y fuentes consultadas (2026-09-17)

- Next.js 16.3.5 y React 19.3.0: [instalación oficial](https://nextjs.org/docs/app/getting-started/installation).
- Tailwind 4.3.3: [integración oficial](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
- ESLint 9.39.5 y configuración Next 16.3.5: [configuración oficial](https://nextjs.org/docs/app/api-reference/config/eslint).
  Se evitó ESLint 10.10.0 por incompatibilidades declaradas de plugins transitivos.
  npm marca ESLint 9 como fuera de soporte; actualizar cuando los plugins de Next
  soporten ESLint 10. No se forzaron versiones transitivas incompatibles.
- TypeScript 6.0.3: se evitó 7.0.2 porque `@typescript-eslint/parser` 8.70.0
  declara compatibilidad con TypeScript >=4.8.4 y <6.1.0.
- Supabase JS 2.116.0: [inicialización](https://supabase.com/docs/reference/javascript/initializing)
  y [claves de API](https://supabase.com/docs/guides/getting-started/api-keys).
- Versiones y compatibilidad contrastadas con el [registro npm](https://registry.npmjs.org/).
  Las dependencias directas están fijadas y el lockfile conserva las transitivas.

## Arquitectura general

`PROVEEDOR → NORMALIZACIÓN → CACHE/DB → SERVICIOS → API INTERNA → UI`

La UI no debe depender de endpoints, identificadores ni formatos propios
del proveedor externo.

## Funcionalidades principales

### Home

-   Navegación lateral.
-   Próximo partido: rival, local/visitante, fecha/hora, torneo y
    posiciones.
-   Posible XI únicamente cuando exista evidencia suficiente.
-   Calificaciones/promedios cuando existan.
-   Técnico y valoración propia cuando esté implementada.
-   Tablas Apertura, Clausura, Anual y Promedios.
-   General y zonas/grupos cuando corresponda.
-   Contexto de descenso.
-   Noticias categorizadas.

### Panel de equipo

-   Últimos 3 partidos.
-   Próximos 3 partidos.
-   Posición contextual.
-   XI más utilizado.
-   Técnico.
-   Estadísticas de jugadores.
-   Drilldowns.

### Partido en vivo

Será la vista predeterminada cuando Newell's esté jugando. - Marcador,
minuto/estado y eventos. - Titulares, suplentes, sustituciones y
calificaciones cuando existan. - Estadísticas disponibles del partido. -
Estadio y clima. - Árbitro e históricos cuando haya datos. - Ranking
propio "Jugador a putear", una vez definido y validado su algoritmo.

La sincronización se rige por `DATOS_EN_VIVO.md`.

### Participación

-   Votación de usuarios "Jugador HDP de la fecha".
-   Es un sistema separado del ranking algorítmico "Jugador a putear".

### Noticias

-   Clasificación por categorías como lesiones, fichajes e
    infraestructura.
-   Diferenciar información oficial de fuentes periodísticas/sociales.
-   Conservar fuente y fechas.
-   Redes sociales e Instagram solo se utilizarán si su acceso resulta
    técnica y legalmente viable.

### Perfiles de jugadores

Cuando sean públicos y verificables: - trayectoria; - condición de
canterano; - monto de llegada; - contrato; - préstamo y condiciones
públicas.

Si un dato no puede verificarse: `Sin datos`.

## Ratings propios

Las calificaciones de jugadores, el índice "Jugador a putear" y la
valoración del técnico son algoritmos propios.

No se definirán fórmulas, pesos ni reglas definitivas hasta relevar qué
datos reales están disponibles y realizar una tarea específica de diseño
y validación.

Las estadísticas oficiales y los cálculos propios deben mostrarse
claramente diferenciados.

## Competición argentina

El modelo no debe asumir una estructura europea.

Debe soportar de forma configurable por temporada: - Apertura; -
Clausura; - zonas/grupos; - tabla general/anual; - promedios cuando
correspondan; - descenso; - fases eliminatorias; - cambios de formato
entre temporadas.

## Estados de datos

Todos los componentes deben contemplar: - loading; - empty; - error; -
stale; - datos parciales; - dato no disponible.

La ausencia de un dato nunca debe representarse como cero.

## Documentación

-   `README.md`: visión general y entrada al proyecto.
-   `ARQUITECTURA.md`: límites y decisiones técnicas.
-   `MODELO_DE_DATOS.md`: modelo conceptual y reglas de persistencia.
-   `DATOS_EN_VIVO.md`: sincronización de partidos.
-   `BACKLOG.md`: única fuente de verdad del estado del trabajo.

`PROVEEDORES.md` contiene la investigación y la cobertura verificada de los proveedores.

## Forma de trabajo

Antes de cada bloque: 1. revisar `BACKLOG.md` y el código relevante; 2.
determinar qué información ya existe; 3. estimar alcance, dependencias y
riesgo; 4. elegir la solución más simple que cumpla el objetivo; 5.
implementar únicamente el bloque necesario; 6. verificarlo; 7.
actualizar `BACKLOG.md`.

No avanzar automáticamente cuando una decisión pendiente pueda cambiar
la implementación.

## Carpeta local principal

Desde 2026-09-18, trabajar en `C:\MLeprosoM`. Los seis documentos del proyecto
se mantienen únicamente en `C:\MLeprosoM\fuentes` y se versionan en Git.
Editar directamente esos archivos; no hay copias en la raíz ni sincronización.
Las rutas de código mencionadas en estos documentos parten de la raíz del repositorio.
El directorio original del espejo ChatGPT se conserva solo como respaldo.
La tarea actual de Codex no cambia automáticamente de directorio: para futuras
tareas, abrir `C:\MLeprosoM` como proyecto local en la aplicación.
