import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readTeamStarts} from './team-starts.mjs';
import type {StoredFixture} from './fixture-view';

export async function teamStartsView(fixtures:StoredFixture[],teamExternalId:string,now:number) {
  try {
    return await readTeamStarts(createSupabaseAdminClient(),fixtures,{teamExternalId,now});
  }catch{
    return {status:'error',finishedCount:fixtures.filter(f=>f.provider==='bsd').length,coveredCount:0,players:[],certain:[],tied:[],places:0,observedAt:null,latestLineup:null};
  }
}
