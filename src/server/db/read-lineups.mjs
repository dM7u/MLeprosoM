import 'server-only';
import {validateLineupObservation} from './lineup-observations.mjs';
import {dataState} from '../data-state.mjs';

export function lineupSnapshotView(rows,{fixture,ttlMs,now=Date.now()}) {
  dataState({data:null,ttlMs,now});
  if(!Array.isArray(rows)||rows.length>100)throw new Error('LINEUPS_HISTORY_LIMIT');
  const keys=['provider','external_id','home_team_id','away_team_id','home_external_id','away_external_id'];
  const observations=rows.map(row=>{
    if(row.fixture_id!==fixture.id||keys.some(k=>row[k]!==fixture[k]))throw new Error('LINEUPS_IDENTITY_MISMATCH');
    return validateLineupObservation(row,{now});
  }).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
  let chosen=null,last=null;
  for(const row of observations){
    if(last&&Date.parse(last.observed_at)===Date.parse(row.observed_at))throw new Error('LINEUPS_AMBIGUOUS_TIME');
    last=row;
    if(row.status==='unavailable')continue;
    // Ignore a provider revision older than the retained one; never merge lineups.
    if(chosen?.payload.source_updated_at&&(!row.payload.source_updated_at||Date.parse(row.payload.source_updated_at)<Date.parse(chosen.payload.source_updated_at)))continue;
    if(!chosen||row.status==='complete')chosen=row;
  }
  return {...dataState({data:chosen?.payload??null,fetchedAt:chosen?.observed_at,ttlMs,now,
    partial:chosen?.status==='partial',refreshFailed:Boolean(chosen&&chosen!==last)}),
    lastObservedAt:last?.observed_at??null,lastObservationStatus:last?.status??null};
}

export async function readLineups(db,options) {
  dataState({data:null,ttlMs:options.ttlMs,now:options.now});
  try {
    const {data,error}=await db.from('lineup_observations').select('*').eq('fixture_id',options.fixture.id)
      .eq('provider',options.fixture.provider).order('observed_at',{ascending:true}).limit(101);
    if(error)throw new Error();
    return lineupSnapshotView(data,options);
  }catch{return {...dataState({data:null,ttlMs:options.ttlMs,now:options.now,refreshFailed:true}),lastObservedAt:null,lastObservationStatus:null};}
}
