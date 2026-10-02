# Demo web para el sábado 03/10/2026

## Alcance preparado

La demo usa la Home y las fichas de partido actuales. Muestra partidos y tablas
guardados, fuente y fecha de consulta, y `Sin datos` donde falta cobertura. No
promete seguimiento en vivo, ratings, promedios ni alineaciones probables. El
partido de Newell's–Lanús figura programado para el sábado en el último snapshot;
la fecha y el estado deben verificarse de nuevo antes de compartir el enlace.

## Ajustes solicitados el 01/10

- La comparación «Newell’s y el próximo rival» usa la tabla general del torneo
  verificado del partido. Si falta clasificación o tabla compatible, muestra
  `Sin datos`. La anual para un playoff identificado queda pendiente de esa
  clasificación explícita.
- El logo original del propietario se conserva en `public/brand/Leproso.png`; ya
  se muestra en cabecera móvil y escritorio. El archivo original también se usa
  como icono; una variante más simple puede mejorar la lectura a tamaño pequeño.
- Newell's y Lanús ya tienen escudos locales con procedencia documentada en
  `public/crests/README.md` y créditos visibles en `/creditos`. No hay campo de
  escudo en `teams`. Quedan equipos pendientes de revisión por imagen; la ausencia
  conserva el nombre legible.

