# Diseño de persistencia de XI periodístico

Estado 27/09/2026: almacenamiento y selección implementados y probados localmente
en revisions.mjs y 20260927000100_editorial_xi_revisions.sql. Migración no aplicada
remotamente, sin CLI de importación ni UI. Parte del validador REVIEWED_XI.md y
de la política de 48 horas aprobada. No se inventó un XI actual.

## Unidad de almacenamiento

Una revisión editorial inmutable por operación. Debe conservar el resultado
factual validado, UUID de operación, versión de contrato, fecha de creación y
vínculo al fixture/equipo de DB resuelto desde backend, además de las identidades
externas ya revisadas. No usar nombres de equipo como identidad ni inventar IDs
de jugadores. La fecha de publicación y la observación originales no se renuevan.

La clasificación de elegibilidad depende del reloj y del fixture actual: no
guardar `eligible_for_future_publication` como permiso permanente. Recalcular
al leer con xi-policy.json. Conservar hechos/revisión y motivos editoriales;
estado started/finished y kickoff deben venir del servicio de fixtures al leer.
Una reprogramación invalida el vínculo anterior hasta nueva revisión explícita.

Una corrección debe referenciar la revisión que reemplaza. La primera revisión
no tiene predecesora. Una retractación requiere acción explícita y motivo;
no representarla como un XI vacío o ausencia de respuesta. No borrar historia.

## Idempotencia y concurrencia

- Reintento con mismo UUID y contenido: devolver revisión existente.
- Mismo UUID con otro contenido: conflicto, sin sobrescribir.
- Clave editorial: URL canónica/proveedor/fixture/equipo, como en el validador.
- Una sucesora solo puede reemplazar la cabeza actual de esa clave, comprobado
  atómicamente. Dos correcciones concurrentes de la misma predecesora no deben
  crear dos cabezas válidas. Una debe fallar y requerir relectura/revisión.
- Comparar contenido canónico versionado y persistir de forma atómica; no usar
  orden UUID, orden HTTP o fecha de ingesta para resolver desacuerdos deportivos.

Implementación SQL: índice único de raíz por fixture/equipo/URL, UNIQUE de
previous_id y FK compuesta a la misma clave. La fila referenciada ya debe existir;
autorreferencias y cronología regresiva son rechazadas. Cada inserción conserva
la cadena lineal incluso si dos solicitudes compiten por la misma predecesora.
La prueba PGlite envía solicitudes competidoras sobre su conexión serializada;
no equivale a un ensayo de carga con varias conexiones remotas.

## Selección para una futura UI

1. Resolver fixture/equipo actual y cortar al comenzar el partido o si su estado
   no es scheduled. No sustituir el contexto actual por el guardado en evidencia.
2. Resolver la última revisión vigente de cada clave, incluyendo retractaciones
   y conflictos: nunca filtrar primero solo revisiones elegibles.
3. Revalidar fuente, identidades, kickoff, integridad y fechas; aplicar 48 horas
   desde publicación. No recuperar una revisión vieja si la cabeza nueva es
   parcial, ambigua, retractada o conflictiva. Ausencia no significa cero.
4. Solo candidatos completos, inequívocos y vigentes pueden pasar a presentación.
   Dos claves distintas con XI diferentes no se resuelven por mayoría, fecha,
   UUID ni orden de llegada: requieren revisión editorial explícita. Si no se
   puede demostrar equivalencia sin resolver identidades, conservar el conflicto.
5. Una alineación oficial vigente verificada directamente tiene prioridad. La
   confirmación del medio y la del proveedor no deben etiquetarse como oficial.
   Sin canal de evidencia oficial implementado, no afirmar esa verificación.
6. Mostrar fuente/enlace y publicación; ningún posible XI sin fecha verificable.
   El resultado de ausencia/error nunca expone un prefijo de historial o errores
   crudos. El detalle de errores es interno y sanitizado.

