import 'server-only';
import {readEditorialXi} from './revisions.mjs';
import {readLineups} from '../db/read-lineups.mjs';
import lineupPolicy from '../db/lineup-policy.json' with {type:'json'};
import policy from './xi-policy.json' with {type:'json'};

/** Persisted inputs only. Never substitute editorial evidence for known provider lineups. */
export async function upcomingXi(db,{match,scope,contextReady,fixtureTtlMs,now=Date.now()},readers={editorial:readEditorialXi,lineups:readLineups}) {
  const absent=reason=>({status:'unavailable',reason,data:null,expiresAt:null});
  if(!match)return absent('no_fixture');
  if(match.provider!==scope.provider||match.competition_external_id!==scope.competitionId||match.season_external_id!==scope.seasonId||
    ![match.home_external_id,match.away_external_id].includes(scope.externalTeamId))return absent('unsupported');
  const observed=Date.parse(match.fetched_at),kickoff=Date.parse(match.kickoff_at);
  if(match.source_status!=='notstarted'||!Number.isFinite(kickoff)||kickoff<=now)return absent('not_upcoming');
  if(!contextReady||!Number.isFinite(fixtureTtlMs)||fixtureTtlMs<=0||!Number.isFinite(observed)||observed>now||now-observed>=fixtureTtlMs)return absent('stale_context');
  try {
    const lineups=await readers.lineups(db,{fixture:match,ttlMs:lineupPolicy.ttlMs,now});
    if(lineups.status==='error')return {status:'error',reason:'read_failed',data:null,expiresAt:null};
    // Even partial or old confirmed provider data needs review, not an editorial fallback.
    if(lineups.data)return absent('provider_lineup');
    const fixture={...match,fixture_external_id:match.external_id,state:'scheduled'};
    const teamId=match.home_external_id===scope.externalTeamId?match.home_team_id:match.away_team_id;
    const result=await readers.editorial(db,{fixture,teamId,now});
    if(result.status!=='available')return {...absent('no_evidence'),status:result.status==='error'?'error':'unavailable'};
    const expiresAt=Math.min(kickoff,observed+fixtureTtlMs,...result.data.sources.map(s=>Date.parse(s.published_at)+policy.maxAgeMs));
    if(!Number.isFinite(expiresAt)||expiresAt<=now)return absent('expired');
    return {status:'available',reason:null,data:result.data,expiresAt};
  }catch{return {status:'error',reason:'read_failed',data:null,expiresAt:null};}
}
