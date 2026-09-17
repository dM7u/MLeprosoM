import 'server-only';

export function retryAfterMs(value, now = Date.now()) {
  if (!value) return null;
  const delay = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : null;
}

/** At most two attempts. Never retry authentication, quota or malformed JSON. */
export async function requestBsd(path, apiKey, fetcher = fetch, options = {}) {
  if (!apiKey?.trim()) throw new Error('BSD_KEY_MISSING');
  const url = new URL(path, 'https://sports.bzzoiro.com/api/v2/');
  if (url.origin !== 'https://sports.bzzoiro.com' || !url.pathname.startsWith('/api/v2/') || url.username || url.password) throw new Error('BSD_INVALID_URL');
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    let code;
    options.onAttempt?.();
    try {
      response = await fetcher(url, {headers:{Authorization:`Token ${apiKey}`},redirect:'error',signal:AbortSignal.timeout(20000)});
    } catch(error) { code = error?.name === 'TimeoutError' ? 'BSD_TIMEOUT' : 'BSD_CONNECTION_FAILED'; }
    if (response?.ok) {
      try { return await response.json(); } catch { throw new Error('BSD_INVALID_JSON'); }
    }
    const delay = retryAfterMs(response?.headers.get('retry-after'));
    const retryable = !response || [502,503,504].includes(response.status);
    if (attempt === 0 && retryable && (delay === null || delay <= 5000)) {
      await response?.body?.cancel();
      await sleep(Math.max(1000, delay ?? 0));
      continue;
    }
    await response?.body?.cancel();
    const error = new Error(code ?? `BSD_HTTP_${response.status}`);
    error.retryAfterMs = delay;
    throw error;
  }
}
