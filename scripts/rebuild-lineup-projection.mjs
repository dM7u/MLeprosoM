import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {parseLineupRebuildArgs,rebuildLineupProjection} from '../src/server/db/rebuild-lineup-projection.mjs';
try{
 const args=parseLineupRebuildArgs(process.argv.slice(2));
 const scope=JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-primary-scope.json',import.meta.url),'utf8'));
 const config=getSupabaseConfig();
 const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const report=await rebuildLineupProjection(db,{...args,scope});
 console.log(JSON.stringify(report));
 if(report.verification?.verified===false)process.exitCode=2;
}catch(error){
 console.error(JSON.stringify({code:/^LINEUPS_[A-Z_]+$/.test(error.message)?error.message:'LINEUPS_PROJECTION_REBUILD_FAILED'}));process.exitCode=1;
}
