# Cobertura del detalle BSD — 24/09/2026

Seis GET autenticados de solo lectura mediante el cliente backend existente,
sin reintentos, escrituras remotas ni cambios de UI. Tres recursos por evento:
`lineups/`, `incidents/` y `stats/`, bajo `/api/v2/events/{id}/`.
Observación alrededor de 20:32 UTC. No se guardan headers ni claves.

| Muestra | Alineaciones | Eventos | Estadísticas |
|---|---|---|---|
| 223728, Platense–Newell's (finalizado) | confirmed, beta=false; 11 titulares y 12 suplentes por equipo; IDs 796/4997 | 22 entradas; period, substitution, injuryTime, card, goal | home/away y first_half/second_half; 11 métricas seleccionadas disponibles por equipo |
| 223765, Newell's–Lanús (programado) | predicted, beta=true; confidence y ai_score presentes | Lista vacía | Valores null; pases/precisión no presentes |

Las alineaciones predicted/beta quedan fuera de la incorporación inicial. No
se interpretan como confirmación ni como probable XI periodístico verificado.
Las listas vacías de eventos no prueban cobertura ni ausencia de incidencias.
No se relevó player-stats de nuevo; la muestra del 17/09 sigue siendo histórica.
Estos datos son del proveedor, sin nuevo contraste oficial independiente.

## Bloque implementado

Normalización de once estadísticas de equipo: posesión, tiros, tiros al arco,
córners, faltas, offsides, pases, pases precisos, precisión de pases y tarjetas.
Solo totales de partido, sin sumar tiempos ni mezclar xG, ratings, shotmap,
momentum o posiciones promedio. Se conservan ceros reales, null y ausencia.
Porcentajes entre 0 y 100; conteos enteros no negativos. Valores inválidos,
identidad de evento distinta y fechas futuras rechazan la respuesta.

Las dos muestras JSON guardan únicamente esos campos seleccionados. fetched_at
corresponde al momento de guardar la respuesta observada (mtime local), no a
una fecha de actualización declarada por BSD. La respuesta stats no trae
updated_at ni IDs de equipo; solo event_id y lados home/away. Su vinculación
futura necesita comprobar el fixture persistido y sus equipos, no inferirlos
por nombres ni por el orden de otra respuesta.

## Persistencia siguiente

Unidad mínima propuesta: snapshot de estadísticas por fixture con provider,
external event ID, fixture UUID, home/away team IDs comprobados, versión,
fetched_at y métricas nullable. No crear aún una tabla de jugadores.
Lectura backend independiente del proveedor y frescura separada de fixtures.
Guardar cada observación atómicamente y conservar la última útil ante fallo;
un empty/partial posterior no debe borrar silenciosamente métricas válidas ni
renovar su fecha. Registrar esos intentos separadamente. Requiere migración,
validación de identidad/roles y pruebas locales antes de carga remota.

No hay persistencia ni publicación UI de estadísticas en este bloque. La ficha
continúa mostrando Sin datos. Eventos y XI confirmado serán bloques siguientes,
sin ratings propios ni adopción de puntuaciones de IA del proveedor.
