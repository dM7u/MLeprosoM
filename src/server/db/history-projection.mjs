import 'server-only';
import {readHistory} from './read-history.mjs';
import {appendHistorySelection,replayHistorySelection,historySelectionView} from './history-selection.mjs';
import {canonicalJson} from '../standings/batch.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const comparable=row=>canonicalJson({...row,observed_at:new Date(row.observed_at).toISOString(),payload:row.payload?{...row.payload,fetched_at:new Date(row.payload.fetched_at).toISOString()}:null});
const counter=v=>Number.isSafeInteger(v)&&v>=0;

/** Shared transport/CAS, with resource-specific validation and selection. */
export function createHistoryProjection({resource,table,readRpc,commitRpc,errorPrefix,validateRow,validateFixture=()=>true,chosenStatuses=['complete','partial']}) {
const code=suffix=>errorPrefix+'_'+suffix;
/** Validate private RPC envelope; prior full-history validation is a trusted write invariant. */
function validateProjection(envelope,{fixture,now=Date.now()}){
 if(!fixture||fixture.provider!=='bsd'||!uuid(fixture.id)||!uuid(fixture.home_team_id)||!uuid(fixture.away_team_id)||fixture.home_team_id===fixture.away_team_id||(!Number.isFinite(now)||!validateFixture(fixture)))throw new Error(code('PROJECTION_INVALID'));
 if(!envelope||!Object.hasOwn(envelope,'projection')||!Object.hasOwn(envelope,'chosen')||!Object.hasOwn(envelope,'last'))throw new Error(code('PROJECTION_INVALID'));
 const p=envelope.projection;
 if(p===null){if(envelope.chosen!==null||envelope.last!==null)throw new Error(code('PROJECTION_INVALID'));return {generation:0,state:null};}
 if(p.fixture_id!==fixture.id||p.version!==1||!counter(p.generation)||!counter(p.observation_count)||typeof p.initialized!=='boolean'||
   (p.chosen_id!==null&&!uuid(p.chosen_id))||(p.last_id!==null&&!uuid(p.last_id)))throw new Error(code('PROJECTION_INVALID'));
 if(!p.initialized){if(p.generation!==0||p.observation_count!==0||p.chosen_id!==null||p.last_id!==null||envelope.chosen!==null||envelope.last!==null)throw new Error(code('PROJECTION_INVALID'));return {generation:0,state:null};}
 const validate=(raw,id)=>{if(id===null){if(raw!==null)throw new Error(code('PROJECTION_INVALID'));return null;}if(raw?.id!==id)throw new Error(code('PROJECTION_INVALID'));return validateRow(raw,fixture,now);};
 const chosen=validate(envelope.chosen,p.chosen_id),last=validate(envelope.last,p.last_id);
 if((p.observation_count===0)!==(last===null)||(!last&&chosen)|| (last&&p.observation_count<1)||p.generation<1)throw new Error(code('PROJECTION_INVALID'));
 if(chosen&&(Date.parse(chosen.observed_at)>Date.parse(last.observed_at)||!chosenStatuses.includes(chosen.status)))throw new Error(code('PROJECTION_INVALID'));
 if(chosen?.id===last?.id&&chosen&&canonicalJson(chosen)!==canonicalJson(last))throw new Error(code('PROJECTION_INVALID'));
 if(p.observation_count===1&&(chosen&&chosen.id!==last.id))throw new Error(code('PROJECTION_INVALID'));
 const reduced=replayHistorySelection(resource,chosen&&chosen.id!==last?.id?[chosen,last]:last?[last]:[]);
 if((reduced.chosen?.id??null)!==p.chosen_id)throw new Error(code('PROJECTION_INVALID'));
 return {generation:p.generation,state:{...reduced,count:p.observation_count}};
}

async function readProjection(db,options){
 try{
  const response=await db.rpc(readRpc,{p_fixture_id:options.fixture.id});
  if(response.error)throw new Error();
  const {state}=validateProjection(response.data,options);
  if(!state)throw new Error();
  return historySelectionView(state,options);
 }catch{return {status:'error',label:'Sin datos',data:null,updatedAt:null,partial:false,lastObservedAt:null,lastObservationStatus:null};}
}

/** Explicit projection mode; dry-run validates the plan without calling commit RPC. */
async function commitValidatedSelection(db,{fixture,observation=null,now=Date.now(),dryRun=false}){
 if(typeof dryRun!=='boolean')throw new Error(code('PROJECTION_INVALID'));
 const row=observation===null?null:validateRow(observation,fixture,now);
 const initial=await db.rpc(readRpc,{p_fixture_id:fixture.id});
 if(initial.error)throw new Error(code('PROJECTION_UNAVAILABLE'));
 const initialState=validateProjection(initial.data,{fixture,now});
 // Preserve UUID retry semantics even if a later generation is now current.
 if(row){
  const response=await db.from(table).select('*').eq('id',row.id).maybeSingle();
  if(response.error)throw new Error(code('PROJECTION_UNAVAILABLE'));
  if(response.data){
   const existing=validateRow(response.data,fixture,now);
   if(comparable(existing)!==comparable(row))throw new Error(code('IDEMPOTENCY_CONFLICT'));
   return {stored:false,replay:true,...(dryRun?{dry_run:true,generation:initialState.generation,projection_initialized:Boolean(initialState.state)}:{})};
  }
 }
 for(let attempt=0;attempt<3;attempt++){
  const response=attempt===0?initial:await db.rpc(readRpc,{p_fixture_id:fixture.id});
  if(response.error)throw new Error(code('PROJECTION_UNAVAILABLE'));
  const {generation,state}=validateProjection(response.data,{fixture,now});
  let next;
  if(row&&state&&(!state.last||Date.parse(row.observed_at)>Date.parse(state.last.observed_at)))next=appendHistorySelection(state,row);
  else{
   let rows;
   try{rows=await readHistory(()=>db.from(table).select('*',{count:'exact'}).eq('fixture_id',fixture.id).eq('provider',fixture.provider));}
   catch(error){if(error.message==='HISTORY_CHANGED')continue;throw new Error(code('PROJECTION_UNAVAILABLE'));}
   const validated=rows.map(r=>validateRow(r,fixture,now));
   // Another writer may have committed this exact operation since the first check.
   const existing=row&&validated.find(r=>r.id===row.id);
   if(existing){if(comparable(existing)!==comparable(row))throw new Error(code('IDEMPOTENCY_CONFLICT'));return {stored:false,replay:true,...(dryRun?{dry_run:true,generation,projection_initialized:Boolean(state)}:{})};}
   next=replayHistorySelection(resource,row?[...validated,row]:validated);
  }
  if(dryRun)return {stored:false,replay:false,dry_run:true,generation,projection_initialized:Boolean(state),plan:{version:next.version,count:next.count,chosen_id:next.chosen?.id??null,last_id:next.last?.id??null}};
  const result=await db.rpc(commitRpc,{p_fixture_id:fixture.id,p_expected_generation:generation,p_observation:row,p_chosen_id:next.chosen?.id??null,p_last_id:next.last?.id??null,p_count:next.count,p_version:next.version});
  if(!result.error){
   if(typeof result.data?.stored!=='boolean'||typeof result.data?.replay!=='boolean'||!counter(result.data.generation))throw new Error(code('PROJECTION_UNAVAILABLE'));
   return result.data;
  }
  if(result.error.message===code('PROJECTION_CHANGED'))continue;
  if(result.error.message===code('IDEMPOTENCY_CONFLICT'))throw new Error(code('IDEMPOTENCY_CONFLICT'));
  throw new Error(code('PROJECTION_UNAVAILABLE'));
 }
 throw new Error(code('PROJECTION_RETRY_EXHAUSTED'));
}

async function commitSelection(db,options){
 try{return await commitValidatedSelection(db,options);}
 catch(error){throw new Error([code('IDEMPOTENCY_CONFLICT'),code('PROJECTION_RETRY_EXHAUSTED'),code('PROJECTION_INVALID')].includes(error.message)?error.message:code('PROJECTION_UNAVAILABLE'));}
}

async function previewSelection(db,options){
 return commitSelection(db,{...options,dryRun:true});
}

return {validateProjection,readProjection,commitSelection,previewSelection};
}
