# Escudos incorporados

Los archivos se sirven localmente y se asocian en `src/app/team-crests.json` por
proveedor e ID externo revisado. Un equipo sin recurso verificado conserva su
nombre en la interfaz. Esta selección no afirma que exista un escudo para todo
el catálogo deportivo.

| Archivo | Equipo / ID BSD | Fuente y estado indicado por la ficha |
| --- | --- | --- |
| `nob.png` | Newell's Old Boys / 4997 | Aportado por el PO desde archivos de FM26; uso para distribución pública pendiente de verificar. |
| `lanus.png` | Club Atlético Lanús / 785 | Aportado por el PO desde archivos de FM26; uso para distribución pública pendiente de verificar. |

Los SVG anteriores de Wikimedia Commons permanecen en el directorio como
referencia; ya no se usan en la interfaz. Sus fichas son
[Newell's](https://commons.wikimedia.org/wiki/File:CA_Newell%E2%80%99s_Old_Boys.svg)
y [Lanús](https://commons.wikimedia.org/wiki/File:Escudo_de_Lan%C3%BAs_(sin_estrellas).svg).

Los escudos identifican equipos; no expresan afiliación ni respaldo de los clubes.

El PO añadió más PNG de FM26 el 02/10. `src/app/team-crests.json` vincula los
30 equipos del catálogo revisado de Liga Profesional con sus IDs BSD; también
vincula los IDs revisados de Newell's y Acassuso en GOAL API. En particular, el archivo de
Rosario Central provisto por el PO se llama `sinaliento.png` y corresponde al
ID BSD `792`. Los PNG de otras categorías permanecen disponibles sin asignación
automática: antes de mostrarlos debe revisarse el ID del proveedor. Las imágenes
solicitadas por Next.js ahora se generan con resolución suficiente para los
tamaños de 40–48 px usados en la Home.
