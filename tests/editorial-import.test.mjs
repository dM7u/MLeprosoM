import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importEditorialXi} from '../src/server/editorial/import-xi.mjs';
import {evidence,fixture,now,id,revision} from './fixtures/editorial-revision.mjs';
const scope={provider:'bsd',externalTeamId:'away',competitionId:'league',seasonId:'season'};
const operation={id:id(1),previousId:null,action:'review',reason:null,reviewedAt:'2020-01-02T11:30:00Z',reviewer:'test'};
const args=()=>({evidence:evidence(),operation:{...operation},scope,mode:'--dry-run',now});
function database({missing=false,fixtureChange={},storedRows=[]}={}) {
  const rows=[...storedRows],writes=[],filters=[];
  const stored={...fixture,external_id:fixture.fixture_external_id,source_status:'notstarted',fetched_at:'2020-01-02T10:00:00Z',
    seasons:{external_id:'season',competitions:{external_id:'league'}},...fixtureChange};
  const teams=['home','away'].map(side=>({id:fixture[side+'_team_id'],external_id:fixture[side+'_external_id'],name:side}));
  return {rows,writes,filters,from(table){
    const eqs=[];let teamIds=null;
    return {
      select(){return this;},eq(key,value){eqs.push([key,value]);filters.push([table,key,value]);return this;},
      or(){return this;},order(){return this;},in(_key,values){teamIds=values;return this;},
      async maybeSingle(){
        if(table==='teams')return {data:teams.find(t=>t.external_id===scope.externalTeamId)};
        if(table==='editorial_xi_revisions')return missing?{error:{message:'private schema'}}:{data:rows.find(r=>r.id===eqs.find(([key])=>key==='id')?.[1])??null};
        assert.fail('Unexpected query');
      },
      limit(){assert.equal(table,'fixtures');return this;},
      then(resolve,reject){return Promise.resolve({data:table==='fixtures'?[stored]:teams.filter(t=>teamIds.includes(t.id))}).then(resolve,reject);},
      async insert(row){assert.equal(table,'editorial_xi_revisions');writes.push(row);rows.push(row);return {};},
    };
  },async rpc(name,parameters){
    assert.equal(name,'read_editorial_xi_heads');assert.deepEqual(parameters,{p_fixture_id:fixture.id,p_team_id:fixture.away_team_id});
    return missing?{error:{message:'private schema'}}:{data:rows.filter(r=>!rows.some(child=>child.previous_id===r.id))};
  }};
}

test('editorial importer resolves DB context and dry-run is read-only with scoped filters',async()=>{
  const db=database(),result=await importEditorialXi(db,args());
  assert.equal(result.fixture_id,fixture.id);assert.equal(result.team_id,fixture.away_team_id);
  assert.equal(result.storage_ready,true);assert.equal(result.writes,0);assert.equal(db.writes.length,0);
  assert.equal(result.observed_at,evidence().observed_at);assert.equal(result.provider_requests,0);assert.equal(result.published,false);
  assert.ok(db.filters.some(([table,key,value])=>table==='fixtures'&&key==='seasons.competitions.external_id'&&value==='league'));
});
test('editorial importer reports missing schema in dry-run and blocks apply before any write',async()=>{
  const db=database({missing:true});
  const result=await importEditorialXi(db,args());
  assert.equal(result.storage_ready,false);assert.ok(result.issues.includes('editorial_storage_unavailable'));
  assert.ok(!JSON.stringify(result).includes('private'));
  await assert.rejects(importEditorialXi(db,{...args(),mode:'--apply'}),/STORAGE_UNAVAILABLE/);
  assert.equal(db.writes.length,0);
});
test('editorial apply stores once and retry remains identical after kickoff changes',async()=>{
  const db=database(),a={...args(),mode:'--apply'};
  const first=await importEditorialXi(db,a);assert.equal(first.writes,1);
  const again=await importEditorialXi(db,a);assert.equal(again.replay,true);assert.equal(again.writes,0);
  assert.equal(db.writes.length,1);
  const changed=database({storedRows:db.rows,fixtureChange:{kickoff_at:'2020-01-04T20:00:00Z'}});
  const retry=await importEditorialXi(changed,a);assert.equal(retry.replay,true);assert.ok(retry.issues.includes('fixture_rescheduled'));
  await assert.rejects(importEditorialXi(db,{...a,operation:{...operation,reason:'changed'}}),/WRITE_CONFLICT/);
});
test('editorial correction requires current head, retraction must preserve predecessor evidence',async()=>{
  const first=revision(1),db=database({storedRows:[first]});
  await assert.rejects(importEditorialXi(db,{...args(),operation:{...operation,id:id(2)}}),/WRITE_CONFLICT/);
  const correction={...operation,id:id(2),previousId:id(1)};
  await importEditorialXi(db,{...args(),operation:correction,mode:'--apply'});
  await assert.rejects(importEditorialXi(db,{...args(),operation:{...correction,id:id(3)}}),/WRITE_CONFLICT/);
  const retract={...correction,id:id(4),previousId:id(2),action:'retract',reason:'withdrawn'};
  const altered=evidence();altered.starters.pop();
  await assert.rejects(importEditorialXi(db,{...args(),evidence:altered,operation:retract}),/INVALID_PREDECESSOR/);
  const rescheduled=database({storedRows:db.rows,fixtureChange:{kickoff_at:'2020-01-04T20:00:00Z'}});
  const result=await importEditorialXi(rescheduled,{...args(),operation:retract});
  assert.ok(result.issues.includes('retracted'));assert.equal(rescheduled.writes.length,0);
});
test('invalid operation and foreign scope fail before DB; identity changes cannot write',async()=>{
  for(const change of [a=>a.operation.id='bad',a=>a.operation.reviewedAt='invalid',a=>a.evidence.team_external_id='home',a=>a.mode='apply']){
    const a=args();change(a);await assert.rejects(importEditorialXi({from(){assert.fail('No DB');}},a),/^Error: EDITORIAL_XI_/);
  }
  for(const fixtureChange of [{kickoff_at:'2020-01-04T20:00:00Z'},{external_id:'other'},{seasons:{external_id:'other'}}]){
    const db=database({fixtureChange});await assert.rejects(importEditorialXi(db,{...args(),mode:'--apply'}));assert.equal(db.writes.length,0);
  }
});
test('unknown provider status does not become a publishable scheduled XI',async()=>{
  const result=await importEditorialXi(database({fixtureChange:{source_status:'unexpected'}}),args());
  assert.equal(result.assessment,'unavailable');assert.ok(result.issues.includes('fixture_not_upcoming'));
});
