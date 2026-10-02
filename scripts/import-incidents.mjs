import 'server-only';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/server/env.ts';
import {importIncidents,parseIncidentImportArgs} from '../src/server/db/import-incidents.mjs';
try{
  const {path,id,mode,storage}=parseIncidentImportArgs(process.argv.slice(2));
  const sample=JSON.parse(readFileSync(path,'utf8'));
  const scope=JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-primary-scope.json',import.meta.url),'utf8'));
  const config=getSupabaseConfig();
  const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  console.log(JSON.stringify(await importIncidents(db,{sample,id,mode,storage,scope})));
}catch(error){console.error(JSON.stringify({code:/^(INCIDENTS|BSD_INCIDENTS)_[A-Z_]+$/.test(error.message)?error.message:'INCIDENTS_IMPORT_FAILED'}));process.exitCode=1;}
