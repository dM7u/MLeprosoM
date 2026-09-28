import 'server-only';
import {validateStatisticsObservation} from './team-statistics.mjs';
import {createHistoryProjection} from './history-projection.mjs';
const projection=createHistoryProjection({resource:'statistics',table:'team_statistics_observations',readRpc:'read_statistics_projection',commitRpc:'commit_statistics_projection',errorPrefix:'STATS',validateRow:validateStatisticsObservation});
export const validateStatisticsProjection=projection.validateProjection;
export const readProjectedStatistics=projection.readProjection;
export const commitStatisticsSelection=projection.commitSelection;
export const previewStatisticsSelection=projection.previewSelection;
