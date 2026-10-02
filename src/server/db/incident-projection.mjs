import 'server-only';
import {validateIncidentObservation} from './incident-observations.mjs';
import {createHistoryProjection} from './history-projection.mjs';
const projection=createHistoryProjection({
 resource:'incidents',table:'incident_observations',readRpc:'read_incident_projection',commitRpc:'commit_incident_projection',errorPrefix:'INCIDENTS',
 chosenStatuses:['available','partial'],
 validateFixture:fixture=>typeof fixture.external_id==='string'&&/^[1-9]\d*$/.test(fixture.external_id)&&Number.isSafeInteger(Number(fixture.external_id)),
 validateRow(row,fixture,now){
  if(!row||row.fixture_id!==fixture.id||['provider','external_id','home_team_id','away_team_id'].some(k=>row[k]!==fixture[k]))throw new Error('INCIDENTS_IDENTITY_MISMATCH');
  return validateIncidentObservation(row,{now});
 },
});
export const validateIncidentProjection=projection.validateProjection;
export const readProjectedIncidents=projection.readProjection;
export const commitIncidentSelection=projection.commitSelection;
export const previewIncidentSelection=projection.previewSelection;
