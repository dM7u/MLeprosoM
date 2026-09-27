import 'server-only';
import {createSupabaseAdminClient} from '../db/supabase';
import type {StoredFixture} from '../db/fixture-view';
import scope from '../identity/reviewed-primary-scope.json';
import {upcomingXi} from './upcoming-xi.mjs';
export async function upcomingXiView(match:StoredFixture|undefined,contextReady:boolean) {
  try{return await upcomingXi(createSupabaseAdminClient(),{match,scope,contextReady,fixtureTtlMs:Number(process.env.FIXTURES_STALE_AFTER_SECONDS)*1000});}
  catch{return {status:'error',reason:'read_failed',data:null,expiresAt:null};}
}
