import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import type {StoredFixture} from './fixture-view';
import {readConfiguredIncidents,incidentReadMode} from './incident-reader.mjs';
import policy from './incident-policy.json';
export async function incidentViewForMatch(match:StoredFixture) {
  if(match.provider!=='bsd')return null;
  try{
    const mode=incidentReadMode(process.env.INCIDENTS_READ_MODE);
    return await readConfiguredIncidents(createSupabaseAdminClient(),{fixture:match,ttlMs:policy.ttlMs},mode);
  }
  catch{return {status:'error',data:null,updatedAt:null,lastObservedAt:null,lastObservationStatus:null};}
}
