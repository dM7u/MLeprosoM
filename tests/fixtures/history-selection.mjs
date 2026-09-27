import {readFileSync} from 'node:fs';
import {createStatisticsObservation,statisticsView} from '../../src/server/db/team-statistics.mjs';
import {createLineupObservation} from '../../src/server/db/lineup-observations.mjs';
import {lineupSnapshotView} from '../../src/server/db/read-lineups.mjs';
import {createIncidentObservation,incidentSnapshotView} from '../../src/server/db/incident-observations.mjs';
export const now=Date.parse('2026-09-26T12:00:00Z');
export const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
const sample=name=>JSON.parse(readFileSync(new URL('../../docs/research/'+name,import.meta.url),'utf8')).body;
const stats=sample('bsd-team-stats-223728-20260924.json'),lineups=sample('bsd-lineups-223728-20260925.json'),incidents=sample('bsd-incidents-223728-20260925.json');
export const views={statistics:statisticsView,lineups:lineupSnapshotView,incidents:incidentSnapshotView};
export function scenarios(resource){
 const make=(kind,i)=>{
 const observedAt=new Date(now-10000+i*1000).toISOString();
 const args={fixture,now,observedAt,id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0')};
 if(resource==='statistics')return createStatisticsObservation({...args,...(kind===3?{failed:true}:{body:kind===0?stats:{event_id:223728,stats:{home:kind===1?{total_shots:0}:{corner_kicks:2}}}})});
 if(resource==='lineups')return createLineupObservation({...args,body:{...lineups,updated_at:kind===3?null:kind===2?'2026-09-25T00:00:00Z':observedAt,...(kind===1?{lineups:{...lineups.lineups,home:{...lineups.lineups.home,players:lineups.lineups.home.players.slice(0,1)}}}:{}),...(kind===3?{lineup_status:'predicted'}:{})}});
 return createIncidentObservation({...args,...(kind===3?{failed:true}:{body:{...incidents,incidents:kind===0?incidents.incidents:kind===1?incidents.incidents.slice(0,1):[]}})});
 };
 const result=[[]];
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)result.push([make(a,0),make(b,1),make(c,2)]);
 return result;
}
