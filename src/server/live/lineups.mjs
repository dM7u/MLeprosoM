// Live-only v2 shape. A player without provider ID is renderable but not linkable.
const positive=value=>Number.isSafeInteger(value)&&value>0;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const instant=value=>typeof value==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;

export function normalizeLiveLineups(body,{eventId,homeTeamId,awayTeamId,observedAt,now=Date.now()}){
  const observed=instant(observedAt),updated=body?.updated_at??null;
  if(![eventId,homeTeamId,awayTeamId].every(positive)||homeTeamId===awayTeamId||
     body?.event_id!==eventId||!Number.isFinite(now)||!Number.isFinite(observed)||
     observed>now+5000||
     (updated!==null&&(!Number.isFinite(instant(updated))||instant(updated)>observed)))
    throw new Error('LIVE_LINEUPS_IDENTITY');
  const base={version:2,provider:'bsd',event_id:String(eventId),
    observed_at:observedAt,source_updated_at:updated};
  if(body.lineup_status==='predicted'||body.beta===true)
    return {...base,state:'unavailable',reason:'prediction_excluded',home:null,away:null,issues:[]};
  if(body.lineup_status==='unavailable'&&body.beta===false&&body.lineups===null)
    return {...base,state:'unavailable',reason:'source_unavailable',home:null,away:null,issues:[]};
  if(body.lineup_status!=='confirmed'||body.beta!==false||!object(body.lineups)||
     body.lineups.home?.team_id!==homeTeamId||body.lineups.away?.team_id!==awayTeamId)
    throw new Error('LIVE_LINEUPS_SHAPE');
  const seen=new Set(),issues=[];
  const side=(value,sideName)=>{
    if(!object(value)||!Array.isArray(value.players)||value.players.length>11||
       (value.substitutes!==null&&!Array.isArray(value.substitutes))||
       (value.formation!==null&&!text(value.formation)))
      throw new Error('LIVE_LINEUPS_SHAPE');
    const group=(players,groupName)=>players?.map((player,index)=>{
      if(!object(player)||!Object.hasOwn(player,'id')||!text(player.name))
        throw new Error('LIVE_LINEUPS_PLAYER');
      if(player.id!==null&&(!positive(player.id)||seen.has(player.id)))
        throw new Error('LIVE_LINEUPS_PLAYER');
      if(player.id!==null)seen.add(player.id);
      const position=player.position??null,number=player.jersey_number??null,captain=player.captain??null;
      if((position!==null&&!text(position))||
         (number!==null&&(!Number.isSafeInteger(number)||number<0))||
         (captain!==null&&typeof captain!=='boolean'))
        throw new Error('LIVE_LINEUPS_PLAYER');
      if(player.id===null)issues.push({type:'missing_external_id',side:sideName,group:groupName,source_index:index});
      return {external_id:player.id===null?null:String(player.id),source_index:index,
        name:player.name.trim(),position,jersey_number:number,captain};
    })??null;
    return {team_id:String(value.team_id),formation:value.formation,
      starters:group(value.players,'starters'),substitutes:group(value.substitutes,'substitutes')};
  };
  const home=side(body.lineups.home,'home'),away=side(body.lineups.away,'away');
  const complete=issues.length===0&&[home,away].every(x=>x.starters.length===11&&x.substitutes!==null);
  return {...base,state:complete?'complete':'partial',confirmation:'provider',home,away,issues};
}
