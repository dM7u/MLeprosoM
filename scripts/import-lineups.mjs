import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {importLineups} from '../src/server/db/import-lineups.mjs';
try {
  const [path,id,mode,...extra]=process.argv.slice(2);
  if(!path||!id||!['--dry-run','--apply'].includes(mode)||extra.length)throw new Error('LINEUPS_USAGE');
  const sample=JSON.parse(readFileSync(path,'utf8'));
  const scope=JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-primary-scope.json',import.meta.url),'utf8'));
  const config=getSupabaseConfig();
  const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  console.log(JSON.stringify(await importLineups(db,{sample,id,mode,scope})));
}catch(error){console.error(JSON.stringify({code:/^(LINEUPS|BSD_LINEUPS)_[A-Z_]+$/.test(error.message)?error.message:'LINEUPS_IMPORT_FAILED'}));process.exitCode=1;}
