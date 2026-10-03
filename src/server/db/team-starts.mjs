import 'server-only';
import {readHistory} from './read-history.mjs';
import {lineupSnapshotView} from './read-lineups.mjs';
import reviewedNames from '../identity/reviewed-player-names.json' with {type:'json'};

const empty=(status,finishedCount)=>({status,finishedCount,coveredCount:0,players:[],certain:[],tied:[],places:0,formations:[],formationLineup:null,observedAt:null,latestLineup:null});

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
  const formations=new Map();
  const formationSlots=new Map();
  const displayName=player=>teamExternalId===reviewedNames.team_external_id?reviewedNames.names[player.external_id]??player.name:player.name;
  let coveredCount=0,observedAt=null,latestLineup=null;
  for(const fixture of eligible){
    const history=grouped.get(fixture.id)??[];
    if(!history.length)continue;
    const view=lineupSnapshotView(history,{fixture,ttlMs:21600000,now});
    const side=fixture.home_external_id===teamExternalId?'home':fixture.away_external_id===teamExternalId?'away':null;
    if(!side||!view.data||view.data[side]?.team_id!==teamExternalId)continue;
    const starters=view.data[side].starters;
    if(!Array.isArray(starters)||starters.length!==11||new Set(starters.map(p=>p.external_id)).size!==11)continue;
    coveredCount++;
    const formation=view.data[side].formation;
    if(typeof formation==='string'&&/^([1-9]\d*-)+[1-9]\d*$/.test(formation)&&formation.split('-').map(Number).reduce((a,b)=>a+b,0)===10){
      formations.set(formation,(formations.get(formation)??0)+1);
      const slots=formationSlots.get(formation)??Array.from({length:11},()=>new Map());
      for(const [index,player] of starters.entries()){
        const prior=slots[index].get(player.external_id);
        const newest=!prior?.lastStartAt||Date.parse(fixture.kickoff_at)>Date.parse(prior.lastStartAt);
        slots[index].set(player.external_id,{id:player.external_id,name:displayName(player),
          jersey_number:newest?player.jersey_number:prior.jersey_number,position:newest?player.position:prior.position,
          starts:(prior?.starts??0)+1,lastStartAt:newest?fixture.kickoff_at:prior.lastStartAt});
      }
      formationSlots.set(formation,slots);
    }
    if(!latestLineup||Date.parse(fixture.kickoff_at)>Date.parse(latestLineup.fixture.kickoff_at))
      latestLineup={fixture,data:view.data,observedAt:view.updatedAt};
    if(view.updatedAt&&(!observedAt||Date.parse(view.updatedAt)>Date.parse(observedAt)))observedAt=view.updatedAt;
    const kickoff=Date.parse(fixture.kickoff_at);
    const lastStartAt=Number.isFinite(kickoff)?fixture.kickoff_at:null;
    for(const player of starters){
      const prior=players.get(player.external_id);
      players.set(player.external_id,{id:player.external_id,name:displayName(player),starts:(prior?.starts??0)+1,
        lastStartAt:!prior?.lastStartAt||kickoff>Date.parse(prior.lastStartAt)?lastStartAt:prior.lastStartAt});
    }
  }
  if(!coveredCount)return empty('empty',eligible.length);
  const recent=p=>p.lastStartAt?Date.parse(p.lastStartAt):-Infinity;
  const sorted=[...players.values()].sort((a,b)=>b.starts-a.starts||recent(b)-recent(a)||a.name.localeCompare(b.name,'es'));
  const cutoff=sorted[10];
  const certain=!cutoff?sorted:sorted.filter(p=>p.starts>cutoff.starts||p.starts===cutoff.starts&&recent(p)>recent(cutoff));
  const tied=!cutoff?[]:sorted.filter(p=>p.starts===cutoff.starts&&recent(p)===recent(cutoff));
  const rankedFormations=[...formations].map(([name,starts])=>({name,starts})).sort((a,b)=>b.starts-a.starts||a.name.localeCompare(b.name,'es'));
  const top=rankedFormations[0];
  const slots=top&&rankedFormations[1]?.starts!==top.starts?formationSlots.get(top.name):null;
  const picked=slots?.map(slot=>{
    const ranked=[...slot.values()].sort((a,b)=>b.starts-a.starts||recent(b)-recent(a));
    return ranked[1]?.starts===ranked[0]?.starts&&recent(ranked[1])===recent(ranked[0])?null:ranked[0]??null;
  })??[];
  const formationLineup=picked.length===11&&picked.every(Boolean)&&new Set(picked.map(p=>p.id)).size===11?{formation:top.name,starts:top.starts,starters:picked}:null;
  return {status:'available',finishedCount:eligible.length,coveredCount,players:sorted,certain,tied,places:cutoff?11-certain.length:0,
    formations:rankedFormations,formationLineup,
    observedAt,latestLineup};
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
