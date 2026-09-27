import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readConfiguredStatistics,statisticsReadMode} from './statistics-reader.mjs';
import type {StoredFixture} from './fixture-view';
import policy from './statistics-policy.json';

/** Receives only the match already resolved by the team's scoped fixtureView. */
export async function statisticsViewForMatch(match: StoredFixture) {
  if (match.provider !== 'bsd') return null;
  try {
    const mode=statisticsReadMode(process.env.STATISTICS_READ_MODE);
    return await readConfiguredStatistics(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs},mode);
  } catch {return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
