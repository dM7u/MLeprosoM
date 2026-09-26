# Chequeo externo de Supabase

Workflow: `.github/workflows/supabase-health.yml`, cada seis horas al minuto 17
(UTC), más ejecución manual. Corre en GitHub Actions, independiente de la PC.
Requiere publicarlo en la rama predeterminada y configurar los secretos de Actions
SUPABASE_URL y SUPABASE_SECRET_KEY. No colocar claves en YAML, argumentos ni logs.
Solo esos dos secretos se entregan al paso de lectura; no hay dependencias npm.

Hace un GET a fixtures con select=id y limit=1, timeout de 15 segundos, sin
redirecciones ni reintentos. Una tabla vacía también es una lectura válida.
Solo imprime código de resultado y estado HTTP cuando falla; nunca IDs,
respuestas de error del servidor, URL privada o claves. Salida no cero falla el job.
No escribe, no cambia fetched_at, no consulta proveedores ni sincroniza partidos.

Prueba manual local:

```powershell
node --env-file=.env.local scripts/check-supabase-health.mjs
```

La cuenta responsable debe habilitar notificaciones de Actions y seleccionar
solo workflows fallidos si desea avisos únicamente ante fallos. El workflow
no envía correo por cuenta propia ni modifica preferencias personales.

Supabase Free puede pausar proyectos con poca actividad semanal; unas pocas
consultas diarias suelen bastar, sin garantía contractual. Cuatro lecturas diarias
son la política inicial de este chequeo. No reactiva un proyecto ya pausado.
GitHub puede retrasar schedules y deshabilitarlos tras 60 días sin actividad en
repositorios públicos. No se generan commits artificiales para evitarlo.

Fuentes:
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications

Estado de activación y resultados: fuentes/BACKLOG.md.
