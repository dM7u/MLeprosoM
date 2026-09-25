import 'server-only';
import {normalizeLineups} from '../providers/bsd/lineups.mjs';
import {canonicalJson} from '../standings/batch.mjs';

const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const numericId=value=>typeof value==='string'&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value));
export function createLineupObservation({id,fixture,body,observedAt,now=Date.now()}) {
  if(!uuid(id)||!fixture||!['id','home_team_id','away_team_id'].every(k=>uuid(fixture[k]))||
    fixture.provider!=='bsd'||fixture.home_team_id===fixture.away_team_id||
    !['external_id','home_external_id','away_external_id'].every(k=>numericId(fixture[k])))throw new Error('LINEUPS_INVALID_BINDING');
  const payload=normalizeLineups(body,{eventId:Number(fixture.external_id),homeTeamId:Number(fixture.home_external_id),
    awayTeamId:Number(fixture.away_external_id),fetchedAt:observedAt,now});
  return {id,fixture_id:fixture.id,provider:fixture.provider,external_id:fixture.external_id,
    home_team_id:fixture.home_team_id,away_team_id:fixture.away_team_id,
    home_external_id:fixture.home_external_id,away_external_id:fixture.away_external_id,
    observed_at:observedAt,status:payload.state,payload};
}

/** Re-normalize the persisted contract before any write; ignore no unknown payload fields. */
export function validateLineupObservation(row,{now=Date.now()}={}) {
  if(!row?.payload)throw new Error('LINEUPS_INVALID_PAYLOAD');
  const p=row.payload;
  const player=value=>({id:Number(value.external_id),name:value.name,position:value.position,jersey_number:value.jersey_number,captain:value.captain});
  const side=value=>({team_id:Number(value?.team_id),formation:value?.formation,
    players:value?.starters?.map(player),substitutes:value?.substitutes?.map(player)??null});
  const unavailable=row.status==='unavailable';
  const body={event_id:Number(row.external_id),lineup_status:unavailable?'predicted':'confirmed',beta:unavailable,
    updated_at:p.source_updated_at,lineups:unavailable?{home:{team_id:Number(row.home_external_id)},away:{team_id:Number(row.away_external_id)}}:
      {home:side(p.home),away:side(p.away)}};
  const clean=createLineupObservation({id:row.id,fixture:{...row,id:row.fixture_id},body,observedAt:row.observed_at,now});
  if(Date.parse(p.fetched_at)!==Date.parse(row.observed_at)||row.status!==clean.status||
    canonicalJson({...p,fetched_at:clean.payload.fetched_at})!==canonicalJson(clean.payload))throw new Error('LINEUPS_INVALID_PAYLOAD');
  return clean;
}

export async function storeLineupObservation(db,observation,{now=Date.now()}={}) {
  const row=validateLineupObservation(observation,{now});
  try {
    const {error}=await db.from('lineup_observations').insert(row);
    if(!error)return {id:row.id,stored:true,replay:false};
    if(error.code!=='23505')throw new Error();
    const {data,error:readError}=await db.from('lineup_observations').select('*').eq('id',row.id).single();
    if(readError||!data)throw new Error();
    const same=Object.entries(row).every(([k,v])=>k==='observed_at'?Date.parse(data[k])===Date.parse(v):canonicalJson(data[k])===canonicalJson(v));
    if(!same)throw new Error('LINEUPS_IDEMPOTENCY_CONFLICT');
    return {id:row.id,stored:false,replay:true};
  }catch(error){throw new Error(error.message==='LINEUPS_IDEMPOTENCY_CONFLICT'?error.message:'LINEUPS_STORAGE_FAILED');}
}
