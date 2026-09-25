import 'server-only';
import {readFileSync} from 'node:fs';
import {normalizeIncidents} from '../src/server/providers/bsd/incidents.mjs';
try{
  const [path,id,mode,...extra]=process.argv.slice(2);
  if(!path||!/^[1-9]\d*$/.test(id??'')||mode!=='--dry-run'||extra.length)throw new Error('BSD_INCIDENTS_USAGE');
  const sample=JSON.parse(readFileSync(path,'utf8'));
  const data=normalizeIncidents(sample?.body,{eventId:Number(id),fetchedAt:sample?.fetched_at});
  console.log(JSON.stringify({mode,requests:0,writes:0,data}));
}catch(error){console.error(JSON.stringify({code:/^BSD_INCIDENTS_[A-Z_]+$/.test(error.message)?error.message:'BSD_INCIDENTS_FAILED'}));process.exitCode=1;}
