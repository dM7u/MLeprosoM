import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storeGoalFixtures} from '../src/server/db/store-goal-fixtures.mjs';
const scope={teamId:'a',leagueId:'cup',season:'2026'};
const row={home:{external_id:'a',name:'A'},away:{external_id:'b',name:'B'},fixture:{provider:'goal-api',external_id:'match',competition_external_id:'cup',season:'2026',source_round:'Final',home_score:1,away_score:1,home_penalty_score:4,away_penalty_score:3}};
function storage(){
 const fixtures=new Map();let writes=0;
 const db={from(table){return {upsert(payload,options){
  writes++;
  let data;
  if(table==='competitions'||table==='seasons')data={id:table};
  if(table==='teams')data=payload.map(x=>({id:'uuid-'+x.external_id,external_id:x.external_id}));
  if(table==='fixtures'){
   assert.equal(options.onConflict,'provider,external_id');
   for(const item of payload)fixtures.set(item.provider+':'+item.external_id,item);
  }
  const chain={select(){return chain;},single(){return chain;},then(ok,fail){return Promise.resolve({data,error:null}).then(ok,fail);}};return chain;
 }}}};return {db,fixtures,writes:()=>writes};
}
test('cup persistence is idempotent and preserves score breakdown plus text round',async()=>{
 const s=storage();
 for(let i=0;i<2;i++)await storeGoalFixtures(s.db,[row],scope,{id:'cup',name:'Cup'},'2026-09-18T00:00:00Z');
 assert.equal(s.fixtures.size,1);const stored=[...s.fixtures.values()][0];
 assert.equal(stored.home_score,1);assert.equal(stored.home_penalty_score,4);assert.equal(stored.source_round,null);assert.equal(stored.source_round_label,'Final');
 assert.equal(stored.season_id,'seasons');assert.equal(stored.home_team_id,'uuid-a');assert.ok(!('competition_external_id' in stored));assert.ok(!('season' in stored));
});
test('cup persistence rejects foreign scope and empty snapshots before writing',async()=>{
 const s=storage();
 await assert.rejects(storeGoalFixtures(s.db,[{...row,fixture:{...row.fixture,season:'2025'}}],scope,{id:'cup',name:'Cup'},'now'),/GOAL_SCOPE_MISMATCH/);
 await assert.rejects(storeGoalFixtures(s.db,[],scope,{id:'cup',name:'Cup'},'now'),/GOAL_EMPTY_SAMPLE/);
 assert.equal(s.writes(),0);
});
