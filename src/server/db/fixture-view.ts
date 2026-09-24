import 'server-only';
import {createTournamentResolver} from '../competitions/resolve-tournament.mjs';
import tournamentMap from '../competitions/newells-2026.json';
import {createSupabaseAdminClient} from './supabase';
import {readCombinedFixtures} from './read-combined-fixtures.mjs';
import {createTeamResolver} from '../identity/team-identity.mjs';
import registry from '../identity/reviewed-teams.json';
import primary from '../identity/reviewed-primary-scope.json';
import cup from '../providers/goal-api/reviewed-scope.json';

export type StoredFixture = {
  id: string; provider: string; competition: string | null;
  kickoff_at: string | null; home_team: string | null; away_team: string | null;
  home_score: number | null; away_score: number | null;
  home_penalty_score?: number | null; away_penalty_score?: number | null;
  home_fulltime_score?: number | null; away_fulltime_score?: number | null;
  home_extra_score?: number | null; away_extra_score?: number | null;
  fetched_at?: string | null;
  tournament?: {name:string;round:number} | null; source_status: string; source_stage?: string | null;
};
const unavailable=(status:string)=>({status,label:'Sin datos',data:[] as StoredFixture[],updatedAt:null as string|null,sources:[] as {provider:string;status:string;label:string;updatedAt:string|null}[]});

export async function fixtureView() {
  const provider=process.env.FOOTBALL_PROVIDER;
  const externalTeamId=process.env.FOOTBALL_TEAM_ID;
  const ttlMs=Number(process.env.FIXTURES_STALE_AFTER_SECONDS)*1000;
  if(!provider || !externalTeamId || !Number.isFinite(ttlMs) || ttlMs<=0)return unavailable('empty');
  try {
    const resolve=createTeamResolver(registry);
    const canonical=resolve(provider,externalTeamId).canonicalId;
    const scopes: {provider:string;externalTeamId:string;competitionId?:string;seasonId?:string}[]=[{provider,externalTeamId}];
    if(provider===primary.provider && externalTeamId===primary.externalTeamId && canonical!==null && canonical===cup.canonicalTeamId && resolve('goal-api',cup.teamId).canonicalId===canonical){
      scopes[0]={provider,externalTeamId,competitionId:primary.competitionId,seasonId:primary.seasonId};
      scopes.push({provider:'goal-api',externalTeamId:cup.teamId,competitionId:cup.leagueId,seasonId:cup.season});
    }
    const result=await readCombinedFixtures(createSupabaseAdminClient(),scopes,{ttlMs,now:Date.now()});
    const resolveTournament=createTournamentResolver(tournamentMap);
    return {...result,data:result.data.map(row=>({...row,tournament:resolveTournament(row)})) as StoredFixture[]};
  }catch{return unavailable('error');}
}
