# AGENTS.md — Movete, Leproso Movete!

## Contexto del proyecto

Este directorio es un espejo local del proyecto de ChatGPT **“Movete, Leproso Movete!”**.

- Tratar todo archivo bajo `sources/` como material de referencia **read-only**.
- No editar, renombrar, mover ni eliminar archivos sincronizados dentro de `sources/`.
- Esos archivos pueden ser reemplazados la próxima vez que se cree una tarea desde el proyecto de ChatGPT.
- Si existe una copia editable de documentación fuera de `sources/`, modificar esa copia y no la sincronizada.

## Roles

El usuario cumple el rol de **Product Owner**.

El agente/Codex cumple el rol de **desarrollador senior full-stack especializado en apps deportivas, dashboards y datos en tiempo real** y es responsable de:

- arquitectura técnica;
- implementación;
- refactors necesarios y acotados;
- migraciones;
- integraciones;
- tests;
- validación técnica;
- mantenimiento de `BACKLOG.md`.

No trasladar trabajo de programación al Product Owner salvo que haga falta una decisión funcional, una autorización externa o una credencial/configuración que solo él pueda proporcionar.

## Objetivo

Crear una app web inicialmente centrada en **Newell's Old Boys** que combine:

- datos reales;
- análisis propios;
- dashboards deportivos;
- información en vivo;
- humor futbolero.

Su diferencial será detectar y rankear malos rendimientos mediante sistemas propios, sin inventar información ni confundir cálculos propios con estadísticas oficiales.

La arquitectura debe permitir incorporar otros equipos en el futuro sin rehacer la aplicación.

## Fuentes de verdad

Antes de trabajar, leer y respetar:

- `BACKLOG.md`: fuente de verdad del **estado, prioridades, tareas y decisiones pendientes**.
- `README.md`: visión general y alcance funcional.
- `ARQUITECTURA.md`: arquitectura, fronteras técnicas y reglas de integración.
- `MODELO_DE_DATOS.md`: modelo conceptual y reglas de persistencia/procedencia.
- `DATOS_EN_VIVO.md`: contrato específico de sincronización de partidos en vivo.
- El **código existente**: fuente de verdad sobre lo realmente implementado.

No asumir que una funcionalidad documentada ya existe en código.

Si documentación y código divergen, analizar la causa antes de modificar.

## Reglas generales

- El código y los datos reales son la fuente de verdad.
- No inventar datos, archivos, funciones, endpoints, componentes, dependencias ni capacidades del proveedor.
- Antes de modificar algo, analizar cómo interactúa con el resto.
- Evitar reescrituras grandes cuando una modificación localizada alcance.
- Reutilizar lo existente y evitar duplicación.
- No hardcodear información variable.
- Si un dato no existe, mostrar `Sin datos`.
- Nunca representar ausencia de dato como cero.
- Diferenciar claramente:
  - estadísticas oficiales;
  - fuentes externas;
  - cálculos propios;
  - votos de usuarios.
- No implementar tareas prematuramente si antes falta investigar, decidir o definir requisitos.
- Trabajar por bloques pequeños, verificables y prioritarios.
- Mantener compatibilidad con lo existente salvo una razón técnica explícita.
- Si aparece un problema preexistente no relacionado con la tarea, registrarlo o señalarlo, pero no corregirlo automáticamente salvo que bloquee el trabajo.
- Después de cambios relevantes, verificar imports, tipos, rutas, dependencias, build y tests afectados.
- Antes de realizar trabajo importante, estimar alcance, dependencias, riesgo y elegir el enfoque que minimice retrabajo.

## Gestión del trabajo

Antes de comenzar una tarea:

1. Revisar `BACKLOG.md`.
2. Inspeccionar el código y archivos relevantes.
3. Determinar qué información ya existe.
4. Estimar alcance, dependencias y riesgo.
5. Elegir la solución más simple que cumpla el objetivo.
6. Evitar investigaciones que no afecten decisiones reales.
7. Implementar solo el bloque necesario.
8. Verificar el resultado.
9. Actualizar `BACKLOG.md`.

No avanzar automáticamente a una tarea posterior cuando una decisión pendiente pueda afectar su implementación.

`BACKLOG.md` debe reflejar el estado real, no el estado deseado.

## Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- componentes reutilizables
- PWA

### Backend
- Supabase PostgreSQL
- Supabase Edge Functions cuando corresponda
- Cron/scheduler cuando corresponda

### Datos externos
- Fútbol: **API-Football / API-Sports Free** como proveedor inicial.
- Clima: **Open-Meteo**.

No asumir versiones concretas de librerías o frameworks sin revisar el proyecto real o documentación actual.

## Arquitectura obligatoria

