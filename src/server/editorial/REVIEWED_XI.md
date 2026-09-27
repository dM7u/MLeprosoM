# Evidencia periodística revisada de XI

Validador y CLI de prueba, sin ingesta automática ni UI. Persistencia/revisiones
implementadas y probadas solo localmente; ver PERSISTENCE.md. Este CLI no escribe.
Fuente inicial seleccionada: La Capital/Ovación. El validador no certifica que
la transcripción sea fiel: requiere revisión humana/editorial explícita del vínculo
de partido y de los nombres, sin deducirlos del texto mediante coincidencia difusa.

## Entrada

Muestra reproducible: `docs/research/la-capital-xi-223728-20260926.json`.
Contexto independiente: `docs/research/editorial-fixture-223728-20260926.json`,
derivado del catálogo BSD fechado y el mapeo revisado de competición, no de la nota.
Es contexto histórico, no un nuevo refresco remoto de fixtures.

- `binding`: proveedor, partido, competición, temporada, local/visitante y kickoff.
  Debe coincidir con el contexto entregado. Cambiar kickoff exige nueva revisión.
- `team_external_id`: uno de los equipos del encuentro. No se resuelven jugadores.
- `source`: URL HTTPS canónica de Ovación, medio/tipo, autor nullable, fecha textual
  original y `published_at` ISO con zona explícita o null. No inferir zona horaria.
- `observed_at`, `review.reviewed_at`, revisor, identidad confirmada y estado
  reviewed/conflict: cronología validada sin rejuvenecer publicación.
- `claim`: probable o confirmed_by_outlet; nunca equivale a confirmación oficial.
- `starters`: hasta once nombres de fuente, sin IDs inventados ni formación.
  Nombres duplicados se rechazan tras normalizar espacios, NFC y mayúsculas.
  Esa normalización no resuelve alias/homónimos: la revisión editorial debe
  marcar `ambiguous` ante alternativas o identidades inciertas.

## Política aprobada por el Product Owner

Máximo 48 horas desde publicación, con fuente y fecha visibles en la futura UI.
Configuración versionada en `xi-policy.json`: 172800000 ms. Al alcanzar el límite
se considera caducado; observar/revisar nuevamente no reinicia esas 48 horas.
Desde kickoff o si el contexto ya no es scheduled, no es posible XI actual.
Hora sin zona verificable: publication_time_unknown, sin elegibilidad.

El servicio requiere `maxAgeMs` explícito: su ausencia produce age_policy_pending.
El CLI utiliza la política aprobada. Los tests pueden usar reloj/política controlados.

## Resultado y límites

Devuelve hechos conservados, motivos de exclusión y clave de deduplicación por
URL/proveedor/fixture/equipo. La clave no implementa almacenamiento ni revisiones:
una futura persistencia debe guardar correcciones inmutables y resolver conflictos.
`eligible_for_future_publication` solo evalúa requisitos de esta entrada; no publica
ni acredita ausencia de otra evidencia contradictoria. Parcial, ambigua, conflictiva,
fuera de plazo o sin fecha verificable queda unavailable, conservando la evidencia.
Errores de estructura/identidad se rechazan con códigos sanitizados.

La futura lectura debe resolver conflictos entre revisiones y dar prioridad a una
alineación oficial vigente verificada directamente. No mezclar este flujo con
lineup_observations, que registra confirmaciones del proveedor. Antes de conectar
UI, obtener muestra actual apta y diseñar persistencia/selección con esas garantías.

## Dry-run

```powershell
node --conditions=react-server scripts/check-editorial-xi.mjs docs/research/la-capital-xi-223728-20260926.json docs/research/editorial-fixture-223728-20260926.json --dry-run
```

Cero requests y escrituras. La muestra real es histórica: once nombres explícitos,
afirmación confirmed_by_outlet, autor desconocido y published_at null. Resultado
esperado: unavailable, fixture_not_upcoming y publication_time_unknown.
Los casos positivos de tests son sintéticos y solo existen en tests/.
