import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/server/env.ts';
import { bsdGet, normalizeFixtures } from '../src/server/providers/bsd/fixtures.mjs';

// Explicit IDs from reviewed provider discovery; no automatic scheduler or public route.
const [leagueArg, seasonArg, teamArg, mode] = process.argv.slice(2);
const [leagueId, seasonId, teamId] = [leagueArg, seasonArg, teamArg].map(Number);
let db, runId, requests = 0;
try {
  if (![leagueId, seasonId, teamId].every(x => Number.isSafeInteger(x) && x > 0) || !['--dry-run','--apply'].includes(mode)) throw new Error('USAGE: leagueId seasonId teamId --dry-run|--apply');
  const key = process.env.BSD_API_KEY;
  const checked = async query => {const {data,error}=await query;if(error)throw new Error('SUPABASE_WRITE_FAILED');return data;};
  if (mode === '--apply') {
    const config = getSupabaseConfig();
    db = createClient(config.url, config.secretKey, { auth: {persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} });
    const run = await checked(db.from('sync_runs').insert({provider:'bsd',operation:'team-fixtures',status:'running',request_count:0}).select('id').single());
    runId=run.id;
  }
  const get = path => bsdGet(path, key, fetch, {onAttempt:()=>{requests++;}});
  const fetchedAt = new Date().toISOString();
  const league = await get(`leagues/${leagueId}/`);
  const seasons = await get(`leagues/${leagueId}/seasons/`);
  const season = seasons.seasons?.find(x => x.id === seasonId);
  if (league.id !== leagueId || !season || typeof league.name !== 'string' || typeof season.name !== 'string') throw new Error('BSD_METADATA_MISMATCH');
  const body = await get(`events/?league_id=${leagueId}&season_id=${seasonId}&team_id=${teamId}&limit=100`);
  if (body.results?.some(x=>x.league_id!==leagueId)) throw new Error('BSD_LEAGUE_MISMATCH');
  const normalized = normalizeFixtures(body, seasonId, teamId, fetchedAt);
  if (!normalized.length) throw new Error('BSD_EMPTY_SAMPLE');
  if (mode === '--dry-run') {
    console.log(JSON.stringify({mode, requests, fixtures: normalized.length}));
  } else {
    const common={provider:'bsd',fetched_at:fetchedAt,source_updated_at:null};
    const competition=await checked(db.from('competitions').upsert({...common,external_id:String(leagueId),name:league.name,country:league.country??null},{onConflict:'provider,external_id'}).select('id').single());
    const storedSeason=await checked(db.from('seasons').upsert({...common,competition_id:competition.id,external_id:String(seasonId),name:season.name,year:season.year??null},{onConflict:'provider,competition_id,external_id'}).select('id').single());
    const teams=[...new Map(normalized.flatMap(x=>[x.home,x.away]).map(x=>[x.external_id,{...common,...x}])).values()];
    const storedTeams=await checked(db.from('teams').upsert(teams,{onConflict:'provider,external_id'}).select('id,external_id'));
    const ids=new Map(storedTeams.map(x=>[x.external_id,x.id]));
    await checked(db.from('fixtures').upsert(normalized.map(x=>({...x.fixture,season_id:storedSeason.id,home_team_id:ids.get(x.home.external_id),away_team_id:ids.get(x.away.external_id)})),{onConflict:'provider,external_id'}));
    await checked(db.from('sync_runs').update({status:'succeeded',request_count:requests,finished_at:new Date().toISOString()}).eq('id',runId));
    console.log(JSON.stringify({mode,requests,fixtures:normalized.length,teams:teams.length,status:'succeeded'}));
  }
} catch(error) {
  const code = /^(BSD_[A-Z_0-9]+|SUPABASE_WRITE_FAILED)$/.test(error.message) ? error.message : 'SYNC_FAILED';
  if(db&&runId) {
    try {
      const {error:logError}=await db.from('sync_runs').update({status:'failed',request_count:requests,finished_at:new Date().toISOString(),error_code:code}).eq('id',runId);
      if(logError) console.error('SYNC_LOG_FAILED');
    } catch { console.error('SYNC_LOG_FAILED'); }
  }
  console.error(JSON.stringify({code,requests,retryAfterMs:error.retryAfterMs??null}));process.exitCode=1;
}
