# BACKLOG — MLeprosoM

Fuente de verdad del estado y prioridades. Consolidado el 01/10/2026.
Historial preservado íntegro en [archivo](../docs/history/BACKLOG_HASTA_20260929.md);
no usar sus pendientes antiguos como cola vigente. Código y evidencia prevalecen.

## Inicio rápido

1. Leer AGENTS.md y este archivo; consultar solo contratos relevantes al bloque.
2. Revisar Git antes de modificar. No asumir limpio ni descartar trabajo anterior.
3. Consultar [TRABAJO_Y_MODELOS.md](TRABAJO_Y_MODELOS.md) para tarea/modelo y avisos.
4. Cerrar entregables completos con validación proporcional. Actualizar este estado
   en lugar de agregar otro relato cronológico; evidencia extensa en docs/research/.

## Estado comprobado

- BSD para liga, GOAL API para Copa; identidades/ámbitos revisados. No hay scheduler
  deportivo. API-Football Free no dio acceso a 2026 en la investigación previa.
- Home: navegación, próximo partido, últimos/próximos tres, historial, tablas,
  posición contextual y comparativa anual. Ficha: estadísticas, alineaciones y eventos.
- Motor de zonas/anual, lotes y revisión oficial persistidos. Activación provisional;
  vigencia al leer. No afirmar que los datos fechados siguen fresh hoy.
- Estadísticas, alineaciones y eventos: SQL aplicado en Supabase, auditorías 76/76,
  reconstrucción/equivalencia 32/32 por recurso y retry idempotente verificados.
  Lectores projection activos solo localmente. Home conserva historial de alineaciones.
  NO repetir SQL en supabase/pending/: ubicación no implica pendiente de aplicación.
  Importar los tres recursos con --storage=projection. Nuevos fixtures requieren
  bootstrap explícito antes de servirlos por proyección, incluso vacíos.
- Concurrencia nativa local y escala de detalle verificadas. Sin despliegue a otros
  entornos ni promesa de latencia remota. Rollback de lector no reabre INSERT directo.
- XI periodístico: almacenamiento/UI implementados; TTL 48 h y corte por kickoff.
  Falta evidencia vigente para prueba positiva real. No existe canal oficial directo.
- Chequeo de disponibilidad Supabase por Actions cada seis horas verificado el 27/09;
  no sincroniza deporte. Preferencias personales de notificación no verificadas.
- Consolidación T01 (01/10): diff y evidencia de activación contrastados; 202 pruebas,
  lint, typecheck y build aprobados. El primer build quedó bloqueado por `spawn EPERM`
  del sandbox después de compilar; el reintento autorizado completó el build.
  No se reejecutaron SQL remotos ni benchmarks. La evidencia fechada no certifica
  frescura actual, despliegue público o rendimiento de red.
- T06 (01/10): preparación local de demo, guía de Preview y ajustes móviles.
  Home/ficha comprobadas con datos guardados a 430×932 y 390×844 en Chromium;
  no hay desborde de página. Lint, typecheck y build aprobados. Dry-run y apply
  manuales de BSD (32 fixtures) y GOAL API (uno) completados el 01/10; Home
  respondió 200 y mostró ambas fuentes actualizadas. Las tablas aún usan
  resultados observados el 24/09. La Preview se creó con autorización el 02/10;
  el PO confirmó el 02/10 que Safari físico y el enlace de invitado funcionan.
- Corrección del próximo rival (01/10): comparación enlazada a la tabla general
  del torneo clasificado; sin torneo/tabla compatible muestra `Sin datos`. Caso
  de playoffs queda pendiente de identificación explícita, sin fallback anual.
- T02 (01/10): evaluación documental terminada por pedido explícito del PO.
  El PO aprobó el 02/10 posponer optimización y priorizar T04 después de T06.
  T02 cerrada con esa decisión. Home ya comparte lectura de tablas. Escala sintética costosa,
  sin demanda actual demostrada que justifique nueva infraestructura. T03 no
  habilitada; propuesta, límites y condiciones de reapertura en
  [decisión T02](../docs/research/STANDINGS_DECISION_T02_20261001.md).
