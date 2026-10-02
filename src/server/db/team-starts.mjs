import 'server-only';
import {readHistory} from './read-history.mjs';
import {lineupSnapshotView} from './read-lineups.mjs';

const empty=(status,finishedCount)=>({status,finishedCount,coveredCount:0,players:[],certain:[],tied:[],places:0,observedAt:null});

/** Counts starts only in stored, confirmed BSD lineups with eleven identified Newell's starters. */
export function teamStartsView(fixtures,rows,{teamExternalId='',now=Date.now()}={}) {
  const eligible=fixtures.filter(f=>f.provider==='bsd');
  if(!eligible.length)return empty('empty',0);
  const grouped=new Map();
  for(const row of rows){
    if(!grouped.has(row.fixture_id))grouped.set(row.fixture_id,[]);
    grouped.get(row.fixture_id).push(row);
  }
  const players=new Map();
  let coveredCount=0,observedAt=null;
  for(const fixture of eligible){
    const history=grouped.get(fixture.id)??[];
    if(!history.length)continue;
    const view=lineupSnapshotView(history,{fixture,ttlMs:21600000,now});
    const side=fixture.home_external_id===teamExternalId?'home':fixture.away_external_id===teamExternalId?'away':null;
    if(!side||!view.data||view.data[side]?.team_id!==teamExternalId)continue;
    const starters=view.data[side].starters;
    if(!Array.isArray(starters)||starters.length!==11||new Set(starters.map(p=>p.external_id)).size!==11)continue;
    coveredCount++;
    if(view.updatedAt&&(!observedAt||Date.parse(view.updatedAt)>Date.parse(observedAt)))observedAt=view.updatedAt;
    const kickoff=Date.parse(fixture.kickoff_at);
    const lastStartAt=Number.isFinite(kickoff)?fixture.kickoff_at:null;
    for(const player of starters){
      const prior=players.get(player.external_id);
      players.set(player.external_id,{id:player.external_id,name:player.name,starts:(prior?.starts??0)+1,
        lastStartAt:!prior?.lastStartAt||kickoff>Date.parse(prior.lastStartAt)?lastStartAt:prior.lastStartAt});
    }
  }
  if(!coveredCount)return empty('empty',eligible.length);
  const recent=p=>p.lastStartAt?Date.parse(p.lastStartAt):-Infinity;
  const sorted=[...players.values()].sort((a,b)=>b.starts-a.starts||recent(b)-recent(a)||a.name.localeCompare(b.name,'es'));
  const cutoff=sorted[10];
  const certain=!cutoff?sorted:sorted.filter(p=>p.starts>cutoff.starts||p.starts===cutoff.starts&&recent(p)>recent(cutoff));
  const tied=!cutoff?[]:sorted.filter(p=>p.starts===cutoff.starts&&recent(p)===recent(cutoff));
  return {status:'available',finishedCount:eligible.length,coveredCount,players:sorted,certain,tied,places:cutoff?11-certain.length:0,observedAt};
}

export async function readTeamStarts(db,fixtures,{teamExternalId='',now=Date.now()}={}) {
  const eligible=fixtures.filter(f=>f.provider==='bsd');
  if(!eligible.length)return empty('empty',0);
  try {
    const ids=eligible.map(f=>f.id);
    const rows=await readHistory(()=>db.from('lineup_observations').select('*',{count:'exact'}).eq('provider','bsd').in('fixture_id',ids),{maxPages:20});
    return teamStartsView(eligible,rows,{teamExternalId,now});
  }catch{return empty('error',eligible.length);}
}