`PROVEEDOR → NORMALIZACIÓN → CACHE/DB → SERVICIOS → API INTERNA → UI`

Reglas:

- Las APIs externas se consultan solo desde backend.
- Nunca exponer API keys al cliente.
- La UI no debe depender de endpoints ni formatos específicos del proveedor.
- Mantener una capa de proveedor que permita cambiar de fuente sin rehacer la aplicación.
- Una visita de usuario nunca debe disparar directamente una consulta al proveedor.
- Centralizar sincronizaciones.
- Reutilizar cache y datos persistidos.
- Registrar procedencia y frescura.

## Modelo de datos

Modelar, cuando la cobertura real lo justifique:

- temporadas;
- competiciones;
- fases;
- zonas/grupos;
- equipos;
- jugadores;
- técnicos;
- árbitros;
- estadios;
- partidos;
- eventos;
- alineaciones;
- rendimientos por partido;
- standings;
- tabla anual;
- promedios/descenso cuando corresponda;
- clima;
- sincronizaciones;
- ratings propios;
- noticias;
- votaciones.

Para entidades externas conservar, cuando corresponda:

- `provider`;
- `external_id`;
- timestamps.

No crear tablas o campos “por si acaso”.

## Competición argentina

No asumir estructura europea.

El modelo debe soportar, según temporada:

- Apertura;
- Clausura;
- zonas/grupos;
- tabla general;
- tabla anual;
- promedios;
- descenso;
- fases eliminatorias;
- cambios de formato.

No asumir una cantidad fija de equipos ni zonas.

## Calificaciones de jugadores

Las calificaciones de jugadores serán un **algoritmo propio**.

No definir todavía:

- fórmula;
- pesos;
- escala;
- penalizaciones;
- reglas definitivas.

Primero:

1. relevar datos reales disponibles;
2. identificar variables útiles;
3. diseñar metodología;
4. validarla;
5. documentarla;
6. agregar tests.

La misma regla aplica a **`Jugador a putear`**.

No introducir una fórmula arbitraria durante etapas anteriores.

## Rating del técnico

Será un índice propio.

Cuando llegue su tarea específica podrá usar, si están disponibles, variables como:

- puntos por partido;
- victorias;
- diferencia de gol;
- forma;
- posición;
- rendimiento local/visitante.

La metodología debe ser explícita, versionada y explicable en el drilldown.

No definirla antes de relevar los datos reales.

## Votación “Jugador HDP de la fecha”

Es un sistema de participación de usuarios **independiente** de `Jugador a putear`.

No mezclar voto popular con ranking algorítmico.

Antes de implementarlo definir:

- partido/fecha;
- candidatos;
- ventana de votación;
- identidad/unicidad;
- anti-abuso;
- resultados;
- auditoría.

## Posible XI

Nunca inventar una alineación.

Prioridad de fuentes:

1. proveedor, si ofrece probable XI real;
2. información oficial;
3. periodistas/fuentes confiables;
4. eventual estimación propia únicamente si se diseña una metodología posterior, verificable y claramente marcada como cálculo propio.

Sin evidencia suficiente: `Sin datos`.

## Noticias

El producto incluirá noticias de Newell's categorizadas.

Categorías iniciales posibles:

- lesiones;
- fichajes;
- infraestructura.

Cada noticia debe conservar:

- fuente;
- tipo de fuente;
- fecha de publicación;
- fecha de ingesta;
- categoría;
- estado de validación;
- información necesaria para deduplicación.

Distinguir fuente:

- oficial;
- periodística;
- social.

Instagram/redes sociales solo se utilizarán si existe una vía técnica y legalmente viable.

No asumir scraping libre ni acceso a APIs inexistentes.

## Perfiles de jugadores

Podrán mostrar, cuando sea público y verificable:

- trayectoria;
- condición de canterano;
- monto de llegada;
- contrato/vencimiento;
- préstamo;
- club de origen/destino;
- condiciones públicas.

Cada dato económico o contractual debe conservar fuente y fecha.

Si no puede verificarse: `Sin datos`.

Nunca inferir información contractual.

## API y partidos en vivo

La cuota del proveedor es limitada.

Un único proceso backend sincroniza cada partido activo relevante.

Los usuarios nunca generan requests directas al proveedor.

Las reglas detalladas de sincronización, polling, HT, 2H, ET/P, finalización, `lastKnownGoodData`, backoff, cache y observabilidad están en `DATOS_EN_VIVO.md` y deben respetarse.

No duplicar ni reinterpretar esas reglas en código sin necesidad.

## Home

Navegación lateral izquierda.

### Próximo partido

Mostrar, cuando exista:

- rival;
- local/visitante;
- fecha/hora;
- torneo;
- posición de Newell's;
- posición del rival;
- posible XI;
- promedio/calificación;
- técnico;
- valoración propia.

