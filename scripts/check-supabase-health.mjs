import {pathToFileURL} from 'node:url';

/** One bounded read, no writes, no provider requests, no response data in logs. */
export async function checkSupabaseHealth({env = process.env, fetchImpl = fetch} = {}) {
  try {
    const url = new URL(env.SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY?.trim();
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !key) {
      return {ok:false, code:'HEALTH_CONFIG_INVALID'};
    }
    url.pathname = '/rest/v1/fixtures';
    url.search = '?select=id&limit=1';
    const headers = {apikey:key, Accept:'application/json'};
    // Legacy service-role JWTs require Bearer; new sb_secret keys use apikey only.
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    const response = await fetchImpl(url, {
      method:'GET', headers, redirect:'error', signal:AbortSignal.timeout(15000),
    });
    if (!response.ok) return {ok:false, code:'HEALTH_HTTP_FAILED', status:response.status};
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 1 || rows.some(row =>
      typeof row?.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id))) {
      return {ok:false, code:'HEALTH_RESPONSE_INVALID'};
    }
    return {ok:true, code:'HEALTH_READ_OK'};
  } catch {
    return {ok:false, code:'HEALTH_CHECK_FAILED'};
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkSupabaseHealth();
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
