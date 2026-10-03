# T08 — Cobertura de contexto para Home (03/10/2026)

## Estado comprobado

- Home muestra `Sin datos` en Estadio, Pronóstico y Árbitro (`src/app/page.tsx`).
- El fixture BSD 223765 identifica Newell's–Lanús, local/visitante y horario, pero
  el catálogo guardado no incluye estadio, árbitro, coordenadas ni capacidad.
  La tabla `fixtures` tampoco tiene esas columnas. No inferir estadio solo por
  localía ni presentar resultados V/E/D sin historial vinculado a árbitro.
- La [ficha de Newell's de la LPF](https://www.ligaprofesional.ar/clubes/newells/)
  identifica el Estadio Marcelo Bielsa como sede del club y da la dirección
  Parque Independencia S/N, Santa Fe. Esa ficha no prueba por sí sola que cada
  partido local se juegue allí.
- La [nota de La Capital sobre Newell's–Lanús](https://www.lacapital.com.ar/ovacion/newells-vs-lanus-el-torneo-clausura-hora-canal-y-posibles-formaciones-n10284475.html)
  ubica este partido en el Marcelo Bielsa y menciona a Darío Herrera como
  árbitro principal. Antes de guardar una designación, contrastar el documento
  oficial específico: un resultado de búsqueda de la programación LPF mostró
  otro nombre asociado en el extracto, que puede corresponder a otro encuentro.

## Próximo corte verificable

1. Confirmar sede y árbitro de un fixture concreto en una fuente oficial o
   contrastada, conservando URL y fecha de observación.
2. Definir persistencia mínima por fixture para sede/designación, con identidad
   y procedencia; separar datos del estadio (ciudad, capacidad, coordenadas)
   de cambios de sede del partido.
3. Solo con coordenadas del estadio verificadas, consultar Open-Meteo desde
   backend y guardar hora, fuente, unidad y horizonte del pronóstico.
4. Para V/E/D bajo un árbitro, definir cobertura histórica y criterio de
   inclusión antes de calcular; una designación aislada no alcanza.

No se consultó Open-Meteo ni se escribieron valores en UI o DB en este corte.