Estas reglas desarrollan la exigencia existente de no publicar conflictos ni
recuperar evidencia sustituida. Deben verificarse contra casos reales antes de
activar el flujo; no autorizan ingesta automática ni cambian la política de 48 h.

## Seguridad y pruebas antes de habilitar

Tabla privada con RLS, sin permisos públicos. Inserción mediante operación backend
controlada que mantenga atomicidad e invariantes, sin UPDATE/DELETE del historial.
No ampliar permisos de tablas existentes para facilitar el nuevo flujo.

Pruebas necesarias: UUID idempotente/conflictivo; FK de partido/equipo; corrección
y retractación; revisiones simultáneas; cabeza parcial sin rescate de XI antiguo;
conflicto entre notas; fecha desconocida y límite exacto de 48 h; reprogramación;
partido iniciado; prioridad oficial sin falsa oficialidad; errores sanitizados;
lectura sin escrituras ni consulta al periódico. Aplicación remota y UI requieren
además evidencia real apta, con publicación verificable y contexto actualizado.

## Implementación local y límites

`createEditorialRevision` normaliza hechos y calcula hash de contenido, con
contract_version 1 y UUIDs canónicos en minúscula. No guarda assessment/issues ni
una aprobación perpetua. Fecha/revisor de la operación son distintos de la
observación/revisión de la evidencia. `storeEditorialRevision` valida integridad,
comprueba replay por ID y luego inserta; la restricción única arbitra carreras.
Permisos operativos SELECT/INSERT, sin UPDATE/DELETE/TRUNCATE ni acceso público.

El trigger comprueba partido/equipo, identidades externas, competición, temporada
y kickoff contra las tablas existentes. Una retractación debe conservar exactamente
la evidencia de su predecesora y permite el kickoff histórico: puede retirar una
nota aun después de una reprogramación. No se puede corregir con kickoff viejo.
Un replay idéntico tampoco se rompe por una reprogramación posterior.

`read_editorial_xi_heads` usa un solo SELECT con SECURITY INVOKER, disponible
exclusivamente para service_role. Devuelve JSON con las cabezas, incluidas
retractaciones y conflictos. Más de 100 claves para el contexto devuelve null;
el lector lo trata como error, nunca como prefijo publicable. No recorre páginas.
No sustituye una lectura actual del fixture: el consumidor debe resolver ese
contexto por backend antes de llamar. Puede cambiar tras su lectura; no se
afirma transacción global con el fixture o con otros servicios.

`editorialXiView` revalida hechos/hash/identidades y vigencia. Retractaciones,
parciales, fechas desconocidas y reprogramaciones no rescatan su predecesora.
Entre claves independientes, un candidato completo puede coexistir con una nota
parcial/vencida excluida; una cabeza ambigua o en conflicto vigente para ese
kickoff bloquea presentación. Candidatos elegibles con listas distintas bloquean;
listas iguales tras normalizar espacios/NFC/caso y orden conservan todas las
atribuciones. Eso compara nombres, no resuelve IDs ni infiere formación.

No existe adaptador de evidencia oficial directa: este servicio devuelve únicamente
origen periodístico y claims del medio. La prioridad oficial deberá componerse con
ese futuro canal antes de conectar UI; no se simula con un booleano del consumidor.

Verificación local:

```powershell
node --conditions=react-server tests/database/editorial-migration.mjs
```

Usa PGlite aislado existente, aplica todas las migraciones en memoria y comprueba
permisos/RLS, identidad, retries/conflictos, sucesoras competidoras, cabezas,
retractación tras reprogramación, lectura read-only y overflow. Las pruebas
unitarias cubren TTL, conflicto entre notas, integridad y errores sanitizados.

Próximo bloque: importador controlado con lookup actual de fixture/equipos y
dry-run, antes de aplicar migración remota. La muestra histórica sirve para
conservar evidencia, no para poblar el próximo partido. Activación de UI sigue
pendiente de evidencia actual apta y de la composición con otras fuentes.
