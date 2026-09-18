import 'server-only';
import {dataState} from '../data-state.mjs';

/** Backend read only. Never queries a football provider or refreshes stored data. */
export async function readTeamFixtures(db, {provider, externalTeamId, ttlMs, now = Date.now()}) {
  if (typeof provider !== 'string' || !provider.trim() || typeof externalTeamId !== 'string' || !externalTeamId.trim()) throw new Error('INVALID_TEAM_REFERENCE');
  // Validate policy even when storage is empty or unavailable.
  dataState({data:null,fetchedAt:null,ttlMs,now});
  const empty = failed => dataState({data:null,fetchedAt:null,ttlMs,now,refreshFailed:failed});
  try {
    const {data:team,error:teamError}=await db.from('teams').select('id,name').eq('provider',provider).eq('external_id',externalTeamId).maybeSingle();
    if(teamError) return empty(true);
    if(!team) return empty(false);
    // IDs obtained from storage; no interpolation of user strings in .or().
    if(!/^[0-9a-f-]{36}$/i.test(team.id)) return empty(true);
    const {data:fixtures,error}=await db.from('fixtures')
      .select('id,home_team_id,away_team_id,kickoff_at,source_status,home_score,away_score,fetched_at')
      .eq('provider',provider).or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
      .order('kickoff_at',{ascending:false,nullsFirst:false}).limit(101);
    if(error || !Array.isArray(fixtures)) return empty(true);
    if(!fixtures.length) return empty(false);
    const partial = fixtures.length > 100;
    const visible=fixtures.slice(0,100);
    const ids=[...new Set(visible.flatMap(x=>[x.home_team_id,x.away_team_id]))];
    const {data:teams,error:namesError}=await db.from('teams').select('id,name').eq('provider',provider).in('id',ids);
    const names=new Map((namesError?[]:teams??[]).map(x=>[x.id,x.name]));
    const data=visible.map(x=>({...x,home_team:names.get(x.home_team_id)??null,away_team:names.get(x.away_team_id)??null}));
    // Oldest row determines collection freshness; one fresh row cannot hide older ones.
    const timestamps=visible.map(x=>Date.parse(x.fetched_at));
    const valid=timestamps.every(x=>Number.isFinite(x)&&x<=now);
    const fetchedAt=valid?new Date(Math.min(...timestamps)).toISOString():null;
    return dataState({data,fetchedAt,ttlMs,now,partial:partial||Boolean(namesError)||data.some(x=>!x.home_team||!x.away_team)});
  } catch { return empty(true); }
}
