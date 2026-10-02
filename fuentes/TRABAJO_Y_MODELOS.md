# Trabajo, chats y modelos — MLeprosoM

Acuerdo del 01/10/2026. BACKLOG.md conserva estado/prioridad; esta guía define cómo
trabajar y cuándo recomendar un modelo. Son recomendaciones, no garantías de cuota.
No hay medición que permita prometer un porcentaje de ahorro frente a Claude.

## Política de modelos

| Uso | Modelo recomendado | Esfuerzo inicial |
| --- | --- | --- |
| Implementación habitual, UI, integración con contrato definido, tests | GPT-6 Sol | Ligero |
| Consistencia, permisos, migraciones, arquitectura o fallos difíciles | GPT-6 Astra | Medio; ligero para revisión acotada |
| Ediciones mecánicas bien delimitadas, textos/enlaces/formato | GPT-6 Luna | Ligero |

Usar la variante Sol disponible en el selector; confirmar nombres/opciones si
cambian, sin asumir equivalencia de precios o límites. No afirmar el modelo activo
si no se puede comprobar. El usuario cambia el selector; recomendar no equivale a
haberlo cambiado. No cambiar modelo/esfuerzo ni crear tareas automáticamente.
La recomendación guía el trabajo: no bloquear una tarea autorizada porque el usuario
prefiere otro modelo. Escalar esfuerzo solo por dificultad concreta, no por defecto.

## Chats de la cola actual

Un chat por entregable coherente; tests, documentación y correcciones pertenecen
al mismo chat. No crear uno por archivo, comando, benchmark o pequeño paso.
No abrir todos estos chats ahora ni trabajar simultáneamente sobre el mismo checkout.

| ID / título sugerido | Modelo | Entrada mínima | Entregable y cierre |
| --- | --- | --- | --- |
| T01 — Consolidar MLeprosoM | Sol ligero | AGENTS, BACKLOG, diff actual | Revisar cambios acumulados, consistencia de docs/activaciones y checks afectados; entrega revisable. Sin nuevas funcionalidades, SQL ni push. |
| T06 — Demo web del sábado | Sol ligero para UI; Astra medio para revisión del corte externo | BACKLOG, Home/ficha y docs/DEMO_SABADO_20261003.md | Completar demo móvil con datos reales, validar Safari y enlace compartible. Publicar solo con decisión del PO. |
| T02 — Decidir lectura de standings | Astra medio | BACKLOG, STANDINGS_VOLUME_20260929, PERSISTENCE y lector | Justificar prioridad con necesidad actual; contrato y contraejemplos si conviene optimizar. Si conviene posponer, propuesta al PO. No migrar. |
| T03 — Implementar lectura de standings | Sol ligero; Astra para revisión crítica | Contrato cerrado en T02 y código relevante | Implementación local, equivalencia, permisos/concurrencia pertinentes y guía operacional. Pedir revisión Astra antes de corte remoto. Mantener mismo chat al cambiar modelo; nuevo solo si contexto se volvió extenso. |
| T04 — Completar panel deportivo | Sol ligero | Alcance priorizado por PO, Home/ficha y cobertura | Funcionalidad con datos reales, estados y responsive; pruebas proporcionales. Cobertura faltante → Sin datos, no fórmulas propias. |
| T05 — Validar XI periodístico vigente | Sol ligero | Contrato editorial y evidencia pública vigente | Verificación positiva real, fuente/fecha y expiración; si no hay evidencia, registrar limitación sin repetir búsquedas idénticas. |

T03 depende de T02. T04/T05 no se ejecutan como continuación automática de la tabla;
seguir BACKLOG y decisiones del PO. T01 es el próximo chat recomendado tras cerrar
esta reorganización. No es una obligación de hacer commit; mantener autorización.

## Chats futuros, solo cuando se habilite su fase

