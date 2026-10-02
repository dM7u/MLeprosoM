import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import labels from '../src/server/identity/reviewed-league-labels.json' with {type:'json'};
import crests from '../src/app/team-crests.json' with {type:'json'};

test('every reviewed league team has a local crest mapped to its provider ID',()=>{
  for(const team of labels.teams){
    const path=crests[`bsd:${team.id}`]?.path;
    assert.ok(path,team.id);
    assert.ok(existsSync(`public${path}`),path);
  }
  assert.equal(crests['bsd:792'].path,'/crests/sinaliento.png');
  assert.equal(crests['bsd:785'].path,'/crests/lanus.png');
  assert.equal(crests['bsd:796'].path,'/crests/platense.png');
  assert.equal(crests['goal-api:cmr7sjrx97uhirx06ll1213tl'].path,'/crests/nob.png');
  assert.equal(crests['goal-api:cmr7sjx3s7wxprx0606kopdf3'].path,'/crests/acasuso.png');
  assert.ok(readFileSync('public/crests/nob.png').length>0);
});