- Logo aportado por el PO (`public/brand/Leproso.png`) integrado sin alterar
  original; cabecera móvil/escritorio e iconos de navegador. Escudos locales
  Newell's/Lanús reemplazados por PNG aportados desde FM26 el 02/10; procedencia
  en `public/crests/README.md` y créditos visibles en `/creditos`. Falta revisar
  su uso para distribución pública y faltan escudos del resto de equipos; la UI
  conserva nombres donde no hay recurso.
- Vercel vinculado por el PO el 02/10 sin despliegue automático. Ocho variables
  Preview confirmadas por `vercel env ls preview` sin leer valores; las dos de
  Supabase figuran como Secret. El PO confirmó Standard Protection. Dry-run
  inicial incluía `.tools/` (~1 GB);
  `.vercelignore` lo redujo a 115 archivos/2,06 MB, con logo y dos escudos dentro,
  sin `.env.local` ni `.tools/`. Preview autorizada READY el 02/10 tras ampliar
  engine npm a 11–12, como requiere el npm 11 de Vercel. Home, créditos y una
  ficha respondieron por CLI; una sesión ajena llegó al login. El primer intento
  se registró como Production y falló en instalación, sin sitio funcional. El PO
  confirmó que el enlace compartido abrió en Chrome y Safari, también como invitado.

## Cola vigente

