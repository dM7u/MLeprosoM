# La Capital / Ovación como fuente de XI

Relevamiento cerrado el 25/09/2026. Alcance: viabilidad y criterios de
incorporación; no implementa ingesta, persistencia ni UI. Repositorio limpio al
comenzar. La ficha actual solo lee fixtures guardados y muestra alineaciones
como `Sin datos`; no existe todavía una cadena de datos periodísticos.

## Evidencia consultada

- [Previa del clásico, 06/09/2026](https://www.lacapital.com.ar/ovacion/clasico-rosarino-newells-jugaria-santiago-solari-los-titulares-y-regresara-lucas-carrizo-n10279423.html):
  firma Rodolfo Parody, hora visible 06:10. Describe posibles cambios y
  convocados; no constituye un XI completo. Hay una inconsistencia de apellido
  entre un párrafo y el título: exige revisión, no corrección automática.
- [Equipo ante Platense, 20/09/2026](https://www.lacapital.com.ar/ovacion/frank-kudelka-tiene-los-once-newells-visitar-platense-n10282101.html):
  hora visible 15:48, once jugadores enumerados y referencia incrustada a una
  publicación del club. La nota dice que el técnico confirmó el equipo.
  Es evidencia periodística histórica; el enlace incrustado no equivale a
  haber comprobado directamente la fuente oficial. No sirve para el próximo rival.
- [robots.txt](https://www.lacapital.com.ar/robots.txt): la representación
  consultada anuncia sitemaps y no contiene Disallow. No acredita licencia de
  reutilización ni disponibilidad de un servicio de datos.
- [Condiciones de acceso digital](https://www.lacapital.com.ar/contenidos/micuenta.html):
  describen suscripción y contenido exclusivo; no se verificó un acuerdo de
  sindicación/API para esta app. No confundir suscripción con ese acuerdo.

Las notas se leyeron mediante búsqueda/navegación pública. La herramienta puede
servir una representación indexada; esto no demuestra acceso directo estable.
No se copian artículos completos ni imágenes al repositorio.

## Prueba técnica acotada

Dos GET sin autenticación desde Node, sin reintentos:

| URL | Resultado observado |
| --- | --- |
| `https://www.lacapital.com.ar/rss/home.xml` | HTTP 403, text/plain; sin RSS |
| `https://www.lacapital.com.ar/sitemap-news.xml` | HTTP 403, text/plain; sin XML de sitemap |

La navegación web también falló al abrir ambas rutas. No se atribuye el 403 al
editor con certeza: puede intervenir infraestructura del entorno. No se
certifica que el RSS exista o esté discontinuado. No se intentó eludir acceso,
usar sesiones privadas ni cambiar identidad del cliente. No hay API/feed
operativo verificado ni cron habilitado.

## Enfoque mínimo

La Capital queda seleccionada como primera candidata periodística por indicación
del Product Owner. El primer flujo implementable será incorporación revisada de
hechos de una nota pública y enlace de atribución, mediante operación backend.
No requiere construir ahora un extractor general de noticias. Su automatización
requiere resolver el acceso estable y las condiciones aplicables primero.

Criterios para el siguiente bloque de implementación:

1. Vincular evidencia al fixture y al equipo por identidad revisada: rival,
   localía, competición y fecha. No asignar una nota al próximo partido solo
   porque mencione a Newell's. Reprogramaciones exigen revalidación.
2. Conservar URL canónica, medio, tipo periodístico, autor si está disponible,
   fecha publicada (sin inventar zona horaria), fecha de observación, revisión
   y estado de validación. Una nueva lectura no cambia la fecha publicada.
3. Separar lo que afirma la nota (probable/confirmado por el medio) de una
   confirmación oficial verificada directamente. Una alineación oficial vigente
   tiene prioridad de presentación sobre una probable.
4. Publicar XI solo si hay once titulares distintos, explícitos y sin
   alternativas ambiguas. Cambios sueltos, convocados o dudas se conservan como
   evidencia parcial, sin completar jugadores ni esquema táctico por inferencia.
5. Conservar nombres de fuente sin fabricar IDs de jugadores. El enlace a IDs
   deportivos requiere resolución de identidad aparte; no usar coincidencia
   aproximada como confirmación.
6. Deduplicar por URL canónica y fixture/equipo; una corrección crea una revisión
   trazable. Conflictos pendientes impiden presentar un XI como validado.
7. Mostrar fuente, enlace y fecha con etiqueta periodística. No arrastrar el XI
   a otro encuentro; dejar de presentarlo como probable actual al iniciar el
   partido. Definir política de antigüedad explícita antes de conectar UI.
8. Lectura de UI exclusivamente desde almacenamiento; ingesta centralizada,
   errores sanitizados y ausencia como `Sin datos`.

## Estado y salida

Viabilidad editorial demostrada en dos muestras, automatización sin resolver.
No hay XI actual validado para cargar. La búsqueda acotada no encontró una
previa apta del próximo Newell's–Lanús; no demuestra que no exista.

Siguiente bloque de XI: validador de evidencia revisada y prueba sin escrituras
con casos de XI completo, parcial, identidad incorrecta, ambigüedad y caducidad;
después persistencia/lectura. Se mantiene independiente del bloque prioritario
de estadísticas de equipo, que puede continuar sin depender de La Capital.

Verificación de este bloque: revisión de enlaces/evidencia y `git diff --check`.
Sin cambios ejecutables ni escrituras remotas; no se repitieron build/tests.
