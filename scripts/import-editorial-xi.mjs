import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {importEditorialXi} from '../src/server/editorial/import-xi.mjs';

try {
  const [evidencePath,operationPath,mode,...extra]=process.argv.slice(2);
  if(!evidencePath||!operationPath||!['--dry-run','--apply'].includes(mode)||extra.length)throw new Error('EDITORIAL_XI_USAGE');
  const evidence=JSON.parse(readFileSync(evidencePath,'utf8'));
  const operation=JSON.parse(readFileSync(operationPath,'utf8'));
  const scope=JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-primary-scope.json',import.meta.url),'utf8'));
  const config=getSupabaseConfig();
  const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const result=await importEditorialXi(db,{evidence,operation,scope,mode});
  console.log(JSON.stringify(result));
  if(!result.storage_ready)process.exitCode=2;
}catch(error){
  console.error(JSON.stringify({code:/^EDITORIAL_XI_[A-Z_]+$/.test(error.message)?error.message:'EDITORIAL_XI_IMPORT_FAILED'}));
  process.exitCode=1;
}
