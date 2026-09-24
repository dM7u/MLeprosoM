import 'server-only';

export const teamStatisticFields = ['ball_possession','total_shots','shots_on_target','corner_kicks','fouls','offsides','passes','accurate_passes','pass_accuracy_pct','yellow_cards','red_cards'];
const percentages = new Set(['ball_possession','pass_accuracy_pct']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Full-match team statistics only. No inferred zeros, ratings, xG or period merging. */
export function normalizeTeamStatistics(body, {eventId, fetchedAt, now = Date.now()}) {
  if (!Number.isSafeInteger(eventId) || eventId <= 0 || body?.event_id !== eventId) throw new Error('BSD_STATS_IDENTITY_MISMATCH');
  if (typeof fetchedAt !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(fetchedAt) || !Number.isFinite(Date.parse(fetchedAt)) || !Number.isFinite(now) || Date.parse(fetchedAt)>now) throw new Error('BSD_STATS_INVALID_TIME');
  if (!object(body.stats)) throw new Error('BSD_STATS_INVALID_SHAPE');
  const normalizeSide = side => {
    if (side === undefined || side === null) return Object.fromEntries(teamStatisticFields.map(k=>[k,null]));
    if (!object(side)) throw new Error('BSD_STATS_INVALID_SHAPE');
    return Object.fromEntries(teamStatisticFields.map(key=>{
      const value=side[key];
      if(value===undefined||value===null)return [key,null];
      if(typeof value!=='number'||!Number.isFinite(value)||value<0||
        (percentages.has(key)?value>100:!Number.isSafeInteger(value))) throw new Error('BSD_STATS_INVALID_VALUE');
      return [key,value];
    }));
  };
  const home=normalizeSide(body.stats.home), away=normalizeSide(body.stats.away);
  const values=[...Object.values(home),...Object.values(away)];
  return {version:1,provider:'bsd',event_id:String(eventId),period:'full_match',fetched_at:fetchedAt,
    state:values.every(v=>v===null)?'empty':values.some(v=>v===null)?'partial':'complete',home,away};
}
