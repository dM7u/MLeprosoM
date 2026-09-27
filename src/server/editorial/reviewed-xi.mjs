import 'server-only';

const text = value => typeof value === 'string' && value.trim().length > 0;
const instant = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
const bindingKeys = ['provider','fixture_external_id','competition_external_id','season_external_id','home_external_id','away_external_id','kickoff_at'];

/** Validates a manually reviewed transcription. Does not fetch, persist or publish. */
export function validateReviewedXi(evidence, {fixture, now = Date.now(), maxAgeMs = null} = {}) {
  if (!Number.isFinite(now) || (maxAgeMs !== null && (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0))) throw new Error('EDITORIAL_XI_INVALID_POLICY');
  if (!fixture || !bindingKeys.every(key=>text(fixture[key])) || !Number.isFinite(instant(fixture.kickoff_at)) ||
    !['scheduled','started','finished','unavailable'].includes(fixture.state) || fixture.home_external_id===fixture.away_external_id) throw new Error('EDITORIAL_XI_INVALID_FIXTURE');
  if (evidence?.version!==1 || !evidence.binding || bindingKeys.some(key=>key==='kickoff_at'
    ? instant(evidence.binding[key])!==instant(fixture[key]) : evidence.binding[key]!==fixture[key]) ||
    ![fixture.home_external_id,fixture.away_external_id].includes(evidence.team_external_id)) throw new Error('EDITORIAL_XI_IDENTITY_MISMATCH');
  const source=evidence.source;
  let url;
  try {url=new URL(source?.url);} catch {throw new Error('EDITORIAL_XI_INVALID_SOURCE');}
  if (source.type!=='journalistic' || source.outlet!=='La Capital' || url.protocol!=='https:' ||
    url.hostname!=='www.lacapital.com.ar' || url.port || url.username || url.password || url.search || url.hash ||
    !/^\/ovacion\/[^/]+\.html$/.test(url.pathname) || !text(source.published_text) ||
    (source.author!==null&&!text(source.author))) throw new Error('EDITORIAL_XI_INVALID_SOURCE');
  const observed=instant(evidence.observed_at), reviewed=instant(evidence.review?.reviewed_at);
  const published=source.published_at===null?null:instant(source.published_at);
  if (![observed,reviewed].every(Number.isFinite) || observed>reviewed || reviewed>now ||
    (published!==null&&(!Number.isFinite(published)||published>observed))) throw new Error('EDITORIAL_XI_INVALID_TIME');
  if (!text(evidence.review?.reviewer) || evidence.review.identity_confirmed!==true ||
    !['reviewed','conflict'].includes(evidence.review.status) || typeof evidence.ambiguous!=='boolean' ||
    !['probable','confirmed_by_outlet'].includes(evidence.claim)) throw new Error('EDITORIAL_XI_REVIEW_REQUIRED');
  if (!Array.isArray(evidence.starters) || evidence.starters.length>11 || !evidence.starters.every(text)) throw new Error('EDITORIAL_XI_INVALID_PLAYERS');
  const names=evidence.starters.map(name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es'));
  if (new Set(names).size!==names.length) throw new Error('EDITORIAL_XI_DUPLICATE_PLAYER');
  const issues=[];
  if (evidence.starters.length!==11) issues.push('partial_xi');
  if (evidence.ambiguous) issues.push('ambiguous_xi');
  if (evidence.review.status==='conflict') issues.push('unresolved_conflict');
  if (fixture.state!=='scheduled'||now>=instant(fixture.kickoff_at)) issues.push('fixture_not_upcoming');
  if (maxAgeMs===null) issues.push('age_policy_pending');
  if (published===null) issues.push('publication_time_unknown');
  else if (maxAgeMs!==null&&now-published>=maxAgeMs) issues.push('publication_expired');
  return {version:1,source:{type:'journalistic',outlet:source.outlet,url:url.href,author:source.author,
    published_text:source.published_text,published_at:source.published_at},
    binding:Object.fromEntries(bindingKeys.map(key=>[key,evidence.binding[key]])),team_external_id:evidence.team_external_id,
    observed_at:evidence.observed_at,review:{reviewer:evidence.review.reviewer,reviewed_at:evidence.review.reviewed_at,status:evidence.review.status,identity_confirmed:true},
    claim:evidence.claim,starters:[...evidence.starters],ambiguous:evidence.ambiguous,
    deduplication_key:JSON.stringify([url.href,fixture.provider,fixture.fixture_external_id,evidence.team_external_id]),
    assessment:issues.length?'unavailable':'eligible_for_future_publication',issues};
}
