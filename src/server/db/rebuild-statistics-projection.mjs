import 'server-only';
import {resolveStatisticsFixture} from './statistics-fixture.mjs';
import {commitStatisticsSelection,previewStatisticsSelection,validateStatisticsProjection} from './statistics-projection.mjs';
import {readHistory} from './read-history.mjs';
import {statisticsView} from './team-statistics.mjs';
import {historySelectionView} from './history-selection.mjs';
import {canonicalJson} from '../standings/batch.mjs';
import policy from './statistics-policy.json' with {type:'json'};
const instant=value=>value===null?null:new Date(value).toISOString();
const comparable=view=>canonicalJson({...view,updatedAt:instant(view.updatedAt),lastObservedAt:instant(view.lastObservedAt),data:view.data?{...view.data,fetched_at:instant(view.data.fetched_at)}:null});

export function parseStatisticsRebuildArgs(args){
 const [event,mode,...extra]=args;
 if(!/^[1-9]\d*$/.test(event??'')||!Number.isSafeInteger(Number(event))||!['--dry-run','--apply'].includes(mode)||extra.length)throw new Error('STATS_USAGE');
 return {eventId:Number(event),mode};
}

/** Compare a stable generation against a complete, validated history; no writes. */
export async function verifyStatisticsProjection(db,{fixture,now=Date.now()}){
 const options={fixture,now,ttlMs:policy.ttlMs};
 for(let attempt=0;attempt<3;attempt++){
  const first=await db.rpc('read_statistics_projection',{p_fixture_id:fixture.id});
  if(first.error)throw new Error('STATS_PROJECTION_UNAVAILABLE');
  const initial=validateStatisticsProjection(first.data,options);
  if(!initial.state)throw new Error('STATS_PROJECTION_UNINITIALIZED');
  let rows;
  try{rows=await readHistory(()=>db.from('team_statistics_observations').select('*',{count:'exact'}).eq('fixture_id',fixture.id).eq('provider',fixture.provider));}
  catch(error){if(error.message==='HISTORY_CHANGED')continue;throw error;}
  const full=statisticsView(rows,options);
  const last=await db.rpc('read_statistics_projection',{p_fixture_id:fixture.id});
  if(last.error)throw new Error('STATS_PROJECTION_UNAVAILABLE');
  const final=validateStatisticsProjection(last.data,options);
  if(final.generation!==initial.generation)continue;
  if(!final.state||rows.length!==initial.state.count||canonicalJson(initial.state)!==canonicalJson(final.state)||comparable(historySelectionView(initial.state,options))!==comparable(full))throw new Error('STATS_PROJECTION_MISMATCH');
  return {verified:true,generation:initial.generation,observation_count:rows.length,status:full.status,updated_at:full.updatedAt,last_observed_at:full.lastObservedAt};
 }
 throw new Error('STATS_PROJECTION_RETRY_EXHAUSTED');
}

/** Explicit single event rebuild, no observation INSERT and no provider access. */
export async function rebuildStatisticsProjection(db,{eventId,scope,mode,now=Date.now()}){
 if(!['--dry-run','--apply'].includes(mode)||!Number.isFinite(now))throw new Error('STATS_USAGE');
 const fixture=await resolveStatisticsFixture(db,{eventId,scope});
 const options={fixture,observation:null,now};
 if(mode==='--dry-run')return {mode,fixture_id:fixture.id,event_id:String(eventId),observation_writes:0,projection_writes:0,provider_requests:0,published:false,result:await previewStatisticsSelection(db,options)};
 const result=await commitStatisticsSelection(db,options);
 // Report a committed rebuild separately if the following read verification fails.
 let verification;
 try{verification=await verifyStatisticsProjection(db,options);}
 catch{verification={verified:false,code:'STATS_PROJECTION_VERIFICATION_FAILED'};}
 return {mode,fixture_id:fixture.id,event_id:String(eventId),observation_writes:0,projection_writes:result.replay?0:1,provider_requests:0,published:false,result,verification};
}
