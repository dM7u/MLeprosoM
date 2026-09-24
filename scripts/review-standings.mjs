import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {runManualReview} from '../src/server/standings/manual-review.mjs';

try {
  const [requestPath, policyPath, mode, ...extra] = process.argv.slice(2);
  if (!requestPath || !policyPath || extra.length || !['--dry-run', '--apply'].includes(mode)) throw new Error('OFFICIAL_REVIEW_USAGE');
  const load = path => JSON.parse(readFileSync(path, 'utf8'));
  const report = await runManualReview({request: load(requestPath), policy: load(policyPath), mode,
    getDb: () => {
      const config = getSupabaseConfig();
      return createClient(config.url, config.secretKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
    }});
  console.log(JSON.stringify(report));
  if (report.status !== 'match' || (report.activation_requested && !report.eligible_for_activation)) process.exitCode = 1;
} catch (error) {
  const code = /^(OFFICIAL_REVIEW_[A-Z_]+|INVALID_OFFICIAL_REVIEW_[A-Z_]+|INVALID_STANDINGS_[A-Z_]+)$/.test(error.message) ? error.message : 'OFFICIAL_REVIEW_FAILED';
  console.error(JSON.stringify({code})); process.exitCode = 1;
}
