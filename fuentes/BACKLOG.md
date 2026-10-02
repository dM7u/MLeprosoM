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
  faltan Safari físico y enlace de invitado probado.
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
  confirmó que el enlace compartido abrió en Chrome; Safari físico sigue pendiente.

## Cola vigente

| ID | Entregable | Estado / criterio de salida |
| --- | --- | --- |
| T01 | Consolidar cambios locales y documentación | Cerrada localmente el 01/10. Diff, evidencia y checks revisados; cambios preservados sin commit ni push. |
| T06 | Preparar demo web compartible para el sábado 03/10 | Preview protegida READY el 02/10; enlace compartido probado por el PO en Chrome. URL y validación en docs/DEMO_SABADO_20261003.md. Fixtures actualizados el 01/10; tablas observadas el 24/09. Validar Safari físico y completar escudos con procedencia verificada. Antes de T04. |
| T02 | Decisión de optimización de standings | Cerrada: el PO aprobó el 02/10 posponer T03 y priorizar panel después de T06. Sin contrato nuevo de lectura ni SQL remoto. Ver decisión T02. |
| T03 | Implementar standings según T02 | No habilitada. Requiere que el PO priorice optimización y cerrar contrato T02 antes de implementar. Luego pruebas, operación y revisión crítica antes de proponer corte remoto. |
| T04 | Completar panel con datos disponibles | Cerrada localmente el 02/10: Home muestra once jugadores según titularidades y, a igualdad, última titularidad más reciente; cobertura 11/26. Estadísticas individuales y técnico muestran `Sin datos`; drilldowns requieren fuente persistida. No introducir ratings. |
| T07 | Rediseño de Home para la demo | Home implementada localmente: cabecera con logo sin recuadro, próximo partido con hora/día locales, último XI guardado en campo con pulsación para rival, estadio/pronóstico/árbitro con estados vacíos, Liga y Copa resumidas. A 430 × 932 requiere desplazamiento corto, sin desborde horizontal. Revisar con PO y validar Safari físico; navegación transversal, Equipo, Vivo y modales quedan después. Escudos FM26 locales: revisar distribución antes de Preview. Ver [T07](../docs/design/T07_HOME_Y_PANEL_TRANSVERSAL_20261002.md). |
| T05 | Verificar caso positivo del XI periodístico | Después de ajustes de diseño. Requiere evidencia vigente y contexto actualizado; no fabricar ni rejuvenecer muestras. |

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
conteo 11/26 y criterio de desempate visible. La Preview de Vercel aún no
incluye este cambio.

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
La Preview protegida está READY; faltan Safari físico y enlace de invitado.
No hay despliegue funcional de Production. Para revisar el acceso externo
recomiendo Astra con esfuerzo medio:
la app usa clave administrativa solo en servidor y cada visita genera lecturas a
Supabase. T02 cerrada con aprobación del PO el 02/10; T03 pospuesta y no habilitada.
Para retomarla, leer la decisión T02, PERSISTENCE y el lector: falta elegir
alternativa y cerrar corte coherente de ambos historiales, validación y operación.
Siguiente desarrollo: T07, ajustes de diseño para la demo, con Sol ligero una vez
recibida la lista del PO. T05 puede seguir después; no bloquea los ajustes.
Si se vuelve a priorizar optimización, reabrir
el contrato de T02 con Astra medio
antes de implementar T03 con Sol ligero y revisión crítica Astra. No iniciar
ninguna de esas implementaciones como continuación automática de este cierre.
