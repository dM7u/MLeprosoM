# Proveedores

Punto de integración exclusivamente servidor. API-Football es el proveedor
inicial elegido; su cobertura sigue sin verificar.

El módulo actual solo identifica el adaptador reservado: no es un cliente HTTP,
no contiene endpoints, IDs de equipos, temporadas, cuotas ni respuestas de muestra.
No se importa desde la página y no consume requests.

En el Bloque 2 se relevará la cobertura. En el Bloque 3 se implementarán únicamente
las operaciones verificadas, su autenticación, validación y manejo de errores.
La UI consumirá datos internos; nunca importará este módulo ni disparará una
sincronización al recibir visitas. Normalización, persistencia y servicios se
agregarán cuando exista un primer caso real que justifique sus contratos.
