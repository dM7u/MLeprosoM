import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {importTeamStatistics} from '../src/server/db/import-team-statistics.mjs';

try {
  const [path,id,mode,...extra]=process.argv.slice(2);
  if(!path||!id||!['--dry-run','--apply'].includes(mode)||extra.length)throw new Error('STATS_USAGE');
  const sample=JSON.parse(readFileSync(path,'utf8'));
  const scope=JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-primary-scope.json',import.meta.url),'utf8'));
  const config=getSupabaseConfig();
  const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  console.log(JSON.stringify(await importTeamStatistics(db,{sample,id,mode,scope})));
}catch(error){
  const code=/^(STATS_[A-Z_]+|BSD_STATS_[A-Z_]+)$/.test(error.message)?error.message:'STATS_IMPORT_FAILED';
  console.error(JSON.stringify({code}));process.exitCode=1;
}
