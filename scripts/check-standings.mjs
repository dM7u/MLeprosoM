import 'server-only';
import {readFileSync} from 'node:fs';
import {readBsdCatalog} from '../src/server/providers/bsd/catalog.mjs';
import {runBsdStandings, compareReviewedTables} from '../src/server/standings/bsd-adapter.mjs';

// No Supabase import, write operation, apply mode or scheduler.
let requests = 0;
try {
  const [mode, reviewPath, replayFlag, catalogPath, ...extra] = process.argv.slice(2);
  if (mode !== '--dry-run' || !reviewPath || extra.length || (replayFlag !== undefined && (replayFlag !== '--catalog-file' || !catalogPath))) throw new Error('BSD_STANDINGS_USAGE');
  const load = path => JSON.parse(readFileSync(path, 'utf8'));
  const review = load(reviewPath);
  const mapping = load(review.mapping_file);
  const catalog = catalogPath ? load(catalogPath) : await readBsdCatalog({leagueId: Number(review.scope.competition_id), seasonId: Number(review.scope.season_id), apiKey: process.env.BSD_API_KEY, onAttempt: () => requests++});
  const report = runBsdStandings(catalog, mapping, review, new Date().toISOString());
  report.requests = requests;
  report.replay = Boolean(catalogPath);
  report.comparison_observed_at = review.official_tables.observed_at;
  report.comparison = compareReviewedTables(report, review.official_tables);
  console.log(JSON.stringify(report, null, 2));
  if (report.snapshots.some(s => s.state === 'incomplete') || report.comparison.some(c => c.state !== 'match')) process.exitCode = 1;
} catch (error) {
  const code = /^(BSD_[A-Z_0-9]+|INVALID_STANDINGS_[A-Z_]+|DUPLICATE_STANDINGS_FIXTURE)$/.test(error.message) ? error.message : 'BSD_STANDINGS_FAILED';
  console.error(JSON.stringify({code, requests, retryAfterMs: error.retryAfterMs ?? null}));
  process.exitCode = 1;
}
