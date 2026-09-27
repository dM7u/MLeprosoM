import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editorialXiView,readEditorialXi,storeEditorialRevision} from '../src/server/editorial/revisions.mjs';
import {revision,evidence,options,id} from './fixtures/editorial-revision.mjs';

test('editorial revisions persist only facts and expose periodistic attribution with original publication',()=>{
  const row=revision(1),view=editorialXiView([row],options);
  assert.equal(row.evidence.assessment,undefined);assert.equal(row.evidence.issues,undefined);
  assert.equal(view.status,'available');assert.equal(view.data.origin,'journalistic');
  assert.equal(view.data.sources[0].published_at,evidence().source.published_at);
  assert.equal(view.data.sources[0].claim,'probable');
});
test('retract and partial heads cannot resurrect an older XI; conflicts across sources block',()=>{
  const withdrawn=revision(2,{previousId:id(1),action:'retract',reason:'Correction'});
  assert.equal(editorialXiView([withdrawn],options).data,null);
  const partial=evidence();partial.starters.pop();
  assert.ok(editorialXiView([revision(2,{previousId:id(1),evidence:partial})],options).issues.includes('partial_xi'));
  const other=evidence();other.source.url='https://www.lacapital.com.ar/ovacion/other.html';other.starters[0]='Different player';
  assert.deepEqual(editorialXiView([revision(1),revision(3,{evidence:other})],options).issues,['conflicting_sources']);
  other.review.status='conflict';
  assert.deepEqual(editorialXiView([revision(1),revision(3,{evidence:other})],options).issues,['unresolved_conflict']);
});
test('multiple equivalent sources preserve attribution without treating order as tactical formation',()=>{
  const other=evidence();other.source.url='https://www.lacapital.com.ar/ovacion/other.html';other.starters.reverse();
  const view=editorialXiView([revision(1),revision(3,{evidence:other})],options);
  assert.equal(view.status,'available');assert.equal(view.data.sources.length,2);assert.equal(view.data.formation,undefined);
});
test('read time enforces exact 48h, unknown dates, reprogramming and started fixture',()=>{
  const old=evidence();old.source.published_at=new Date(options.now-48*3600000).toISOString();
  assert.ok(editorialXiView([revision(1,{evidence:old})],options).issues.includes('publication_expired'));
  old.source.published_at=null;
  assert.ok(editorialXiView([revision(1,{evidence:old})],options).issues.includes('publication_time_unknown'));
  assert.ok(editorialXiView([revision(1)],{...options,fixture:{...options.fixture,kickoff_at:'2020-01-04T20:00:00Z'}}).issues.includes('fixture_rescheduled'));
  assert.equal(editorialXiView([revision(1)],{...options,fixture:{...options.fixture,state:'started'}}).data,null);
});
test('editorial heads reject corruption, duplicate roots and unbounded/truncated storage',()=>{
  const row=revision(1);
  const corrupt=structuredClone(row);corrupt.evidence.starters[0]='Forged';
  assert.throws(()=>editorialXiView([corrupt],options),/CORRUPT/);
  assert.throws(()=>editorialXiView([row,row],options),/AMBIGUOUS/);
  assert.throws(()=>editorialXiView(null,options),/HEADS/);
  assert.throws(()=>editorialXiView(Array(101).fill(row),options),/HEADS/);
});
test('editorial reader uses only scoped snapshot RPC and sanitizes failures',async()=>{
  const result=await readEditorialXi({rpc:async(name,args)=>{
    assert.equal(name,'read_editorial_xi_heads');assert.deepEqual(args,{p_fixture_id:options.fixture.id,p_team_id:options.teamId});return {data:[revision(1)]};
  }},options);
  assert.equal(result.status,'available');
  for(const response of [{error:{message:'private'}},{data:null}]) {
    const failed=await readEditorialXi({rpc:async()=>response},options);
    assert.equal(failed.status,'error');assert.ok(!JSON.stringify(failed).includes('private'));
  }
  await assert.rejects(storeEditorialRevision({from(){throw new Error('private');}},revision(1),options),/^Error: EDITORIAL_XI_STORAGE_FAILED$/);
});

test('editorial revision operations reject unbound teams, root retracts and invalid chronology',()=>{
  assert.throws(()=>revision(1,{action:'retract',reason:'reason'}),/INVALID_REVISION/);
  assert.throws(()=>revision(1,{previousId:id(1)}),/INVALID_REVISION/);
  assert.throws(()=>revision(1,{teamId:options.fixture.home_team_id}),/REVISION_MISMATCH/);
  assert.throws(()=>revision(1,{reviewedAt:'2020-01-02T11:00:00Z'}),/REVISION_MISMATCH/);
  assert.throws(()=>revision(1,{reviewedAt:'2020-01-02T13:00:00Z'}),/INVALID_REVISION/);
  assert.equal(editorialXiView([],options).status,'unavailable');
});
