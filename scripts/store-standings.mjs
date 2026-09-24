import 'server-only';
import {readFileSync, writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {prepareBsdReview, adaptBsdCatalog} from '../src/server/standings/bsd-adapter.mjs';
import {createStandingsBatch} from '../src/server/standings/batch.mjs';
import {storeStandingsBatch} from '../src/server/db/store-standings-batch.mjs';

try {
  // Explicit stable ID/time make retries deterministic. This command never fetches BSD.
  const [catalogPath, reviewPath, id, generatedAt, mode, ...extra] = process.argv.slice(2);
  if (!['--dry-run', '--apply'].includes(mode) || !catalogPath || !reviewPath ||
    (extra.length && (mode !== '--dry-run' || extra.length !== 2 || extra[0] !== '--batch-out' || !extra[1]))) throw new Error('STANDINGS_USAGE');
  const load = path => JSON.parse(readFileSync(path, 'utf8'));
  const catalog = load(catalogPath), review = load(reviewPath);
  const input = adaptBsdCatalog(catalog, prepareBsdReview(load(review.mapping_file), review));
  const batch = createStandingsBatch({id, input, generatedAt, auditIssues: input.issues,
    excludedIds: input.excluded.map(row => String(row.id)), requestCount: catalog.requests ?? 0});
  let result = null;
  // Optional explicit local artifact; never overwrite an existing execution.
  if (extra.length) writeFileSync(extra[1], JSON.stringify(batch, null, 2) + '\n', {flag: 'wx'});
  if (mode === '--apply') {
    const config = getSupabaseConfig();
    const db = createClient(config.url, config.secretKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
    result = await storeStandingsBatch(db, batch);
  }
  console.log(JSON.stringify({mode, id: batch.id, status: batch.status, snapshots: batch.payload.snapshots.length,
    data_as_of: batch.data_as_of, payload_hash: batch.payload_hash, published: false, result}));
} catch (error) {
  const code = /^(STANDINGS_[A-Z_]+|INVALID_STANDINGS_[A-Z_]+|BSD_[A-Z_0-9]+)$/.test(error.message) ? error.message : 'STANDINGS_FAILED';
  console.error(JSON.stringify({code})); process.exitCode = 1;
}
