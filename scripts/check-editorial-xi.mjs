import 'server-only';
import {readFileSync} from 'node:fs';
import {validateReviewedXi} from '../src/server/editorial/reviewed-xi.mjs';

try {
  const [evidencePath,fixturePath,mode,...extra]=process.argv.slice(2);
  if(!evidencePath||!fixturePath||mode!=='--dry-run'||extra.length)throw new Error('EDITORIAL_XI_USAGE');
  const policy=JSON.parse(readFileSync(new URL('../src/server/editorial/xi-policy.json',import.meta.url),'utf8'));
  const result=validateReviewedXi(JSON.parse(readFileSync(evidencePath,'utf8')),
    {fixture:JSON.parse(readFileSync(fixturePath,'utf8')),maxAgeMs:policy.maxAgeMs});
  console.log(JSON.stringify({mode,requests:0,writes:0,result}));
} catch(error) {
  console.error(JSON.stringify({code:/^EDITORIAL_XI_[A-Z_]+$/.test(error.message)?error.message:'EDITORIAL_XI_FAILED'}));
  process.exitCode=1;
}
