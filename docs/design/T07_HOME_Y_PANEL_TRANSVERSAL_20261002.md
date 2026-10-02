# T07 — Panel transversal y Home: propuesta de diseño

Estado: Home implementada localmente como primer corte revisable. El croquis
adjunto en el chat muestra jerarquía y estilo; las instrucciones escritas del PO
definen el comportamiento. Las secciones Equipo y Partido en Vivo se detallarán
después. Este documento no habilita datos ficticios ni un despliegue.

El PO pidió concentrarse por ahora solo en Home. El encabezado de dos filas se
aplica a Home, con Equipo y Partido en Vivo visibles pero deshabilitados hasta
que existan esas pantallas. La navegación común y los modales de detalle quedan
para el siguiente corte. Las fichas de partido existentes conservan su diseño.

## Marco común de la app

- Encabezado persistente en Home, Equipo, Partido en Vivo y fichas. Primera fila:
  logo aportado por el PO, sin fondo ni borde, aproximadamente tres veces más
  visible que los 42 × 63 px actuales en móvil; nombre «Movete, leproso movete!»
  a la derecha. Segunda fila: pestañas Home, Equipo y Partido en Vivo, con estado
  activo claro. El indicador de partido en vivo solo se enciende con un estado
  vigente y verificado de un partido de Newell's; sin sincronización en vivo
  disponible, permanece apagado y la pestaña no debe fingir actividad.
- Cada sección es una pantalla de paneles resumidos. Tap abre un diálogo con
  detalle cuando ese panel tenga drilldown implementado. Los paneles sin detalle
  disponible conservan un estado informativo y no simulan ser botones.
- Objetivo móvil: presentar la síntesis con el menor desplazamiento posible.
  En 430 × 932 px, logo de ~126 × 189 px, navegación y campo con once jugadores
  dejan poco espacio para otras cuatro tarjetas; no se recortará información
  ni se bloqueará el desplazamiento si el contenido no cabe. Se comprobará en
  Safari del iPhone 14 Pro Max, con texto ampliado y área segura.
- El PO aportó `nob.png` y `lanus.png` desde archivos de FM26 el 02/10; las
  referencias locales sustituyen los SVG anteriores. La distribución pública
  de estos PNG queda pendiente de verificar antes de una nueva Preview.

## Home, de arriba hacia abajo

1. **Próximo partido:** tarjeta horizontal de dos filas. Primera: escudo local,
   hora local del dispositivo, escudo visitante. Segunda: nombre local, día
   local («Hoy», «Mañana» o fecha), nombre visitante. Convertir el UTC guardado
   en el navegador para respetar zona horaria y configuración regional del
   teléfono; el servidor no debe congelar la hora de Argentina en el HTML.
   Sin kickoff confirmado: «Sin datos».
2. **Último XI inicial:** encabezado «Último 11 · Formación · Resultado» y
   escudo del rival con affordance de pulsación. Mostrar la última alineación
   inicial confirmada y guardada de Newell's, con fecha/partido visibles. Si
   no coincide con el último partido terminado, aclarar «última alineación
   disponible»; si se exige estrictamente el último partido y falta su XI,
   mostrar «Sin datos». El campo es media cancha con arquero abajo y delanteros
   arriba. La formación se toma del proveedor, sin inferir posiciones. Ante
   falta de foto con procedencia verificable, usar camiseta vista de espalda,
   número y apellido. La calificación promedio de jugador y técnico figura
   «Sin datos» hasta contar con datos y metodología definida; no promediar ni
   adoptar ratings de IA sin decisión específica. El escudo del rival cambia
   temporalmente a su XI del mismo partido al mantener pulsado; una alternativa
   accesible por tap/teclado debe permitir fijar y volver a Newell's.
3. **Estadio y pronóstico + árbitro:** dos tarjetas en la misma franja cuando
   el ancho lo permita. Estadio: nombre y «Pronóstico»; ubicación y tiempo;
   capacidad formateada y descripción meteorológica. Árbitro: foto/nombre y
   V/E/D de local y visitante bajo su dirección, verde/blanco/rojo. Cada valor
   depende de fuente, fecha y vínculo inequívoco con el partido; sin datos
   persistidos de estadio, clima, árbitro o historial, mostrar «Sin datos» por
   campo. La estructura de estas tarjetas no justifica inventar sus cifras.
4. **Liga Profesional + Copa Argentina:** dos tarjetas en la última franja.
   Liga: grupo o tabla contextual verificada, encabezados J/G/E/P/PTS y fila de
   Newell's con posición y escudo actualizado. Colorear G/E/P sin depender solo
   del color para comunicar el valor. Tabla calculada, con procedencia y
   frescura visibles en el detalle. Copa: fase/resultado de Newell's solo si la
   clasificación está verificada; «Eliminado en 16vos» del ejemplo no se usa
   como hecho sin evidencia.

## Mapa de datos y límites actuales

| Panel | Disponible ahora | Falta para completar el diseño |
| --- | --- | --- |
| Próximo partido | Fixture, equipos, kickoff UTC y escudos locales parciales | Fecha/hora local en cliente; escudos restantes |
| Último XI | Alineaciones BSD guardadas en 11 de 26 partidos terminados | Selección del último partido con datos; campo, interacción, fotos o camisetas; calificaciones sin fuente |
| Estadio/pronóstico | No hay datos persistidos listos para la Home | Fuente/contrato de estadio, ubicación, capacidad y Open-Meteo |
| Árbitro | No hay datos persistidos listos para la Home | Fuente/contrato de identidad, historial y foto |
| Liga | Standings calculados y clasificación de torneo/zona revisada | Tarjeta resumida y detalle accesible |
| Copa | Un fixture GOAL API guardado | Regla y evidencia verificable de fase/resultado |

## Secuencia propuesta

1. Revisar esta Home local con el PO. A 430 × 932 px ocupa aproximadamente
   1166 px de alto: requiere un desplazamiento vertical corto y no desborda
   horizontalmente. La cabecera de 242 px permanece visible al desplazarse.
2. Resolver el uso de los escudos aportados para una Preview compartida.
3. Definir después Equipo, Partido en Vivo y los modales de detalle.
4. Validar en Safari del iPhone 14 Pro Max antes de actualizar la Preview.
