import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readStandings} from './read-standings.mjs';
import scope from '../identity/reviewed-primary-scope.json';
import policy from '../standings/manual-policy.json';
import labels from '../identity/reviewed-league-labels.json';

export type Selection = {kind: string; tournament?: string; group?: string};
export type TableView = {
  status: string; label: string; checked_at: number; results_as_of?: string | null;
  teams?: {id:string; label?:string; groups:Record<string,string>}[];
  selections?: Selection[];
  snapshot?: {rows:{team_id:string; calculated_position:number|null; pts:number; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; gd:number}[]} | null;
};
export const highlightedTeam = scope.externalTeamId;
export async function dashboardStandings(selection:Selection = {kind:'annual'}):Promise<TableView> {
  const now = Date.now();
  try {
    const result = await readStandings(createSupabaseAdminClient(), {scope:{provider:scope.provider, competition_id:scope.competitionId, season_id:scope.seasonId}, selection, policy, now});
    const names = labels.scope.provider===scope.provider && labels.scope.competition_id===scope.competitionId && labels.scope.season_id===scope.seasonId ? new Map(labels.teams.map(t=>[t.id,t.label])) : new Map<string,string>();
    return {...result, teams: 'teams' in result ? result.teams.map((t:{id:string;groups:Record<string,string>})=>({...t,label:names.get(t.id)})) : [], checked_at: now};
  } catch {return {status:'error',label:'Sin datos',snapshot:null,checked_at:now};}
}
