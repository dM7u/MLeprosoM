import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readStandingsSet} from './read-standings.mjs';
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
/** Owned by one Page invocation: no module-level or persistent cache. */
export async function dashboardStandingsSet():Promise<{annual:TableView; select:(selection:Selection)=>TableView}> {
  const now = Date.now();
  const unavailable:TableView = {status:'error',label:'Sin datos',snapshot:null,checked_at:now};
  try {
    const result = await readStandingsSet(createSupabaseAdminClient(), {scope:{provider:scope.provider, competition_id:scope.competitionId, season_id:scope.seasonId}, policy, now});
    const names = labels.scope.provider===scope.provider && labels.scope.competition_id===scope.competitionId && labels.scope.season_id===scope.seasonId ? new Map(labels.teams.map(t=>[t.id,t.label])) : new Map<string,string>();
    const decorate = (view:Omit<TableView,'checked_at'>):TableView => ({...view, teams:view.teams?.map(t=>({...t,label:names.get(t.id)}))??[],checked_at:now});
    const {views, ...annualResult} = {...result, views:'views' in result ? result.views : undefined};
    const annual = decorate(annualResult);
    const selections = views?.map((entry:{selection:Selection;view:Omit<TableView,'checked_at'>})=>({selection:entry.selection,view:decorate(entry.view)}))??[];
    return {annual, select:selection => selections.find((entry:{selection:Selection})=>
      entry.selection.kind===selection.kind && entry.selection.tournament===selection.tournament && entry.selection.group===selection.group)?.view ?? {...unavailable}};
  } catch {return {annual:unavailable,select:()=>({...unavailable})};}
}
