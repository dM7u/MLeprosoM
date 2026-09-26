import 'server-only';
import {readHistory} from './read-history.mjs';
import {normalizeIncidents} from '../providers/bsd/incidents.mjs';
import {canonicalJson} from '../standings/batch.mjs';
import {dataState} from '../data-state.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const keys=['provider','external_id','home_team_id','away_team_id'];

export function createIncidentObservation({id,fixture,body,observedAt,failed=false,now=Date.now()}) {
  if(!uuid(id)||!fixture||!['id','home_team_id','away_team_id'].every(k=>uuid(fixture[k]))||fixture.provider!=='bsd'||
    fixture.home_team_id===fixture.away_team_id||typeof fixture.external_id!=='string'||!/^[1-9]\d*$/.test(fixture.external_id)||
    !Number.isSafeInteger(Number(fixture.external_id))||typeof failed!=='boolean'||(failed&&body!==undefined))throw new Error('INCIDENTS_INVALID_BINDING');
  const payload=normalizeIncidents(failed?{event_id:Number(fixture.external_id),incidents:[]}:body,
    {eventId:Number(fixture.external_id),fetchedAt:observedAt,now});
  return {id,fixture_id:fixture.id,...Object.fromEntries(keys.map(k=>[k,fixture[k]])),observed_at:observedAt,
    status:failed?'failed':payload.state,payload:failed?null:payload};
}

export function validateIncidentObservation(row,{now=Date.now()}={}) {
  if(!row||(!row.payload&&row.status!=='failed'))throw new Error('INCIDENTS_INVALID_PAYLOAD');
  const failed=row.status==='failed';
  const p=row.payload;
  // Reconstitute only documented source fields; compare the entire normalized payload.
  const incidents=failed?undefined:p.incidents?.map(r=>({type:r.source_type,minute:r.minute,added_time:r.added_time,
    is_home:r.side===null?null:r.side==='home'?true:r.side==='away'?false:'invalid',
    player:r.player?.name,player_id:r.player?.external_id==null?null:Number(r.player.external_id),
    player_in:r.player_in?.name,player_in_id:r.player_in?.external_id==null?null:Number(r.player_in.external_id),
    player_out:r.player_out?.name,player_out_id:r.player_out?.external_id==null?null:Number(r.player_out.external_id),
    card_type:r.subtype,goal_type:r.subtype,text:r.period,length:r.length,home_score:r.home_score,away_score:r.away_score}));
  const clean=createIncidentObservation({id:row.id,fixture:{...row,id:row.fixture_id},observedAt:row.observed_at,failed,
    body:failed?undefined:{event_id:Number(row.external_id),incidents},now});
  if(row.status!==clean.status||(failed?p!==null:Date.parse(p.fetched_at)!==Date.parse(row.observed_at)||
    canonicalJson({...p,fetched_at:clean.payload.fetched_at})!==canonicalJson(clean.payload)))throw new Error('INCIDENTS_INVALID_PAYLOAD');
  return clean;
}

export async function storeIncidentObservation(db,observation,{now=Date.now()}={}) {
  const row=validateIncidentObservation(observation,{now});
  try{
    const {error}=await db.from('incident_observations').insert(row);
    if(!error)return {id:row.id,stored:true,replay:false};
    if(error.code!=='23505')throw new Error();
    const {data,error:readError}=await db.from('incident_observations').select('*').eq('id',row.id).single();
    if(readError||!data)throw new Error();
    if(!Object.entries(row).every(([k,v])=>k==='observed_at'?Date.parse(data[k])===Date.parse(v):canonicalJson(data[k])===canonicalJson(v)))throw new Error('INCIDENTS_IDEMPOTENCY_CONFLICT');
    return {id:row.id,stored:false,replay:true};
  }catch(error){throw new Error(error.message==='INCIDENTS_IDEMPOTENCY_CONFLICT'?error.message:'INCIDENTS_STORAGE_FAILED');}
}

export function incidentSnapshotView(rows,{fixture,ttlMs,now=Date.now()}) {
  dataState({data:null,ttlMs,now});
  if(!Array.isArray(rows))throw new Error('INCIDENTS_HISTORY_LIMIT');
  const ordered=rows.map(row=>{
    if(row.fixture_id!==fixture.id||keys.some(k=>row[k]!==fixture[k]))throw new Error('INCIDENTS_IDENTITY_MISMATCH');
    return validateIncidentObservation(row,{now});
  }).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
  let chosen=null,last=null;
  for(const row of ordered){
    if(last&&Date.parse(last.observed_at)===Date.parse(row.observed_at))throw new Error('INCIDENTS_AMBIGUOUS_TIME');
    last=row;
    if(row.status==='available'||row.status==='partial')chosen=row;
  }
  return {...dataState({data:chosen?.payload??null,fetchedAt:chosen?.observed_at,ttlMs,now,
    partial:chosen?.status==='partial',refreshFailed:Boolean(last&&(chosen?chosen!==last:last.status==='failed'))}),
    lastObservedAt:last?.observed_at??null,lastObservationStatus:last?.status??null};
}

export async function readIncidents(db,options) {
  dataState({data:null,ttlMs:options.ttlMs,now:options.now});
  try{
    const data = await readHistory(() => db.from('incident_observations').select('*', {count:'exact'})
      .eq('fixture_id',options.fixture.id).eq('provider',options.fixture.provider));
    return incidentSnapshotView(data,options);
  }catch{return {...dataState({data:null,ttlMs:options.ttlMs,now:options.now,refreshFailed:true}),lastObservedAt:null,lastObservationStatus:null};}
}