La ruta para obtener un enlace es una [Preview de Vercel](https://vercel.com/docs/deployments/environments) del proyecto
Next.js. Se puede compartir mediante la [función de enlace para invitados](https://vercel.com/docs/deployments/sharing-deployments) si la
Preview está protegida. Preview creada el 02/10 con autorización del PO. El PO
confirmó acceso en Safari físico y mediante enlace de invitado el 02/10.

## Configuración de Preview

Crear un proyecto Vercel propio para MLeprosoM. En **Project → Settings →
Environment Variables**, cargar estas variables con destino **Preview solamente**
(sin Production ni Development). `SUPABASE_URL` y `SUPABASE_SECRET_KEY` deben
copiarse desde el proyecto Supabase ya auditado; también están en `.env.local`
del equipo de desarrollo. No pegar sus valores en chat, Git ni documentación.
Al cargar `SUPABASE_SECRET_KEY`, elegir **Type → Secret** en Vercel. La interfaz
actual llama `Secret` a la opción antes denominada `Sensitive`; `Config` deja el
valor legible para miembros con acceso.

| Nombre | Valor para esta Preview | Función |
| --- | --- | --- |
| `SUPABASE_URL` | Origen `https://…supabase.co` del proyecto auditado, sin `/rest/v1` ni ruta | Base de datos |
| `SUPABASE_SECRET_KEY` | Clave secreta de ese mismo proyecto | Lecturas del servidor; privilegio administrativo |
| `FOOTBALL_PROVIDER` | `bsd` | Identidad del equipo |
| `FOOTBALL_TEAM_ID` | `4997` | Newell's en BSD |
| `FIXTURES_STALE_AFTER_SECONDS` | `900` | Indicador de frescura de fixtures |
| `STATISTICS_READ_MODE` | `projection` | Lector de estadísticas ya activado en esa base |
| `LINEUPS_READ_MODE` | `projection` | Lector de alineaciones ya activado en esa base |
| `INCIDENTS_READ_MODE` | `projection` | Lector de eventos ya activado en esa base |

Verificar que la URL y la clave correspondan al mismo proyecto Supabase auditado
el 28/09 antes de elegir los tres modos `projection`. Ninguna variable lleva
prefijo `NEXT_PUBLIC_`. Si se cambia un valor después del despliegue, crear una
nueva Preview: los despliegues anteriores conservan su configuración.

La UI no requiere claves BSD, GOAL API ni API-Football. Las importaciones se hacen
fuera de la visita web y no forman parte del despliegue. No copiar `.env.local`,
evidencias privadas ni secretos al repositorio o a un enlace compartido. Next
necesita un runtime de servidor: una exportación estática no sirve para estas
rutas dinámicas. El repositorio incluye cambios locales sin commit; una Preview
basada en Git no los incluirá. La ruta para este corte es **Vercel CLI** desde
`C:\MLeprosoM`:

1. Instalar la CLI si falta (`npm install --global vercel`), iniciar sesión con
   `vercel login` y ejecutar `vercel link` para seleccionar la cuenta y el proyecto
   nuevo. Esto crea `.vercel/`, excluido por `.gitignore`; no desplegar todavía.
2. Configurar las ocho variables de arriba en Vercel y proteger las Previews en
   **Settings → Deployment Protection → Standard Protection / Vercel
   Authentication**. Revisar que el proyecto detecte Next.js y raíz `.`.
3. Ejecutar `vercel deploy --dry` (CLI 54.17.2 o posterior) para inspeccionar
   framework y archivos incluidos sin subirlos. Confirmar que el logo y los
   escudos sí entran, y que `.env.local`, `.tools/` y `sources/` no aparecen en
   el paquete. El 02/10, con CLI 62.1.0, `.vercelignore` redujo el manifiesto de
   15904 archivos/~1 GB a 115 archivos/2,06 MB: logo y dos escudos incluidos;
   `.env.local` y `.tools/` excluidos. Repetir el dry-run si cambian los archivos.
4. Con autorización del PO, ejecutar `vercel deploy --target=preview` desde la
   raíz. Fijar el destino explícitamente: el primer intento sin ese argumento
   en este proyecto se registró como Production y falló durante la instalación.
   La CLI envía el estado local, incluidos los cambios aún no commiteados.
5. Abrir esa URL en el iPhone y validar la lista de abajo. Para invitados externos,
   abrir la Preview en **Deployments → Share**, seleccionar **Anyone with the link**
   y copiar el enlace generado; probarlo desde una sesión ajena a Vercel. Ese
   enlace permite acceder a la demo protegida y debe compartirse con cuidado.

La CLI de Vercel excluye `.env.local` del paquete de despliegue; no ejecutar
`vercel env pull .env.local` aquí porque reemplazaría la configuración local.
El 02/10, `vercel env ls preview` confirmó los ocho nombres en Preview; ambas
variables de Supabase figuran como Secret. El PO confirmó Standard Protection
con Vercel Authentication. No se leyó ningún valor ni se creó un despliegue.

## Revisión antes de compartir

1. Confirmar estado y fecha de las fuentes guardadas. El 01/10 se ejecutaron
   dry-run y apply manuales de BSD (32 partidos, 17 equipos) y GOAL API (un
   partido en alcance). La Home mostró ambas fuentes actualizadas. Las tablas
   conservan resultados observados el 24/09: refrescar fixtures no renueva esa
   revisión. Antes de compartir, volver a comprobar fecha, estado y rival.
2. Compilar y comprobar la Preview con sus variables de servidor. Abrir `/` y
   una ficha con datos en una ventana privada. Deben aparecer fuente, frescura,
   `Sin datos` y ninguna clave en el HTML. Confirmar que la visita no consulta
   al proveedor ni escribe en la base.
3. En Safari del iPhone 14 Pro Max, comprobar Home a 430 px CSS, navegación,
   pestañas de tablas, desplazamiento horizontal y ficha de partido. Revisar el
   resultado también después del horario del partido del sábado: el próximo
   partido puede cambiar y no debe presentarse un resultado no sincronizado como
   vivo.
4. Probar el enlace de invitado desde una sesión ajena al equipo de Vercel antes
   de enviarlo. Si la protección exige iniciar sesión, generar un enlace de
   invitado desde Vercel o elegir explícitamente otra modalidad de acceso.

La directiva `robots` de la app solicita no indexar la demo. No sustituye una
protección de acceso. La clave administrativa permanece en el servidor; una demo
pública puede multiplicar lecturas de Supabase por visita. Revisar cuota y alcance
de exposición al decidir el acceso.

## Estado al 02/10

Preparación local y Preview protegida. La navegación y fichas se
revisaron en navegador Chromium a 430×932 y 390×844, con datos reales guardados.
Tras las sincronizaciones del 01/10, la Home respondió HTTP 200 y mostró logo,
escudos de Newell's/Lanús, comparación del Clausura, créditos, `noindex` y
frescura por fuente. Esto no reemplaza la comprobación final en Safari físico.

El primer intento de Vercel terminó en ERROR durante `npm install`: Vercel usa
npm 11.19.0 con Node 24.21.0 y el proyecto exigía npm 12 con `engine-strict`.
Se amplió el rango declarado a npm 11–12 en package.json/package-lock.json, sin
cambiar dependencias. Ese intento quedó etiquetado Production por la CLI, pero
no produjo sitio funcional. El segundo intento usó `--target=preview`: build y
TypeScript aprobaron, y el despliegue quedó READY/preview con autenticación.
URL de la Preview: https://mleprosom-phptefakw-d-m7.vercel.app . La Home y una
ficha de partido respondieron mediante `vercel curl`; comparación del Clausura,
logo, escudos, créditos y `noindex` presentes. La clave Supabase no apareció en
el HTML de Home. Una sesión sin autenticación llega al login de Vercel. El PO
confirmó que el enlace compartido abrió en Chrome, Safari físico y como
invitado. Los cambios locales posteriores de T04/T07 requieren otra Preview.

El 02/10, tras autorización del PO, se creó una nueva Preview protegida con
los cambios de T04/T07: https://mleprosom-a0zums5bp-d-m7.vercel.app . Vercel
informó `READY`, build remoto aprobado y `vercel_authentication` activa. El
dry run incluyó 193 archivos (4,9 MB) y excluyó `.env.local`, `.tools/`,
documentación, tests y scripts. `vercel curl` comprobó en Home el último XI,
Frank Kudelka, el área chica, Acassuso en 32avos, el escudo de Lanús y
`noindex`. Falta comprobar esta URL nueva en Safari físico como invitado; la
prueba previa de T06 corresponde al despliegue anterior. No hubo commit ni push.
