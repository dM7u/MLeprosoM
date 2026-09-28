import 'server-only';
import {readHistory} from './read-history.mjs';
import {historySelectionView} from './history-selection.mjs';
import {canonicalJson} from '../standings/batch.mjs';
const instant=value=>value===null?null:new Date(value).toISOString();
const comparable=view=>canonicalJson({...view,updatedAt:instant(view.updatedAt),lastObservedAt:instant(view.lastObservedAt),data:view.data?{...view.data,fetched_at:instant(view.data.fetched_at)}:null});

/** Internal resource configuration; shared stable-generation verification. */
export function createHistoryRebuild({resolveFixture,commitSelection,previewSelection,validateProjection,fullView,table,readRpc,policy,errorPrefix}) {
const code=suffix=>errorPrefix+'_'+suffix;
function parseArgs(args){
 const [event,mode,...extra]=args;
 if(!/^[1-9]\d*$/.test(event??'')||!Number.isSafeInteger(Number(event))||!['--dry-run','--apply'].includes(mode)||extra.length)throw new Error(code('USAGE'));
 return {eventId:Number(event),mode};
}

/** Compare a stable generation against a complete, validated history; no writes. */
async function verifyProjection(db,{fixture,now=Date.now()}){
 const options={fixture,now,ttlMs:policy.ttlMs};
 for(let attempt=0;attempt<3;attempt++){
  const first=await db.rpc(readRpc,{p_fixture_id:fixture.id});
  if(first.error)throw new Error(code('PROJECTION_UNAVAILABLE'));
  const initial=validateProjection(first.data,options);
  if(!initial.state)throw new Error(code('PROJECTION_UNINITIALIZED'));
  let rows;
  try{rows=await readHistory(()=>db.from(table).select('*',{count:'exact'}).eq('fixture_id',fixture.id).eq('provider',fixture.provider));}
  catch(error){if(error.message==='HISTORY_CHANGED')continue;throw error;}
  const full=fullView(rows,options);
  const last=await db.rpc(readRpc,{p_fixture_id:fixture.id});
  if(last.error)throw new Error(code('PROJECTION_UNAVAILABLE'));
  const final=validateProjection(last.data,options);
  if(final.generation!==initial.generation)continue;
  if(!final.state||rows.length!==initial.state.count||canonicalJson(initial.state)!==canonicalJson(final.state)||comparable(historySelectionView(initial.state,options))!==comparable(full))throw new Error(code('PROJECTION_MISMATCH'));
  return {verified:true,generation:initial.generation,observation_count:rows.length,status:full.status,updated_at:full.updatedAt,last_observed_at:full.lastObservedAt};
 }
 throw new Error(code('PROJECTION_RETRY_EXHAUSTED'));
}

/** Explicit single event rebuild, no observation INSERT and no provider access. */
async function rebuildProjection(db,{eventId,scope,mode,now=Date.now()}){
 if(!['--dry-run','--apply'].includes(mode)||!Number.isFinite(now))throw new Error(code('USAGE'));
 const fixture=await resolveFixture(db,{eventId,scope,now});
 const options={fixture,observation:null,now};
 if(mode==='--dry-run')return {mode,fixture_id:fixture.id,event_id:String(eventId),observation_writes:0,projection_writes:0,provider_requests:0,published:false,result:await previewSelection(db,options)};
 const result=await commitSelection(db,options);
 // Report a committed rebuild separately if the following read verification fails.
 let verification;
 try{verification=await verifyProjection(db,options);}
 catch{verification={verified:false,code:code('PROJECTION_VERIFICATION_FAILED')};}
 return {mode,fixture_id:fixture.id,event_id:String(eventId),observation_writes:0,projection_writes:result.replay?0:1,provider_requests:0,published:false,result,verification};
}

return {parseArgs,verifyProjection,rebuildProjection};
}
