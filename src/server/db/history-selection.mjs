import 'server-only';
import {teamStatisticFields} from '../providers/bsd/team-statistics.mjs';
import {dataState} from '../data-state.mjs';
const ambiguity={statistics:'STATS_AMBIGUOUS_OBSERVATION',lineups:'LINEUPS_AMBIGUOUS_TIME',incidents:'INCIDENTS_AMBIGUOUS_TIME'};
export const historySelectionVersion=1;
export function emptyHistorySelection(resource){
 if(!Object.hasOwn(ambiguity,resource))throw new Error('HISTORY_SELECTION_RESOURCE');
 return {version:historySelectionVersion,resource,count:0,chosen:null,last:null};
}
/** Internal only: rows and prior state must already have passed full resource validation.
 * This is not a validator for persisted/untrusted projections. No in-place mutation.
 */
export function appendHistorySelection(state,row){
 if(state?.version!==historySelectionVersion||!Object.hasOwn(ambiguity,state.resource)||!Number.isSafeInteger(state.count)||state.count<0||state.count===Number.MAX_SAFE_INTEGER)throw new Error('HISTORY_SELECTION_STATE');
 const time=Date.parse(row?.observed_at),previous=state.last?Date.parse(state.last.observed_at):null;
 if(!Number.isFinite(time)||(previous!==null&&!Number.isFinite(previous)))throw new Error('HISTORY_SELECTION_TIME');
 if(previous!==null&&time===previous)throw new Error(ambiguity[state.resource]);
 if(previous!==null&&time<previous)throw new Error('HISTORY_SELECTION_REPLAY_REQUIRED');
 let chosen=state.chosen;
 if(state.resource==='statistics'){
  if(row.payload&&row.status!=='empty'&&(!chosen||['home','away'].every(side=>teamStatisticFields.every(key=>chosen.payload[side][key]===null||row.payload[side][key]!==null))))chosen=row;
 }else if(state.resource==='lineups'){
  if(row.status!=='unavailable'&&!(chosen?.payload.source_updated_at&&(!row.payload.source_updated_at||Date.parse(row.payload.source_updated_at)<Date.parse(chosen.payload.source_updated_at)))&&(!chosen||row.status==='complete'))chosen=row;
 }else if(row.status==='available'||row.status==='partial')chosen=row;
 return {...state,count:state.count+1,chosen,last:row};
}
/** Complete validated history; sorts a copy, never UUID tie-breaking. */
export function replayHistorySelection(resource,rows){
 return [...rows].sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at)).reduce(appendHistorySelection,emptyHistorySelection(resource));
}
export function historySelectionView(state,{ttlMs,now=Date.now()}){
 if(state?.version!==historySelectionVersion||!Object.hasOwn(ambiguity,state.resource))throw new Error('HISTORY_SELECTION_STATE');
 const {chosen,last}=state;
 const refreshFailed=Boolean(state.resource==='lineups'?chosen&&chosen.id!==last.id:last&&(chosen?chosen.id!==last.id:last.status==='failed'));
 return {...dataState({data:chosen?.payload??null,fetchedAt:chosen?.observed_at,ttlMs,now,partial:chosen?.status==='partial',refreshFailed}),lastObservedAt:last?.observed_at??null,lastObservationStatus:last?.status??null};
}
