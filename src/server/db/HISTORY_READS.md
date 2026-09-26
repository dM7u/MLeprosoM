# Lectura paginada de historiales — 25/09/2026

read-history.mjs se usa en estadísticas, alineaciones, eventos, lotes y revisiones
oficiales. Requiere tablas inmutables para el rol operativo (solo SELECT/INSERT).
No debe aplicarse a fixtures, que se actualizan, ni a tablas que admitan borrados.

Cada petición solicita count exacto, orden ascendente por UUID y rango inclusivo
de hasta 100 filas. Ese orden es solo de transporte: la elección deportiva sigue
usando fechas y las reglas anteriores, sin desempatar por UUID. Si el servidor
entrega menos filas, continúa desde la cantidad realmente recibida hasta el total.
No se interpreta una página corta como fin del historial.

Inserciones confirmadas entre páginas cambian el conteo: la lectura falla cerrada,
sin publicar el prefijo ni reintentar indefinidamente. También rechaza errores,
conteos ausentes, páginas vacías antes del total, duplicados y orden inválido.
El límite defensivo es 1000 peticiones por recorrido (hasta 100000 filas con
páginas completas); al alcanzarlo devuelve error, nunca un historial truncado.
Los lectores traducen errores a sus estados sanitizados habituales.

Las revisiones se consultan en grupos de hasta 100 IDs de lote para limitar la
longitud de URL. Antes de publicar un lote, se vuelve a leer todo su historial de
revisiones y se compara con el inicial, incluyendo revisiones retroactivas.
No existe una transacción global entre lotes y revisiones: una inserción posterior
a la última comprobación se observa en la próxima lectura. Una intervención
administrativa que borre/actualice registros rompe la precondición de inmutabilidad;
los conteos no certifican esos cambios. La certificación remota de permisos sigue
pendiente y no se reemplaza por esta paginación.

Se conserva lastKnownGoodData con fecha original, sin mezclar snapshots, y las
políticas de reemplazo particulares de cada recurso. No hay migración, escrituras,
llamadas al proveedor ni scheduler nuevos. El límite separado de fixtures permanece.

Verificación: pruebas con 205 observaciones por recurso, 105 lotes y más de 500
revisiones; retención antigua, denegación posterior, inserciones entre páginas,
errores, duplicados, páginas limitadas por servidor y contrato HTTP del SDK instalado.
Lectura remota de los cuatro servicios aprobada con la muestra 223728 y tabla anual;
la prueba remota no agrega historial sintético ni acredita escala de producción.
