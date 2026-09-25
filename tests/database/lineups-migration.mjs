import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createLineupObservation,storeLineupObservation} from '../../src/server/db/lineup-observations.mjs';
const db=new PGlite();
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const time='2020-01-01T00:00:00.000Z';sample.body.updated_at=time;
const row=createLineupObservation({id:'10000000-0000-4000-8000-000000000001',fixture,body:sample.body,observedAt:time});
const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
const keys=Object.keys(row);
const insert=value=>db.query(`insert into lineup_observations (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>k==='payload'?JSON.stringify(value[k]):value[k]));
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of ['20260917000100_initial_football.sql','20260925000100_team_statistics.sql','20260925000200_lineup_observations.sql'])
    await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  for(const side of ['home','away'])await query("insert into teams(id,provider,external_id,name,fetched_at) values ($1,'bsd',$2,'Test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],time]);
  const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values ('bsd','test','Test',$1) returning id",[time]))[0].id;
  const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values ('bsd','test',$1,'Test',$2) returning id",[competition,time]))[0].id;
  await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values ($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,time]);
  assert.equal((await query("select relrowsecurity from pg_class where relname='lineup_observations'"))[0].relrowsecurity,true);
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);await assert.rejects(query('select * from lineup_observations'));await assert.rejects(insert(row));await db.exec('reset role');
  }
  await db.exec('set role service_role');
  const client={from(){return {async insert(value){try{await insert(value);return {};}catch(error){return {error};}},select(){return {eq(_key,id){return {async single(){const data=(await query('select * from lineup_observations where id=$1',[id]))[0];return {data:{...data,observed_at:data.observed_at.toISOString()}};}};}};}};}};
  assert.equal((await storeLineupObservation(client,row)).stored,true);
  assert.equal((await storeLineupObservation(client,row)).replay,true);
  const bad={...row,id:'10000000-0000-4000-8000-000000000002',observed_at:'2020-01-02T00:00:00Z',payload:{...row.payload,fetched_at:'2020-01-02T00:00:00Z'}};
  await assert.rejects(insert({...bad,home_external_id:'999',payload:{...bad.payload,home:{...bad.payload.home,team_id:'999'}}}));
  await assert.rejects(insert({...bad,fixture_id:fixture.home_team_id}));
  await assert.rejects(insert({...bad,payload:{}}));
  await assert.rejects(query('update lineup_observations set status=\'unavailable\''));
  await assert.rejects(query('delete from lineup_observations'));
  const excluded=createLineupObservation({id:bad.id,fixture,body:{...sample.body,lineup_status:'predicted'},observedAt:bad.observed_at});
  await insert(excluded);
  assert.equal((await query('select count(*)::int n from lineup_observations'))[0].n,2);
  assert.equal((await query('select status from lineup_observations where id=$1',[row.id]))[0].status,'complete');
  console.log('PASS: lineup SQL RLS, roles, fixture/team external identity FKs, immutable observations, retry, prediction audit');
}finally{await db.close();}
