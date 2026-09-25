import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import type {StoredFixture} from './fixture-view';
import {readIncidents} from './incident-observations.mjs';
import policy from './incident-policy.json';
export async function incidentViewForMatch(match:StoredFixture) {
  if(match.provider!=='bsd')return null;
  try{return await readIncidents(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs});}
  catch{return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
