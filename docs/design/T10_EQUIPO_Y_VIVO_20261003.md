# T10 — Equipo y Partido en Vivo

Especificación del Product Owner recibida el 03/10/2026. Mantener cabecera,
tarjetas oscuras, bordes rojo apagado y densidad visual de Home. Ningún panel
debe convertir ausencia de cobertura en cero o en calificaciones inventadas.

## Equipo

- Franja superior de tres paneles en una misma fila a cualquier ancho: últimos
  tres partidos jugados, próximos tres partidos y posición contextual (equipo
  anterior, Newell's, equipo siguiente). Las filas de partidos abren la ficha
  ya existente. En pantallas angostas se compacta el interior de cada panel.
- El panel del once tiene tres botones: Mejor 11 (vista inicial), Peor 11 y
  Más utilizados. Las tres vistas usan la formación inicial más frecuente.
  Mejor y Peor requieren calificaciones propias por jugador y puesto; hasta
  definir y validar su metodología muestran «Sin datos».
- Más utilizados: formación inicial más frecuente y, dentro de cada puesto
  observado en esa formación, jugador con más titularidades; a igualdad,
  titularidad en ese puesto más reciente. El campo refleja un XI compuesto a
  partir de observaciones, no una alineación que necesariamente haya jugado
  junta. Media individual aún no disponible.
- Franja inferior: técnico (foto, jugados/ganados/empatados/perdidos y
  puntuación) y tres jugadores con mejor media. Falta identidad/fuente de foto,
  historial de técnico y metodología versionada de calificaciones; los
  indicadores permanecen «Sin datos». No ordenar un top 3 arbitrario.

La primera versión local de `/equipo` y la pestaña activa ya están implementadas.
Datos verificados mediante lectura local: 3 + 3 partidos con fichas, ventana de
posiciones 7–8–9 en Clausura Grupo A y once titulares únicos con cobertura 11/26.
Es una observación fechada, no garantía de frescura continua. La interacción de
modal puede reemplazar o complementar las fichas en un corte posterior.
El PO corrigió el 03/10 que la franja superior no debe apilarse: verificación
local a 806 px mostró los tres paneles en `y=133`, anchos de 252 px y sin
desbordamiento horizontal.

El PO pidió dibujar el Once más utilizado en la formación inicial más usada.
Recuento de las 11 alineaciones BSD completas que ya cubre T04: **11/11 son
4-2-3-1**. Los once con más titularidades totales incluyen cinco defensores y
cuatro mediocampistas; para respetar el dibujo se selecciona por puesto. No
ubicar a Escobar de mediocampista sin evidencia. BSD rotula al ID 90520,
dorsal 39, como «Lautaro Rios»; el [plantel actual del club](https://www.newellsoldboys.com.ar/plantel)
identifica a Thomas Ríos con el 39, y el PO confirmó su nombre y puesto de
extremo izquierdo. Una [nota anterior del club](https://www.newellsoldboys.com.ar/noticias/debut-triunfal-en-el-coloso)
usa «Lautaro Ríos»: se conserva la discrepancia y el dato crudo BSD, mientras
el panel aplica el nombre revisado. En la muestra local de once partidos,
Thomas tiene cinco titularidades en ese puesto y Solari tres; el PO señaló una
cifra menor para Solari, por lo que ese conteo se limita expresamente a las
alineaciones guardadas y no se presenta como estadística oficial completa.

## Home durante un partido en vivo

- Home (`/`) es la entrada principal tanto antes como durante el partido. La
  navegación queda en Home y Equipo; no habrá pestaña ni ruta separada para Vivo.
  Cuando haya un estado activo verificado y un snapshot persistido reciente,
  Home reemplazará sus paneles de previa por los paneles del partido y señalará
  la actividad en Home. Un kickoff pasado no basta para activar el modo vivo.
- Al confirmarse el final, Home vuelve al contexto del próximo encuentro. El
  fixture recién finalizado debe dejar de competir como «próximo» aunque el
  catálogo general todavía no se haya refrescado; integrar primero el resultado
  terminal persistido con esa lectura. Si los datos vivos vencen o fallan, no
  anunciar partido activo; conservar el último dato válido con su hora y estado
  de frescura donde corresponda.
- Franja superior: estadio/capacidad/clima y árbitro con historial por cada
  equipo, penales a favor/en contra y rojas a favor/en contra. Mostrar muestra,
  ámbito y procedencia cuando esos datos existan.
- Centro: equipo en juego con puntuaciones; a la derecha, ranking «Jugador a
  putear». Puntuaciones y ranking requieren metodología propia definida,
  validada y versionada. No presentar un orden ficticio.
- Parte inferior desplazable: estadísticas del partido y suplentes. Usar solo
  campos normalizados y persistidos; distinguir parcial, error y actualización
  antigua. Conservar el último dato válido.

La UI viva y el intercambio automático de paneles siguen bloqueados por T09: scheduler único,
exclusión de duplicados, cuota/cadencia, estados reales, HT→2H y manejo de
jugadores sin ID en alineaciones BSD. El [contrato T09](T09_CONTRATO_VIVO_20261003.md)
define el siguiente corte local. La metodología de ratings bloquea únicamente
puntuaciones/ranking; no bloquea mostrar marcador, XI confirmado, eventos,
suplentes y estadísticas disponibles. No activar polling desde una visita.
