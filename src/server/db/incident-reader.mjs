import 'server-only';
import {readIncidents} from './incident-observations.mjs';
import {readProjectedIncidents} from './incident-projection.mjs';

export function incidentReadMode(value){
 if(value===undefined)return 'history';
 if(value==='history'||value==='projection')return value;
 throw new Error('INCIDENTS_READ_MODE');
}
/** Explicit server configuration only, never query parameters or schema detection. */
export async function readConfiguredIncidents(db,options,mode){
 return incidentReadMode(mode)==='projection'?readProjectedIncidents(db,options):readIncidents(db,options);
}
