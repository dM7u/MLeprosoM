import {readFileSync} from 'node:fs';
import {prepareBsdReview, adaptBsdCatalog} from '../../src/server/standings/bsd-adapter.mjs';
import {createStandingsBatch} from '../../src/server/standings/batch.mjs';

export function officialReviewSample() {
  const load = name => JSON.parse(readFileSync(new URL(`../../docs/research/${name}`, import.meta.url)));
  const review = load('lpf-2026-standings-review.json');
  const input = adaptBsdCatalog(load('bsd-catalog-20260924.json'), prepareBsdReview(load('lpf-2026-competition-map.json'), review));
  const batch = createStandingsBatch({id: '10000000-0000-4000-8000-000000000001', input, generatedAt: '2026-09-24T01:00:00Z', auditIssues: input.issues, excludedIds: input.excluded.map(r => String(r.id))});
  const evidence = {batch_id: batch.id, payload_hash: batch.payload_hash, observed_at: review.official_tables.observed_at,
    tables: review.official_tables.tables.map(t => {
      const [tournament, group] = t.key.split(':');
      return {selection: tournament === 'annual' ? {kind: 'annual'} : {kind: 'tournament', tournament, group},
        source: tournament === 'Apertura' ? 'https://www.ligaprofesional.ar/torneo-apertura-2026/' : 'https://www.ligaprofesional.ar/torneo-clausura-mercado-libre-2026', rows: t.rows};
    })};
  return {id: '20000000-0000-4000-8000-000000000001', batch, evidence, requestActivation: true,
    now: Date.parse('2026-09-24T02:00:00Z'), policy: {resultsTtlMs: 86400000, reviewTtlMs: 86400000, evidenceTtlMs: 86400000}};
}
