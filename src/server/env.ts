import "server-only";

/** Validar al usar la integración: el sitio puede construirse sin credenciales. */
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) {
    throw new Error("Configuración de Supabase incompleta: revisar SUPABASE_URL y SUPABASE_SECRET_KEY en el servidor.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL debe ser una URL HTTPS válida.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("SUPABASE_URL debe ser un origen HTTPS sin credenciales, ruta ni parámetros.");
  }

  return { url: parsed.origin, secretKey };
}