| Tema / título sugerido | Modelos y división | Requisito antes de abrir |
| --- | --- | --- |
| Vivo — contrato e implementación | Astra medio define cuota/estados/exclusión; Sol implementa; Astra revisa concurrencia | Cobertura/cuota y scheduler por definir. Dos entregables como máximo inicialmente: contrato y ejecución. |
| Contexto de partido | Sol ligero; Astra solo si surge modelo histórico complejo | Datos de árbitro/estadio y contrato Open-Meteo verificables. |
| Noticias y perfiles | Sol ligero; Astra para conflicto de fuentes o permisos complejos | Fuentes/alcance aprobados, atribución y acceso viable. |
| Ratings propios | Astra medio para metodología; Sol para implementación validada | Relevamiento real, decisión explícita PO y tests metodológicos. No iniciar ahora. |
| Votación HDP | Astra medio para identidad/anti-abuso; Sol implementa | Reglas de candidatos, ventana, unicidad y auditoría acordadas. |
| PWA y calidad de producto | Sol ligero | Alcance concreto y estado funcional listo; no auditoría genérica sin criterio de salida. |
| Mantenimiento editorial mecánico | Luna ligero, opcional | Cambio preciso sin decisiones técnicas; no abrir chat separado si son pocas líneas dentro de otra tarea. |

Estos son perfiles de trabajo, no una cantidad fija de chats obligatorios. Reagrupar
si comparten contexto; separar cuando cambian objetivo o dependencias, no por rutina.

## Avisos que debe dar el agente

Al iniciar una tarea: identificar ID, modelo/esfuerzo recomendado y motivo en una
frase. Ejemplo: «T02 requiere decidir consistencia entre dos historiales: recomiendo
Astra en medio. El entregable es contrato y casos límite, sin SQL remoto».

Durante el trabajo: avisar si aparece una razón concreta para escalar (ambigüedad
de arquitectura, seguridad, concurrencia, fallos repetidos) o bajar de modelo
(contrato cerrado y ejecución rutinaria). No repetir avisos en cada comando.

Al cerrar: resultado, validación/límite material, siguiente ID y modelo sugerido.
Si conviene chat nuevo, dejar un prompt breve copiable y actualizar BACKLOG antes.
Estos avisos ocurren cuando trabajamos en una tarea; no son notificaciones fuera
del chat ni una automatización programada. No necesitan una nueva solicitud del PO.

## Uso eficiente del contexto y verificaciones

- Leer instrucciones una vez por contexto disponible; volver si cambiaron. Consultar
  estado vigente y archivos específicos, no todo el archivo histórico en cada turno.
- Buscar con rg y leer secciones/diffs. Evitar salida truncada; logs largos a .tools/
  sin secretos, devolver resumen y errores relevantes. Agrupar lecturas independientes.
- Esperas con intervalos útiles y avance solo cuando hay información nueva; respetar
  actualizaciones de progreso requeridas sin repetir razonamientos o planes.
- Un ciclo de implementación/validación por entregable. Repetir por cambios, fallos
  o evidencia insuficiente; no correr suite/build por un cambio solo documental.
- Mantener checks de seguridad, SQL/rollback/concurrencia donde el riesgo los requiere.
  Ahorrar tokens no autoriza omitir comprobaciones necesarias.
- Benchmarks: usar volumen que afecte una decisión; no extender por inercia. Mantener
  conclusiones locales separadas de producción y no automatizar ingesta sin contrato.
- BACKLOG resume estado, cola, bloqueos y evidencia. Historial detallado va a docs/history/
  o docs/research/. Actualizar afirmaciones vigentes en vez de acumular contradicciones.
- Crear chat nuevo al cambiar de entregable si el contexto está cargado; no forkar
  todo el historial para obtener contexto corto. No crear ni enviar tareas sin pedido.

## Prompt de arranque reutilizable

> Continuemos MLeprosoM en C:\MLeprosoM. Tarea: [ID y entregable de BACKLOG].
> Modelo elegido: [modelo/esfuerzo]. Leé AGENTS.md, fuentes/BACKLOG.md y solo los
> contratos relevantes. Revisá Git y preservá cambios locales. Seguí
> fuentes/TRABAJO_Y_MODELOS.md y avisame si conviene cambiar de modelo. Completá
> implementación y validación del entregable, sin pasar a otra fase. No repetir
> SQL aplicado, exponer secretos ni inventar datos. Actualizá BACKLOG al cerrar.

Referencia de orientación, consultada en la conversación:
[modelos](https://developers.openai.com/api/docs/guides/latest-model) y
[esfuerzo de razonamiento](https://developers.openai.com/api/docs/guides/reasoning).
La cuota del producto no se deduce directamente del precio API ni de estos consejos.
