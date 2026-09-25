import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readStatistics} from './team-statistics.mjs';
import type {StoredFixture} from './fixture-view';
import policy from './statistics-policy.json';

/** Receives only the match already resolved by the team's scoped fixtureView. */
export async function statisticsViewForMatch(match: StoredFixture) {
  if (match.provider !== 'bsd') return null;
  try {
    return await readStatistics(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs});
  } catch {return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
