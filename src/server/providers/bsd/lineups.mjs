import 'server-only';

const positiveId=value=>Number.isSafeInteger(value)&&value>0;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const time=value=>typeof value==='string'&&/T.*(Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;

/** Confirmed by provider, not an independent official verification. */
export function normalizeLineups(body,{eventId,homeTeamId,awayTeamId,fetchedAt,now=Date.now()}) {
  if(![eventId,homeTeamId,awayTeamId].every(positiveId)||homeTeamId===awayTeamId||body?.event_id!==eventId)
    throw new Error('BSD_LINEUPS_IDENTITY_MISMATCH');
  if(!Number.isFinite(now)||!Number.isFinite(time(fetchedAt))||time(fetchedAt)>now)throw new Error('BSD_LINEUPS_INVALID_TIME');
  if(!object(body.lineups)||body.lineups.home?.team_id!==homeTeamId||body.lineups.away?.team_id!==awayTeamId)
    throw new Error('BSD_LINEUPS_IDENTITY_MISMATCH');
  const base={version:1,provider:'bsd',event_id:String(eventId),fetched_at:fetchedAt};
  // Never promote AI/beta or an unrecognized status to a confirmed lineup.
  if(body.lineup_status==='predicted'||body.beta===true)return {...base,state:'unavailable',reason:'prediction_excluded',home:null,away:null};
  if(body.lineup_status!=='confirmed'||body.beta!==false)throw new Error('BSD_LINEUPS_UNSUPPORTED_STATUS');
  const updated=body.updated_at??null;
  if(updated!==null&&(!Number.isFinite(time(updated))||time(updated)>time(fetchedAt)))throw new Error('BSD_LINEUPS_INVALID_TIME');
  const seen=new Set();
  const normalizePlayer=player=>{
    if(!object(player)||!positiveId(player.id)||!text(player.name)||seen.has(player.id))throw new Error('BSD_LINEUPS_INVALID_PLAYER');
    seen.add(player.id);
    const position=player.position??null,jersey=player.jersey_number??null,captain=player.captain??null;
    if((position!==null&&!text(position))||(jersey!==null&&(!Number.isSafeInteger(jersey)||jersey<0))||
      (captain!==null&&typeof captain!=='boolean'))throw new Error('BSD_LINEUPS_INVALID_PLAYER');
    return {external_id:String(player.id),name:player.name,position,jersey_number:jersey,captain};
  };
  const side=value=>{
    if(!object(value)||!Array.isArray(value.players)||value.players.length>11||
      (value.substitutes!=null&&!Array.isArray(value.substitutes))||
      (value.formation!=null&&!text(value.formation)))throw new Error('BSD_LINEUPS_INVALID_SHAPE');
    return {team_id:String(value.team_id),formation:value.formation??null,
      starters:value.players.map(normalizePlayer),substitutes:value.substitutes==null?null:value.substitutes.map(normalizePlayer)};
  };
  const home=side(body.lineups.home),away=side(body.lineups.away);
  return {...base,source_updated_at:updated,confirmation:'provider',
    state:[home,away].every(s=>s.starters.length===11&&s.substitutes!==null)?'complete':'partial',home,away};
}
