import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import type {StoredFixture} from './fixture-view';
import {readConfiguredLineups,lineupReadMode} from './lineup-reader.mjs';
import policy from './lineup-policy.json';

export async function lineupViewForMatch(match:StoredFixture) {
  if(match.provider!=='bsd')return null;
  try{
    const mode=lineupReadMode(process.env.LINEUPS_READ_MODE);
    return await readConfiguredLineups(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs},mode);
  }
  catch{return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
