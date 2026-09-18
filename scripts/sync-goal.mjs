import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {createTeamResolver} from '../src/server/identity/team-identity.mjs';
import {requestGoal,readGoalTeamFixtures} from '../src/server/providers/goal-api/fixtures.mjs';
import {storeGoalFixtures} from '../src/server/db/store-goal-fixtures.mjs';
const read = path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
let db, runId, requests=0;
try {
  const mode=process.argv[2];
  if(process.argv.length!==3 || !['--dry-run','--apply'].includes(mode))throw new Error('GOAL_INVALID_MODE');
  const scope=read('../src/server/providers/goal-api/reviewed-scope.json');
  const resolve=createTeamResolver(read('../src/server/identity/reviewed-teams.json'));
  if(resolve('goal-api',scope.teamId).canonicalId!==scope.canonicalTeamId)throw new Error('GOAL_UNREVIEWED_TEAM');
  if(!process.env.GOAL_API_KEY?.trim())throw new Error('GOAL_KEY_MISSING');
  if(mode==='--apply'){
    const config=getSupabaseConfig();
    db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {error}=await db.from('fixtures').select('source_round_label,home_fulltime_score,away_fulltime_score,home_extra_score,away_extra_score,home_penalty_score,away_penalty_score').limit(0);
    if(error)throw new Error('GOAL_SCHEMA_NOT_READY');
    const run=await db.from('sync_runs').insert({provider:'goal-api',operation:'cup-fixtures',status:'running',request_count:0}).select('id').single();
    if(run.error)throw new Error('GOAL_STORAGE_FAILED');runId=run.data.id;
  }
  const get=path=>{requests++;return requestGoal(path,process.env.GOAL_API_KEY);};
  const league=await get(`leagues/${encodeURIComponent(scope.leagueId)}`);
  if(league.data?.id!==scope.leagueId || typeof league.data?.name!=='string' || !league.data.name.trim())throw new Error('GOAL_METADATA_MISMATCH');
  const fetchedAt=new Date().toISOString();
  const result=await readGoalTeamFixtures(get,scope,fetchedAt);
  if(!result.fixtures.length)throw new Error('GOAL_EMPTY_SAMPLE');
  if(mode==='--apply'){
    await storeGoalFixtures(db,result.fixtures,scope,league.data,fetchedAt);
    const {error}=await db.from('sync_runs').update({status:'succeeded',request_count:requests,finished_at:new Date().toISOString()}).eq('id',runId);
    if(error)throw new Error('GOAL_STORAGE_FAILED');
  }
  console.log(JSON.stringify({mode,requests,scanned:result.scanned,excluded:result.excluded,fixtures:result.fixtures.length,status:'succeeded'}));
}catch(error){
  const code=/^GOAL_[A-Z_0-9]+$/.test(error?.message??'')?error.message:'GOAL_SYNC_FAILED';
  if(db&&runId){try{const {error:logError}=await db.from('sync_runs').update({status:'failed',request_count:requests,finished_at:new Date().toISOString(),error_code:code}).eq('id',runId);if(logError)console.error('GOAL_LOG_FAILED');}catch{console.error('GOAL_LOG_FAILED');}}
  console.error(JSON.stringify({error:code,requests}));process.exitCode=1;
}
