import 'server-only';
import {readLineups} from './read-lineups.mjs';
import {readProjectedLineups} from './lineup-projection.mjs';

export function lineupReadMode(value){
 if(value===undefined)return 'history';
 if(value==='history'||value==='projection')return value;
 throw new Error('LINEUPS_READ_MODE');
}
/** Explicit server configuration only, never query parameters or schema detection. */
export async function readConfiguredLineups(db,options,mode){
 return lineupReadMode(mode)==='projection'?readProjectedLineups(db,options):readLineups(db,options);
}
