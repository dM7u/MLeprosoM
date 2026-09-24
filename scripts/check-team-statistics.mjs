import 'server-only';
import {readFileSync} from 'node:fs';
import {requestBsd} from '../src/server/providers/bsd/request.mjs';
import {normalizeTeamStatistics} from '../src/server/providers/bsd/team-statistics.mjs';

let requests=0;
try {
  const [id,mode,flag,path,...extra]=process.argv.slice(2);
  const eventId=Number(id);
  if(!/^\d+$/.test(id??'')||!Number.isSafeInteger(eventId)||eventId<=0||mode!=='--dry-run'||extra.length||
    (flag!==undefined&&(flag!=='--sample-file'||!path)))throw new Error('BSD_STATS_USAGE');
  const sample=path?JSON.parse(readFileSync(path,'utf8')):null;
  if(path&&(!sample||typeof sample.fetched_at!=='string'||!sample.body))throw new Error('BSD_STATS_INVALID_SAMPLE');
  const fetchedAt=path?sample.fetched_at:new Date().toISOString();
  const body=path?sample.body:await requestBsd(`events/${eventId}/stats/`,process.env.BSD_API_KEY,fetch,{onAttempt:()=>requests++});
  const data=normalizeTeamStatistics(body,{eventId,fetchedAt});
  console.log(JSON.stringify({mode,replay:Boolean(path),requests,data}));
} catch(error) {
  console.error(JSON.stringify({code:/^BSD_[A-Z_0-9]+$/.test(error.message)?error.message:'BSD_STATS_FAILED',requests}));process.exitCode=1;
}
