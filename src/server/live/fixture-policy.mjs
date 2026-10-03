// Pure module: shared by a future worker and local tests. No provider requests.
const positive=value=>Number.isSafeInteger(value)&&value>0;
const score=value=>value===null||value===undefined?null:Number.isSafeInteger(value)&&value>=0?value:NaN;
const instant=value=>typeof value==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;

/** Only status/period pairs seen in BSD samples are promoted to domain phases. */
export function classifyBsdPhase(status,period){
  if(status==='notstarted'&&(period===''||period===null))return 'scheduled';
  if(status==='1st_half'&&period==='1T')return 'first_half';
  if(status==='finished')return 'finished';
  return 'unknown';
}

export function normalizeLiveFixture(body,{eventId,homeTeamId,awayTeamId,observedAt,now=Date.now()}){
  const observed=instant(observedAt),kickoff=instant(body?.event_date);
  if(![eventId,homeTeamId,awayTeamId].every(positive)||homeTeamId===awayTeamId||
     body?.id!==eventId||body?.home_team_id!==homeTeamId||body?.away_team_id!==awayTeamId)
    throw new Error('LIVE_FIXTURE_IDENTITY');
  if(!Number.isFinite(now)||!Number.isFinite(observed)||observed>now+5000||
     !Number.isFinite(kickoff)||typeof body.status!=='string'||!body.status.trim()||
     (body.period!==null&&typeof body.period!=='string'))
    throw new Error('LIVE_FIXTURE_SHAPE');
  const homeScore=score(body.home_score),awayScore=score(body.away_score);
  const minute=body.current_minute??null;
  if(Number.isNaN(homeScore)||Number.isNaN(awayScore)||
     (minute!==null&&(!Number.isSafeInteger(minute)||minute<0)))
    throw new Error('LIVE_FIXTURE_SHAPE');
  const phase=classifyBsdPhase(body.status,body.period);
  return {version:1,provider:'bsd',event_id:String(eventId),home_team_id:String(homeTeamId),
    away_team_id:String(awayTeamId),kickoff_at:body.event_date,observed_at:observedAt,
    source_status:body.status,source_period:body.period,phase,current_minute:minute,
    home_score:homeScore,away_score:awayScore,source_updated_at:null};
}

export function planNextLiveCycle({snapshot,now=Date.now(),unknownCount=0}){
  if(!snapshot||snapshot.provider!=='bsd'||!Number.isFinite(now))throw new Error('LIVE_POLICY_INPUT');
  const kickoff=instant(snapshot.kickoff_at);
  if(!Number.isFinite(kickoff))throw new Error('LIVE_POLICY_INPUT');
  const phase=snapshot.phase;
  if(phase==='finished')return {phase:'finalizing',resources:['fixture','lineups','incidents','statistics'],nextDueAt:null};
  if(phase==='scheduled'){
    if(now<kickoff-900000)return {phase:'scheduled',resources:[],nextDueAt:new Date(kickoff-900000).toISOString()};
    if(now<kickoff)return {phase:'scheduled',resources:[],nextDueAt:new Date(kickoff).toISOString()};
    if(now>=kickoff+1800000)return {phase:'stopped',resources:[],nextDueAt:null};
    return {phase:'waiting',resources:[],nextDueAt:new Date(now+150000).toISOString()};
  }
  if(phase==='first_half')return {phase,resources:['lineups','incidents','statistics'],nextDueAt:new Date(now+150000).toISOString()};
  if(phase==='unknown')return unknownCount>=3
    ?{phase:'stopped',resources:[],nextDueAt:null}
    :{phase:'unknown',resources:[],nextDueAt:new Date(now+300000).toISOString()};
  throw new Error('LIVE_POLICY_PHASE');
}
