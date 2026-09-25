import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createStatisticsObservation,storeStatisticsObservation,statisticsView} from '../../src/server/db/team-statistics.mjs';

const db=new PGlite();
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003'};
const sample=JSON.parse(readFileSync('docs/research/bsd-team-stats-223728-20260924.json','utf8'));
// Historical time ensures SQL clock constraints do not depend on the test runner date.
const time='2020-01-01T00:00:00.000Z';
const row=createStatisticsObservation({id:'10000000-0000-4000-8000-000000000001',fixture,body:sample.body,observedAt:time});
const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
const keys=Object.keys(row);
const insert=value=>db.query(`insert into team_statistics_observations (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,
  keys.map(k=>k==='payload'&&value[k]!==null?JSON.stringify(value[k]):value[k]));
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync('supabase/migrations/20260917000100_initial_football.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260925000100_team_statistics.sql','utf8'));
  for(const id of [fixture.home_team_id,fixture.away_team_id]) await query(
    "insert into teams(id,provider,external_id,name,fetched_at) values ($1::uuid,'bsd',$1::text,'Test team',$2)",[id,time]);
  const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values ('bsd','test','Test',$1) returning id",[time]))[0].id;
  const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values ('bsd','test',$1,'Test',$2) returning id",[competition,time]))[0].id;
  await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values ($1,'bsd',$2,$3,$4,$5,'finished',$6)",
    [fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,time]);
  assert.equal((await query("select relrowsecurity from pg_class where relname='team_statistics_observations'"))[0].relrowsecurity,true);
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(query('select * from team_statistics_observations'));
    await assert.rejects(insert(row));await db.exec('reset role');
  }
  await db.exec('set role service_role');
  const client={from(table){assert.equal(table,'team_statistics_observations');return {
    async insert(value){try{await insert(value);return {};}catch(error){return {error};}},
    select(){return {eq(key,id){assert.equal(key,'id');return {async single(){const data=(await query('select * from team_statistics_observations where id=$1',[id]))[0];
      return {data:{...data,observed_at:data.observed_at.toISOString()}};}};}};}};}};
  assert.equal((await storeStatisticsObservation(client,row)).stored,true);
  assert.equal((await storeStatisticsObservation(client,row)).replay,true);
  const bad={...row,id:'10000000-0000-4000-8000-000000000002',observed_at:'2020-01-02T00:00:00Z',
    payload:{...row.payload,fetched_at:'2020-01-02T00:00:00Z'}};
  await assert.rejects(insert({...bad,home_team_id:fixture.away_team_id}));
  await assert.rejects(insert({...bad,external_id:'other'}));
  await assert.rejects(insert({...bad,payload:{}}));
  await assert.rejects(insert({...bad,status:'failed'}));
  await assert.rejects(insert({...row,id:bad.id})); // same observation instant
  await assert.rejects(query('update team_statistics_observations set payload=null'));
  await assert.rejects(query('delete from team_statistics_observations'));
  await insert({...bad,status:'failed',payload:null});
  const saved=(await query('select * from team_statistics_observations')).map(x=>({...x,observed_at:x.observed_at.toISOString()}));
  const view=statisticsView(saved,{fixture,ttlMs:60000,now:Date.parse('2020-01-02T00:00:01Z')});
  assert.equal(view.status,'stale');assert.equal(view.updatedAt,time);assert.equal(view.data.away.red_cards,0);
  await assert.rejects(query("update fixtures set external_id='changed' where id=$1",[fixture.id]));
  console.log('PASS: statistics SQL migration, RLS/roles, immutable atomic observations, binding FK, retry, collision and last-known-good');
} finally {await db.close();}
