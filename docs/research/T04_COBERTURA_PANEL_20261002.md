# Cobertura para el panel de Newell's — 02/10/2026

La base conserva 32 fixtures BSD, 26 terminados. Al iniciar T04, solo uno tenía
alineación completa guardada; había una observación de estadísticas de equipo y
una de eventos en ese mismo fixture. La Data API no expone tablas `players`,
`coaches` ni `player_match_performances` (PGRST205). Por eso no se agregaron
estadísticas individuales ni rating del técnico.

Se consultaron alineaciones de partidos BSD terminados mediante GET manuales.
Diez observaciones nuevas se validaron en dry-run y se importaron con
`scripts/import-lineups.mjs --storage=projection`: seis completas y cuatro
parciales. En las parciales había al menos un suplente sin ID; se omitió el banco
entero de ese lado, conservando los once titulares identificados. No se relajó el
normalizador de producción. Quince eventos fallaron la validación de jugador y no
se importaron. Las muestras mínimas y los códigos de fallo están en
`docs/research/t04-lineups-20261002/`; no contienen claves.

Resultado persistido: once partidos con once titulares de Newell's utilizables
entre los 26 terminados; siete observaciones completas y cuatro parciales. Las
alineaciones son confirmaciones del proveedor, sin verificación oficial
independiente. Se recibieron después de los partidos, así que su hora de
observación no es la hora de publicación original. La UI indica cobertura y
procedencia. La muestra no sustenta un XI de toda la temporada.

El PO definió «XI más utilizado» como los once jugadores con más titularidades.
Con las once alineaciones actuales, ocho jugadores están claramente sobre el
corte; cinco comparten el último valor para tres lugares. El PO definió que, a
igual cantidad de titularidades, se elige al jugador que fue titular en el
partido más reciente, usando `kickoff_at` del fixture y no la hora de recepción
de la alineación. Así se obtiene un once único con la muestra actual. Si dos
jugadores siguen empatados en el corte con la misma fecha de última
titularidad, la UI conserva el empate sin decidirlo por nombre o ID.
