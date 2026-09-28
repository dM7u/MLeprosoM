import 'server-only';
import {validateLineupObservation} from './lineup-observations.mjs';
import {createHistoryProjection} from './history-projection.mjs';
const numericId=value=>typeof value==='string'&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value));
const projection=createHistoryProjection({
 resource:'lineups',table:'lineup_observations',readRpc:'read_lineup_projection',commitRpc:'commit_lineup_projection',errorPrefix:'LINEUPS',
 validateFixture:fixture=>['external_id','home_external_id','away_external_id'].every(k=>numericId(fixture[k]))&&fixture.home_external_id!==fixture.away_external_id,
 validateRow(row,fixture,now){
  if(!row||row.fixture_id!==fixture.id||['provider','external_id','home_team_id','away_team_id','home_external_id','away_external_id'].some(k=>row[k]!==fixture[k]))throw new Error('LINEUPS_IDENTITY_MISMATCH');
  return validateLineupObservation(row,{now});
 },
});
export const validateLineupProjection=projection.validateProjection;
export const readProjectedLineups=projection.readProjection;
export const commitLineupSelection=projection.commitSelection;
export const previewLineupSelection=projection.previewSelection;