| ID | Entregable | Estado / criterio de salida |
| --- | --- | --- |
| T01 | Consolidar cambios locales y documentación | Cerrada localmente el 01/10. Diff, evidencia y checks revisados; cambios preservados sin commit ni push. |
| T06 | Preparar demo web compartible para el sábado 03/10 | Cerrada el 02/10: Preview protegida READY; el PO confirmó acceso en Chrome, Safari físico y como invitado. URL y validación en docs/DEMO_SABADO_20261003.md. Fixtures actualizados el 01/10; tablas observadas el 24/09. Los cambios posteriores de T04/T07 requieren nueva Preview. |
| T02 | Decisión de optimización de standings | Cerrada: el PO aprobó el 02/10 posponer T03 y priorizar panel después de T06. Sin contrato nuevo de lectura ni SQL remoto. Ver decisión T02. |
| T03 | Implementar standings según T02 | No habilitada. Requiere que el PO priorice optimización y cerrar contrato T02 antes de implementar. Luego pruebas, operación y revisión crítica antes de proponer corte remoto. |
| T04 | Completar panel con datos disponibles | Cerrada localmente el 02/10: Home muestra once jugadores según titularidades y, a igualdad, última titularidad más reciente; cobertura 11/26. Estadísticas individuales y técnico muestran `Sin datos`; drilldowns requieren fuente persistida. No introducir ratings. |
| T07 | Rediseño de Home para la demo | Home ajustada y publicada en Preview protegida el 02/10 por autorización del PO: https://mleprosom-a0zums5bp-d-m7.vercel.app . Build remoto READY; Home verificada por CLI (XI, Kudelka, campo, Acassuso, 32avos, escudo Lanús, noindex). Nombre en una fila, navegación baja, resultado coloreado, camisetas y DT dentro de la cancha, media cancha y arquero en área chica. XI de Lanús corregido al local de BSD 223725 (una copia previa contenía el XI de Estudiantes). Copa con escudos y 32avos oficiales ante Acassuso. Escudos de 30 equipos de Primera y Acassuso vinculados por ID; Estadio/Pronóstico/Árbitro separados, Liga/Copa compactas, pie dM7. El PO hizo commit y push; `main` coincidía con `origin/main` al iniciar T05. El PO confirmó que la Preview funciona en Safari el 03/10. Quedan navegación transversal, Equipo, Vivo y modales por diseñar/validar. Ver [T07](../docs/design/T07_HOME_Y_PANEL_TRANSVERSAL_20261002.md). |
| T05 | Verificar caso positivo del XI periodístico | Cerrada el 03/10: nota de La Capital/Ovación del 02/10, 12:09 −03:00, con probable XI explícito de Newell's–Lanús. Evidencia local revisada en `docs/research/la-capital-xi-223765-20261002.json`; fuente conserva “Mazzanti” tal como aparece, sin inventar ID. Dry-run local y remoto elegibles. Refresco BSD manual de 32 fixtures (3 GET) y revisión editorial remota `ba1aac7c-1223-4aa1-8ca0-121e988f4154` guardada (1 escritura). Lectura real devolvió `available`, 11 nombres y fuente. El fixture caduca a los 15 minutos sin scheduler: Home vuelve a `Sin datos` hasta otro refresco; el XI deja de ser actual al inicio del partido. No afirmar que sea alineación oficial. |
| T09 | Definir e implementar el corte de datos en vivo | [Contrato técnico](../docs/design/T09_CONTRATO_VIVO_20261003.md) preparado: Supabase Cron/Edge propuesto, 150 s activos, solo estado en HT, presupuesto 500/sesión, lease/fence y snapshots operativos independientes del catálogo/historial. Una lectura real el 03/10 a las 10:41 UTC confirmó cuota 7.500/día y saldo informado 7.500; fixture 223765 NS, kickoff 20:00 UTC. [Evidencia](../docs/research/T09_BSD_CUOTA_20261003.json). Próximo bloque: implementación local y tests de exclusión, parciales, fases y recuperación; luego preflight/activación autorizada. Pendiente elección del PO: autónomo en Supabase o PC encendida, y contraste de códigos HT/2H/ET/P. No hay scheduler ni Vivo activados. Sol ligero para implementación, Astra para revisión de concurrencia antes del corte remoto. |
| T10 | Secciones Equipo y Partido en Vivo | Diseño del PO recibido el 03/10; ver [T10](../docs/design/T10_EQUIPO_Y_VIVO_20261003.md). Primera versión local de `/equipo`: cabecera compartida, 3 jugados + 3 próximos con fichas, ventana de tabla y vacíos explícitos para foto/medias/técnico. Tres paneles superiores en una fila. Panel del once con Mejor 11 por defecto, Peor 11 y Más utilizados; los dos primeros muestran «Sin datos» hasta contar con calificaciones propias. Más utilizados dibuja el 4-2-3-1 observado 11/11, titulares por puesto; Thomas Ríos identificado por revisión del PO/plantel y ligado solo en presentación al ID BSD 90520. Cuatro pruebas de conteo previas; typecheck, build y cambio de vista local verificados tras añadir botones. Vivo: diseño documentado, activación dependiente de T09; ratings/ranking permanecen Sin datos sin impedir el resto de la vista. No publicado, sin commit/push. |
| T08 | Relevar cobertura de estadio, pronóstico y árbitro para Home | En curso, independiente del diseño de Equipo/Vivo. La muestra BSD 223765 solo guarda fixture/equipos/horario; el esquema `fixtures` no tiene estadio ni árbitro y Home muestra `Sin datos` en las tres tarjetas. LPF identifica el estadio habitual y La Capital menciona sede/árbitro para este partido; falta contraste oficial específico de la designación y contrato de almacenamiento. Open-Meteo depende de coordenadas verificadas; V/E/D requiere historial. Ver [corte T08](../docs/research/T08_CONTEXTO_HOME_20261003.md). |

