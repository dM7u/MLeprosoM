import 'server-only';
import {readHistory} from './read-history.mjs';
import {normalizeTeamStatistics, teamStatisticFields} from '../providers/bsd/team-statistics.mjs';
import {canonicalJson} from '../standings/batch.mjs';
import {dataState} from '../data-state.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const bindingKeys = ['provider', 'external_id', 'home_team_id', 'away_team_id'];
function validateFixture(fixture) {
  if (!fixture || !uuid(fixture.id) || fixture.provider !== 'bsd' ||
      !/^[1-9]\d*$/.test(fixture.external_id ?? '') || !Number.isSafeInteger(Number(fixture.external_id)) ||
      !uuid(fixture.home_team_id) || !uuid(fixture.away_team_id) || fixture.home_team_id === fixture.away_team_id)
    throw new Error('STATS_INVALID_FIXTURE');
}

/** A reviewed/stored fixture is required: the stats response has no team IDs. */
export function createStatisticsObservation({id, fixture, body, observedAt, failed = false, now = Date.now()}) {
  validateFixture(fixture);
  if (!uuid(id) || typeof failed !== 'boolean' || (failed && body !== undefined)) throw new Error('STATS_INVALID_OBSERVATION');
  // Also validate observation time for failed attempts, without fabricating metrics.
  const normalized = normalizeTeamStatistics(failed ? {event_id:Number(fixture.external_id),stats:{}} : body,
    {eventId:Number(fixture.external_id), fetchedAt:observedAt, now});
  return {id, fixture_id:fixture.id, ...Object.fromEntries(bindingKeys.map(k=>[k,fixture[k]])),
    observed_at:normalized.fetched_at, status:failed?'failed':normalized.state, payload:failed?null:normalized};
}

function validateObservation(row, fixture, now) {
  if (!row || row.fixture_id !== fixture.id || bindingKeys.some(k=>row[k] !== fixture[k])) throw new Error('STATS_IDENTITY_MISMATCH');
  const failed = row.status === 'failed';
  const clean = createStatisticsObservation({id:row.id,fixture,observedAt:row.observed_at,failed,now,
    body:failed?undefined:{event_id:Number(row.external_id),stats:{home:row.payload?.home,away:row.payload?.away}}});
  // Canonical payload excludes unknown fields and rejects forged state/version/timestamps.
  const comparable = failed ? row.payload : {...row.payload,fetched_at:clean.payload.fetched_at};
  if (row.status !== clean.status || (!failed && Date.parse(row.payload?.fetched_at) !== Date.parse(row.observed_at)) ||
      canonicalJson(comparable) !== canonicalJson(clean.payload)) throw new Error('STATS_INVALID_PAYLOAD');
  return clean;
}

/** Append-only atomic observation; an identical ID is a retry, never an overwrite. */
export async function storeStatisticsObservation(db, observation, {now = Date.now()} = {}) {
  const fixture = {id:observation?.fixture_id,...Object.fromEntries(bindingKeys.map(k=>[k,observation?.[k]]))};
  const row = validateObservation(observation, fixture, now);
  try {
    const {error} = await db.from('team_statistics_observations').insert(row);
    if (!error) return {id:row.id,stored:true,replay:false};
    if (error.code !== '23505') throw new Error();
    const {data,error:readError} = await db.from('team_statistics_observations').select('*').eq('id',row.id).single();
    if (readError || !data) throw new Error();
    const same = Object.entries(row).every(([key,value])=>key === 'observed_at'
      ? Date.parse(data[key]) === Date.parse(value) : canonicalJson(data[key]) === canonicalJson(value));
    if (!same) throw new Error('STATS_IDEMPOTENCY_CONFLICT');
    return {id:row.id,stored:false,replay:true};
  } catch(error) {
    throw new Error(error.message === 'STATS_IDEMPOTENCY_CONFLICT' ? error.message : 'STATS_STORAGE_FAILED');
  }
}

/** Never merges observations: replace only if every previously known metric survives. */
export function statisticsView(rows, {fixture, ttlMs, now = Date.now()}) {
  validateFixture(fixture);
  dataState({data:null,ttlMs,now});
  if (!Array.isArray(rows)) throw new Error('STATS_HISTORY_LIMIT');
  const ordered = rows.map(row=>validateObservation(row,fixture,now))
    .sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
  let chosen = null, last = null;
  for (const row of ordered) {
    if (last && Date.parse(last.observed_at) === Date.parse(row.observed_at)) throw new Error('STATS_AMBIGUOUS_OBSERVATION');
    last = row;
    if (!row.payload || row.status === 'empty') continue;
    if (!chosen || ['home','away'].every(side=>teamStatisticFields.every(key=>
      chosen.payload[side][key] === null || row.payload[side][key] !== null))) chosen = row;
  }
  const view = dataState({data:chosen?.payload ?? null,fetchedAt:chosen?.observed_at,ttlMs,now,
    partial:chosen?.status === 'partial',refreshFailed:Boolean(last && (chosen ? chosen !== last : last.status === 'failed'))});
  return {...view,lastObservedAt:last?.observed_at ?? null,lastObservationStatus:last?.status ?? null};
}

/** Scoped backend read. Count-checked pagination of immutable observations. */
export async function readStatistics(db, options) {
  validateFixture(options.fixture);
  dataState({data:null,ttlMs:options.ttlMs,now:options.now});
  try {
    const data = await readHistory(() => db.from('team_statistics_observations').select('*', {count:'exact'})
      .eq('fixture_id',options.fixture.id).eq('provider',options.fixture.provider));
    return statisticsView(data,options);
  } catch {
    return {...dataState({data:null,ttlMs:options.ttlMs,now:options.now,refreshFailed:true}),
      lastObservedAt:null,lastObservationStatus:null};
  }
}
