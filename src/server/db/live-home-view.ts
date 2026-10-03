import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import type {StoredFixture} from './fixture-view';
import {projectLiveHome} from '../live/home-projection.mjs';

type LiveHome = {fixture:StoredFixture;payload:{home_score:number|null;away_score:number|null;current_minute:number|null};observedAt:string};
type HomeView = {fixtures:StoredFixture[];live:LiveHome|null};

export async function liveHomeView(fixtures:StoredFixture[]):Promise<HomeView> {
  const regular={fixtures,live:null};
  if(process.env.LIVE_HOME_ENABLED!=='true')return regular;
  const ids=fixtures.filter(f=>f.provider==='bsd').map(f=>f.id);
  if(!ids.length)return regular;
  try {
    const db=createSupabaseAdminClient();
    const {data:sessions,error:sessionError}=await db.from('live_sessions')
      .select('fixture_id,enabled,phase').in('fixture_id',ids);
    if(sessionError||!sessions?.length)return regular;
    const {data:snapshots,error:snapshotError}=await db.from('live_snapshots')
      .select('fixture_id,resource,last_quality,last_good_at,last_good_payload')
      .in('fixture_id',sessions.map(s=>s.fixture_id)).eq('resource','fixture');
    if(snapshotError||!snapshots)return regular;
    return projectLiveHome(fixtures,sessions,snapshots,Date.now()) as HomeView;
  } catch {return regular;}
}