T02 cerrada; T03 pospuesta porque volumen remoto actual y frecuencia prevista no
justifican nueva infraestructura con la evidencia disponible. T04 fue retomada
por pedido del PO. El PO definió «XI más utilizado» como los once jugadores con
más titularidades. Once partidos tienen titulares utilizables entre 26 terminados
de BSD: siete alineaciones completas y cuatro parciales. Ocho jugadores superan
el corte; cinco empatan por cantidad para los tres lugares restantes. El PO
definió el desempate por partido de titularidad más reciente; la muestra actual
produce once únicos. Un empate en la misma fecha seguirá visible sin orden
deportivo inventado. Home informa la cobertura y el criterio.
No hay tablas de jugadores, técnicos ni rendimientos individuales. Ver
[cobertura T04](../docs/research/T04_COBERTURA_PANEL_20261002.md).
Checks T04: 12 pruebas pertinentes, typecheck, build y Home local HTTP 200 con
conteo 11/26 y criterio de desempate visible. La Preview posterior de T07 incluye
los cambios publicados desde entonces.

### Ajustes pedidos para T06 — 01/10

- «Newell’s y el próximo rival»: tabla general del torneo verificado del próximo
  partido (Apertura/Clausura) implementada, conserva orden local/visitante y no
  recurre a anual. Sin clasificación/tabla apta muestra `Sin datos`; liga, Copa y
  fase desconocida cubiertas por prueba. Si luego se identifica un playoff y hay
  tabla anual compatible, agregar ese contexto explícito en su tarea, sin alterar
  motor ni desempates.
- Logo de la web: original RGBA 1024×1536 conservado e integrado con `next/image`;
  revisión visual en móvil 430 px y escritorio 1280 px aprobada. Variante recortada
  para icono puede evaluarse luego si la legibilidad lo requiere.
- Escudos: el PO dispone de archivos de FM26, pero se eligió empezar por recursos
  con ficha de origen y estado de reutilización por imagen. Newell's y Lanús
  incorporados desde Commons para la demo; identidad BSD revisada y catálogo
  estático con procedencia. Completar resto de equipos gradualmente tras verificar
  cada fuente; no usar un campo inexistente de `teams` ni cargar URLs externas en
  visitas. Nombre visible cuando falte imagen.

## Mediciones y contratos de consulta puntual

- Activaciones: docs/research/{statistics,lineup,incident}-activation-20260928.json.
- Detalle atómico: src/server/db/HISTORY_PROJECTION.md (contrato inicial y notas fechadas).
- Escala: docs/research/{STATISTICS,LINEUP,INCIDENT}_PROJECTION_VOLUME_20260928.md.
- Standings: src/server/standings/PERSISTENCE.md y docs/research/STANDINGS_VOLUME_20260929.md.
  5000 revisiones: 102 consultas/~108,6 MB; 100 lotes/99 denegados: 103/~18,7 MB.
  Medición local, 33 lecturas y 30 probes; no certifica concurrencia global ni SLO.
  Prioridad evaluada en docs/research/STANDINGS_DECISION_T02_20261001.md: conservar
  lector e ingesta manual aprobado por el PO el 02/10. Reabrir por necesidad de aislamiento,
  ingesta frecuente/concurrente o costo representativo que afecte Home/consumo.
- Operación/SQL: scripts/README.md y supabase/pending/README.md; buscar la actualización
  de activación del recurso. No ejecutar pasos históricos supersedidos.
- Editorial: src/server/editorial/PERSISTENCE.md. Reglas deportivas: docs/research/REGLAS_TABLAS_2026.md.

## Pendientes de producto y decisiones conservadas

- Vivo: cobertura/cuota vigentes, scheduler y exclusión, polling, HT→2H, ET/P,
  finalización, errores/backoff, cache y estados UI; respetar DATOS_EN_VIVO.md.
- Panel: XI más utilizado, estadísticas de jugadores, técnico y drilldowns pendientes.
  Últimos/próximos tres y posición contextual ya existen en Home.
- Ratings de jugador/técnico y Jugador a putear: relevar variables, definir/validar
  metodología, versionar y probar antes de implementar. Fuera del alcance actual.
- Votación HDP: independiente del algoritmo; candidatos/ventana/identidad/anti-abuso,
  resultados y auditoría por definir.
- Árbitro/estadio/clima: cobertura verificable; históricos separados de temporada y
  partido actual, muestra con rival, Open-Meteo cuando corresponda.
