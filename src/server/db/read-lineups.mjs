import {replayHistorySelection,historySelectionView} from './history-selection.mjs';
import 'server-only';
import {readHistory} from './read-history.mjs';
import {validateLineupObservation} from './lineup-observations.mjs';
import {dataState} from '../data-state.mjs';

export function lineupSnapshotView(rows,{fixture,ttlMs,now=Date.now()}) {
  dataState({data:null,ttlMs,now});
  if(!Array.isArray(rows))throw new Error('LINEUPS_HISTORY_LIMIT');
  const keys=['provider','external_id','home_team_id','away_team_id','home_external_id','away_external_id'];
  const observations=rows.map(row=>{
    if(row.fixture_id!==fixture.id||keys.some(k=>row[k]!==fixture[k]))throw new Error('LINEUPS_IDENTITY_MISMATCH');
    return validateLineupObservation(row,{now});
  });
  return historySelectionView(replayHistorySelection('lineups',observations),{ttlMs,now});
}

export async function readLineups(db,options) {
  dataState({data:null,ttlMs:options.ttlMs,now:options.now});
  try {
    const data = await readHistory(() => db.from('lineup_observations').select('*', {count:'exact'})
      .eq('fixture_id',options.fixture.id).eq('provider',options.fixture.provider));
    return lineupSnapshotView(data,options);
  }catch{return {...dataState({data:null,ttlMs:options.ttlMs,now:options.now,refreshFailed:true}),lastObservedAt:null,lastObservationStatus:null};}
}
