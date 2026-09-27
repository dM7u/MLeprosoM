import 'server-only';
import {readStatistics} from './team-statistics.mjs';
import {readProjectedStatistics} from './statistics-projection.mjs';

export function statisticsReadMode(value){
 if(value===undefined)return 'history';
 if(value==='history'||value==='projection')return value;
 throw new Error('STATS_READ_MODE');
}
/** Explicit server configuration only, never query parameters or schema detection. */
export async function readConfiguredStatistics(db,options,mode){
 return statisticsReadMode(mode)==='projection'?readProjectedStatistics(db,options):readStatistics(db,options);
}
