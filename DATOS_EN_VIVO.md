# Datos en vivo --- Movete, Leproso Movete!

## Objetivo

Definir la estrategia de sincronización de datos futbolísticos en tiempo
real minimizando requests, latencia y consumo de cuota del proveedor.

## Principios

-   El navegador nunca consulta directamente al proveedor externo.
-   Un único proceso backend sincroniza el partido activo de Newell's.
-   Todos los usuarios consumen datos normalizados desde nuestra
    aplicación.
-   Reutilizar cache y datos persistidos siempre que sea posible.
-   No consultar datos que no hayan cambiado o que puedan derivarse de
    datos ya obtenidos.
-   Registrar timestamp de última actualización, estado del fixture,
    errores y consumo.
-   El intervalo real deberá respetar los límites efectivos del plan
    contratado.

## Ciclo de actualización durante un partido

-   Antes del partido: no hacer polling de partido en vivo.
-   Primer tiempo: consultar aproximadamente cada 150 segundos.
-   Entretiempo (HT): detener las consultas.
-   Segundo tiempo: reanudar aproximadamente cada 150 segundos.
-   Tiempo extra: continuar según necesidad.
-   Penales: continuar según necesidad.
-   Finalizado (FT): realizar una sincronización final y detener el
    polling.
-   Suspendido, cancelado o aplazado: detener el polling y conservar el
    último estado válido.

El intervalo debe ser configurable y no quedar repartido por distintos
componentes.

La frecuencia definitiva no se considera cerrada hasta verificar la
cuota y comportamiento real de API-Football Free.

## Errores y datos desactualizados

-   Conservar `lastKnownGoodData`.
-   Mostrar cuándo se actualizaron los datos por última vez.
-   Ante errores temporales, aplicar backoff.
-   No generar una cascada de requests ante un fallo.
-   Si faltan datos del proveedor, no inventarlos.
-   Diferenciar error de proveedor, respuesta parcial y ausencia
    legítima de datos.

## Arquitectura esperada

`PROVEEDOR → NORMALIZACIÓN → CACHE/DB → SERVICIOS DE DOMINIO → API INTERNA → UI`

La UI no debe conocer endpoints ni formatos específicos del proveedor.

## Optimización de cuota

Antes de implementar una consulta nueva, evaluar: 1. si el dato ya
existe en DB/cache; 2. si puede reutilizarse una respuesta existente; 3.
si puede calcularse a partir de datos ya almacenados; 4. si realmente
necesita actualizarse en tiempo real; 5. si puede agruparse con otra
consulta.

Evitar requests "por las dudas".

## Estados especiales

Contemplar como mínimo: - NS/TBD; - 1H; - HT; - 2H; - ET; - P; - FT; -
PST; - CANC; - ABD; - SUSP; - cualquier otro estado que el proveedor
realmente utilice.

No asumir que todos los partidos duran exactamente 90 minutos.

Los códigos definitivos y su normalización se verificarán contra
API-Football antes de implementarlos.

## Responsabilidad de sincronización

Una visita de usuario nunca debe originar directamente una consulta al
proveedor.

El backend: 1. determina si corresponde sincronizar; 2. consulta al
proveedor cuando corresponde; 3. normaliza; 4. valida la respuesta; 5.
persiste/cachea; 6. actualiza metadatos de frescura; 7. expone el
resultado por la API interna.

## Observabilidad

Registrar como mínimo: - fixture_id; - proveedor; -
endpoint/operación; - hora de request; - hora de respuesta; -
resultado/error; - estado del partido; - timestamp de los datos
recibidos; - cantidad de requests utilizadas cuando el proveedor lo
permita.

Nunca registrar API keys ni secretos.

## Tests mínimos

-   transición NS → 1H;
-   1H → HT;
-   HT → 2H;
-   2H → FT;
-   ET/P;
-   cancelación/suspensión;
-   error temporal y backoff;
-   reutilización de `lastKnownGoodData`;
-   finalización y sincronización final;
-   evitar polling duplicado;
-   respuesta parcial;
-   estado desconocido del proveedor.

## Pendientes antes de implementar el vivo

El análisis de cuota del Bloque 2 está en `PROVEEDORES.md`: 90 minutos activos
a intervalos de 150 segundos representan aproximadamente 36 ciclos. Cuatro
operaciones por ciclo sumarían 144 consultas, antes de tareas adicionales.
No se aprueba esa estrategia con el límite Free documentado de 100/día.
Primero verificar acceso a la temporada y reutilización de respuestas reales.
También falta resolver el despertar tras HT: una pausa de consultas no detecta
por sí sola el inicio del segundo tiempo. Estas observaciones no cambian los
intervalos conceptuales ni implementan un scheduler.

-   verificar cobertura real del plan API-Football Free;
-   verificar estados reales del proveedor;
-   verificar cuota y límites;
-   definir cache y TTL por operación;
-   definir mecanismo concreto de exclusión/lock para impedir
    sincronizaciones duplicadas;
-   definir dónde se ejecutará el scheduler/polling backend.
