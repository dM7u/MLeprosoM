import 'server-only';

const types=new Set(['period','substitution','injuryTime','card','goal']);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optionalText=v=>{
  if(v==null)return null;
  if(typeof v!=='string'||!v.trim())throw new Error('BSD_INCIDENTS_INVALID_VALUE');
  return v;
};
const number=v=>{
  if(v==null)return null;
  if(!Number.isSafeInteger(v)||v<0)throw new Error('BSD_INCIDENTS_INVALID_VALUE');
  return v;
};
const player=(name,id)=>{
  if(id!=null&&(!Number.isSafeInteger(id)||id<=0))throw new Error('BSD_INCIDENTS_INVALID_PLAYER');
  return {name:optionalText(name),external_id:id==null?null:String(id)};
};

/** Atomic ordered snapshot: source indexes are not persistent incident identities. */
export function normalizeIncidents(body,{eventId,fetchedAt,now=Date.now()}) {
  if(!Number.isSafeInteger(eventId)||eventId<=0||body?.event_id!==eventId)throw new Error('BSD_INCIDENTS_IDENTITY_MISMATCH');
  if(typeof fetchedAt!=='string'||!/T.*(Z|[+-]\d{2}:\d{2})$/.test(fetchedAt)||!Number.isFinite(Date.parse(fetchedAt))||
    !Number.isFinite(now)||Date.parse(fetchedAt)>now)throw new Error('BSD_INCIDENTS_INVALID_TIME');
  if(!Array.isArray(body.incidents))throw new Error('BSD_INCIDENTS_INVALID_SHAPE');
  const incidents=body.incidents.map((row,index)=>{
    if(!object(row)||typeof row.type!=='string'||!row.type.trim())throw new Error('BSD_INCIDENTS_INVALID_SHAPE');
    if(row.is_home!=null&&typeof row.is_home!=='boolean')throw new Error('BSD_INCIDENTS_INVALID_VALUE');
    const known=types.has(row.type);
    const result={source_index:index,type:known?row.type:'unknown',source_type:row.type,
      minute:number(row.minute),added_time:number(row.added_time),side:row.is_home==null?null:row.is_home?'home':'away'};
    if(row.type==='goal'||row.type==='card')Object.assign(result,{player:player(row.player,row.player_id),
      subtype:optionalText(row.type==='goal'?row.goal_type:row.card_type)});
    if(row.type==='substitution')Object.assign(result,{player_in:player(row.player_in,row.player_in_id),player_out:player(row.player_out,row.player_out_id)});
    if(row.type==='period')Object.assign(result,{period:optionalText(row.text)});
    if(row.type==='injuryTime')Object.assign(result,{length:number(row.length)});
    if(row.type==='period'||row.type==='goal')Object.assign(result,{home_score:number(row.home_score),away_score:number(row.away_score)});
    const incomplete=!known||result.minute===null||
      (['goal','card','substitution'].includes(row.type)&&result.side===null)||
      (result.player&&(result.player.name===null||result.player.external_id===null||result.subtype===null))||
      (row.type==='substitution'&&[result.player_in,result.player_out].some(p=>p.name===null||p.external_id===null))||
      (row.type==='period'&&result.period===null)||(row.type==='injuryTime'&&result.length===null);
    return {...result,partial:Boolean(incomplete)};
  });
  return {version:1,provider:'bsd',event_id:String(eventId),fetched_at:fetchedAt,
    state:!incidents.length?'empty':incidents.some(row=>row.partial)?'partial':'available',
    order:'provider',coverage:'unverified',incidents};
}
