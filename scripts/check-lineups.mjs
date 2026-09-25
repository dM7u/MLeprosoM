import 'server-only';
import {readFileSync} from 'node:fs';
import {normalizeLineups} from '../src/server/providers/bsd/lineups.mjs';

try {
  const [path,event,home,away,mode,...extra]=process.argv.slice(2);
  if(!path||mode!=='--dry-run'||extra.length||![event,home,away].every(v=>/^[1-9]\d*$/.test(v??'')))throw new Error('BSD_LINEUPS_USAGE');
  const sample=JSON.parse(readFileSync(path,'utf8'));
  const data=normalizeLineups(sample?.body,{eventId:Number(event),homeTeamId:Number(home),awayTeamId:Number(away),fetchedAt:sample?.fetched_at});
  console.log(JSON.stringify({mode,requests:0,writes:0,data}));
}catch(error){
  console.error(JSON.stringify({code:/^BSD_LINEUPS_[A-Z_]+$/.test(error.message)?error.message:'BSD_LINEUPS_FAILED'}));process.exitCode=1;
}
