# Seguimiento acotado de XI — 27/09/2026

Se revisó el catálogo local bsd-catalog-20260924.json, ordenando futuros encuentros
de Newell's por event_date. Primer encuentro guardado: BSD 223765, Newell's local
ante Lanús, 04/10/2026 20:00 UTC, notstarted. Es información de ese catálogo
fechado, no una nueva consulta al proveedor ni verificación oficial del horario.

Se hicieron cuatro búsquedas públicas acotadas a La Capital/Ovación, combinando
Newell's, Lanús, formación, Kudelka y septiembre/27 de septiembre de 2026.
Los resultados pertinentes fueron notas históricas del clásico, Vélez y Platense.
No se encontró una nota apta con once titulares explícitos para Lanús. Esto no
demuestra inexistencia de esa publicación ni certifica actualidad del índice.

Referencias históricas encontradas (no sirven para el próximo rival):
- https://www.lacapital.com.ar/ovacion/frank-kudelka-tiene-los-once-newells-visitar-platense-n10282101.html
- https://www.lacapital.com.ar/ovacion/newells-kudelka-mete-un-solo-cambio-recibir-velez-el-coloso-n10280546.html

No se insistió con scraping, feeds anteriormente fallidos ni otras fuentes no
incorporadas al contrato. No se creó evidencia positiva, migración ni carga DB.
La regla de 48 horas sigue vigente: la muestra histórica no se reutiliza para Lanús.

Avance independiente: contrato de persistencia/revisiones documentado en
src/server/editorial/PERSISTENCE.md, todavía sin implementación. Define cabezas
de revisión, idempotencia, corrección/retractación y bloqueo ante conflictos,
con pruebas necesarias antes de conectar UI.