- Noticias: fuentes/categorías, confianza/moderación, atribución, deduplicación,
  canal oficial y viabilidad de automatización/redes. No asumir scraping libre.
- Perfiles: identidad, trayectoria/canterano y datos contractuales/económicos solo
  verificables, con fuente/fecha; ausencia = Sin datos.
- Tablas: sanciones/posiciones oficiales, históricos de promedios y desempates aún
  pendientes. No inventar reglas ni tomar ausencia de hallazgos como ausencia de sanción.
- Calidad: responsive integral, PWA, observabilidad y seguridad continuas, pruebas
  según riesgo; actualizar ESLint cuando compatibilidad esté comprobada.
- Ampliar entidades/proveedores y TTL solo con cobertura/necesidad real.

## Entrega de contexto al próximo chat

Base conocida a1d2800; cambios locales de proyecciones/eventos, mediciones y
documentación consolidados sin commit/push. Ver Git actual y conservar
sources/ como read-only. Configuración privada no se imprime. No repetir SQL aplicado
ni implementar ratings, promedios o desempates pendientes. T06 tiene UI y runbook
locales listos; fixtures refrescados el 01/10 y tablas aún fechadas el 24/09.
La Preview protegida está READY; el PO confirmó Safari físico y acceso de invitado.
No hay despliegue funcional de Production. Para revisar el acceso externo
recomiendo Astra con esfuerzo medio:
la app usa clave administrativa solo en servidor y cada visita genera lecturas a
Supabase. T02 cerrada con aprobación del PO el 02/10; T03 pospuesta y no habilitada.
Para retomarla, leer la decisión T02, PERSISTENCE y el lector: falta elegir
alternativa y cerrar corte coherente de ambos historiales, validación y operación.
Si se vuelve a priorizar optimización, reabrir el contrato de T02 con Astra
medio antes de implementar T03 con Sol ligero y revisión crítica Astra.

### Corte 03/10 — después de T05

T07 ya está en `origin/main` y T05 tiene un caso positivo real almacenado. La
lectura Home devolvió `available` justo después del refresco manual BSD, pero
su contexto vence en 15 minutos y al comenzar el partido el XI probable deja
de corresponder. No presentar esa verificación puntual como disponibilidad
continua de la demo. No se modificó código ni se hizo commit/push en T05.

Safari de la Preview fue confirmado por el PO el 03/10. El ensayo vivo solicitado
por el PO abrió T09 como prioridad inmediata antes del partido: contrato de
cuota/concurrencia con Astra medio y ejecución posterior con Sol ligero. T08
continúa independiente; diseños de Equipo y Partido en Vivo quedan por definir.
T03 sigue pospuesta.

El PO definió Equipo y Vivo el 03/10. T10 habilita la navegación a Equipo y
reutiliza los datos persistidos sin inventar ratings. La pantalla en vivo queda
dependiente de T09; puntuaciones y ranking requieren su metodología. No activar un indicador
de juego ni entrada predeterminada con un horario o snapshot stale.
La corrección del Once más utilizado adopta el XI por puesto en la formación
4-2-3-1 observada, sin reubicar jugadores. El PO corrigió la identidad y el
puesto de Thomas Ríos; BSD trae «Lautaro Rios» para el ID 90520/dorsal 39 y
el club tiene fuentes contradictorias. Se conserva el crudo y se aplica el
nombre revisado solo a la proyección del panel. La cobertura es 11/26, no una
estadística oficial completa de la temporada.

### Ajuste local de Home — 03/10

El XI del último partido se orienta desde la pantalla con Ortega y Mazzantti a
la derecha y Solari a la izquierda; las filas de BSD se invierten solo para su
presentación, sin alterar nombres ni datos guardados. Bordes de tarjetas Home
en rojo apagado `#704047`. Typecheck y vista local 3101 verificados; cambio aún
sin publicación, commit ni push. La Preview anterior conserva el diseño previo.
