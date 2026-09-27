# Diseño de persistencia de XI periodístico

Estado 27/09/2026: contrato propuesto para el próximo bloque, sin migración,
almacenamiento, selección de historial ni publicación implementados. Parte del
validador REVIEWED_XI.md y de la política de 48 horas aprobada. No requiere
inventar un XI actual para avanzar en el diseño.

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

La implementación SQL concreta se definirá en el bloque de migración y se
probará primero en PostgreSQL local. No reutilizar sin más el lector paginado
de observaciones: resolver cabezas/acciones requiere un corte coherente.

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

El próximo bloque implementable es probar almacenamiento/selección local sobre
este contrato. La muestra histórica sirve para probar conservación de evidencia,
no para poblar el próximo partido. Datos sintéticos solo en tests/entorno aislado.
