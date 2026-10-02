import 'server-only';
import cache from '../data/opponent-lineups.json' with {type:'json'};

/** Reviewed, manually refreshed lineup cache; no provider call on a page visit. */
export function opponentLineupForNext(next,teamExternalId,{entries=cache.entries,now=Date.now()}={}) {
  if(next?.provider!=='bsd'||next.source_status!=='notstarted'||!Number.isFinite(Date.parse(next.kickoff_at))||Date.parse(next.kickoff_at)<=now)return null;
  const rivalId=next.home_external_id===teamExternalId?next.away_external_id:next.away_external_id===teamExternalId?next.home_external_id:null;
  if(!rivalId)return null;
  const candidates=entries.filter(row=>row.version===1&&row.provider==='bsd'&&row.team_external_id===rivalId&&
    Number.isFinite(Date.parse(row.catalog_checked_at))&&Date.parse(row.catalog_checked_at)<=now&&
    Number.isFinite(Date.parse(row.observed_at))&&Date.parse(row.observed_at)<=now&&
    Number.isFinite(Date.parse(row.fixture?.kickoff_at))&&Date.parse(row.fixture.kickoff_at)<Math.min(now,Date.parse(next.kickoff_at))&&
    [row.fixture.home_external_id,row.fixture.away_external_id].includes(rivalId)&&
    row.lineup_team_id===rivalId&&row.lineup_side===(row.fixture.home_external_id===rivalId?'home':'away')&&
    typeof row.formation==='string'&&row.formation.split('-').map(Number).reduce((sum,count)=>sum+(Number.isSafeInteger(count)&&count>0?count:NaN),0)===10&&
    Array.isArray(row.starters)&&row.starters.length===11&&new Set(row.starters.map(p=>p.external_id)).size===11&&
    row.starters[0]?.position==='G'&&
    row.starters.every(p=>typeof p.external_id==='string'&&/^[1-9]\d*$/.test(p.external_id)&&typeof p.name==='string'&&p.name.trim()));
  if(candidates.length!==1)return null;
  return candidates[0];
}
