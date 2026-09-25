import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import type {StoredFixture} from './fixture-view';
import {readLineups} from './read-lineups.mjs';
import policy from './lineup-policy.json';

export async function lineupViewForMatch(match:StoredFixture) {
  if(match.provider!=='bsd')return null;
  try{return await readLineups(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs});}
  catch{return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