La posible formación nunca debe inventarse.

### Tabla

Tabs:

- Apertura;
- Clausura;
- Anual;
- Promedios.

Comportamiento:

- seleccionar automáticamente el torneo en juego;
- en Apertura/Clausura permitir general y zonas;
- mostrar contexto de descenso;
- contemplar últimos 10 de promedios y últimos 5 de anual cuando esos datos existan.

## Panel de equipo

En desktop:

- últimos 3 partidos + drilldown;
- próximos 3 + drilldown;
- posición contextual: superior, Newell's, inferior;
- XI más utilizado;
- rating del técnico + drilldown;
- estadísticas de jugadores + drilldown.

## Partido en vivo — UI

Cuando Newell's juegue, esta vista es la predeterminada.

Mostrar, cuando exista:

- equipos;
- escudos;
- marcador;
- minuto/estado;
- titulares;
- calificaciones;
- eventos;
- suplentes;
- sustituciones;
- minutos;
- estadísticas;
- estadio;
- clima;
- árbitro.

El panel `Jugador a putear` solo se implementa cuando exista un algoritmo definido y validado.

## Árbitro

Cuando haya datos:

- árbitro;
- partidos dirigidos a Newell's;
- resultados;
- tarjetas;
- penales a favor/en contra;
- rojas a favor/en contra;
- historial con rival cuando haya muestra suficiente.

Separar:

- histórico;
- temporada;
- partido actual.

## Estadísticas de partido

Mostrar solo las disponibles, por ejemplo:

- posesión;
- tiros;
- tiros al arco;
- corners;
- faltas;
- offsides;
- pases;
- precisión;
- tarjetas.

Nunca completar faltantes con cero.

## Diseño

Estética:

- deportiva;
- moderna;
- oscura;
- orientada a dashboards;
- alta densidad informativa;
- jerarquía clara.

Identidad inspirada en Newell's:

- rojo;
- negro;
- blanco;
- grises.

Debe sentirse como una herramienta de hincha obsesionado con estadísticas, no como una web institucional.

El humor complementa los datos; no los reemplaza.

## Responsive

### Desktop
- navegación lateral;
- dashboards horizontales.

### Tablet
- grids adaptables.

### Mobile
- navegación colapsada;
- tarjetas apiladas;
- partido en vivo optimizado para lectura rápida.

## Estados de UI

Todos los componentes deben contemplar:

- loading;
- empty;
- error;
- stale;
- datos parciales;
- dato no disponible.

Nunca mostrar un dato inexistente como cero.

## Seguridad

- API keys solo en backend.
- Validar inputs.
- No commitear secretos.
- No registrar secretos en logs.
- Proteger endpoints internos.
- Sanitizar errores.
- Revisar variables de entorno.
- Mantener separación cliente/servidor.

## Observabilidad

Registrar, cuando corresponda:

- sincronizaciones;
- requests;
- errores;
- timestamps;
- proveedor;
- operación;
- consumo/cuota si está disponible;
- estado del fixture;
- timestamp de datos;
- respuestas incompletas.

## Tests

Cubrir progresivamente:

- normalización;
- standings;
- tabla anual;
- estados de partido;
- HT → 2H;
- finalización;
- cache;
- errores;
- rate limits;
- respuestas parciales;
- polling duplicado.

Agregar tests específicos para algoritmos solo después de definir y validar sus metodologías.

## Fases de desarrollo

### Fase 1
- arquitectura;
- DB mínima;
- proveedores;
- Newell's;
- fixtures;
- standings.

### Fase 2
- Home;
- próximo partido;
- tablas;
- panel.

### Fase 3
- vivo;
- cache;
- polling;
- eventos.

### Fase 4
- definición e implementación de ratings;
- `Jugador a putear`.

### Fase 5
- árbitro;
- clima;
- históricos;
- técnico.

### Fase 6
- responsive;
- PWA;
- optimización;
- observabilidad;
- tests.

Antes de cada fase:

- inspeccionar lo existente;
- reutilizar lo implementado;
- evitar cambios estructurales innecesarios.

## Prioridad absoluta

**DATOS REALES + DATO NO DISPONIBLE**

antes que

**DATO INVENTADO + INTERFAZ COMPLETA**

## Regla final para Codex

Ante cualquier tarea:

1. leer `AGENTS.md`;
2. leer `BACKLOG.md`;
3. consultar los documentos específicos que correspondan;
4. inspeccionar el código;
5. decidir el bloque mínimo;
6. implementar;
7. verificar;
8. actualizar `BACKLOG.md`.

Si una decisión de producto o arquitectura pendiente puede cambiar la implementación, detenerse y pedir decisión al Product Owner en lugar de inventarla.
