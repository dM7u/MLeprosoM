import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createIncidentObservation,storeIncidentObservation,incidentSnapshotView} from '../../src/server/db/incident-observations.mjs';
const db=new PGlite(),time='2020-01-01T00:00:00.000Z';
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003'};
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8'));
const row=createIncidentObservation({id:'10000000-0000-4000-8000-000000000001',fixture,body:sample.body,observedAt:time});
const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
const keys=Object.keys(row);
const insert=value=>db.query(`insert into incident_observations (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>k==='payload'&&value[k]!==null?JSON.stringify(value[k]):value[k]));
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of ['20260917000100_initial_football.sql','20260925000100_team_statistics.sql','20260925000300_incident_observations.sql'])await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  for(const [i,id] of [fixture.home_team_id,fixture.away_team_id].entries())await query("insert into teams(id,provider,external_id,name,fetched_at) values ($1,'bsd',$2,'Test',$3)",[id,String(i),time]);
  const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values ('bsd','test','Test',$1) returning id",[time]))[0].id;
  const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values ('bsd','test',$1,'Test',$2) returning id",[competition,time]))[0].id;
  await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values ($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,time]);
  assert.equal((await query("select relrowsecurity from pg_class where relname='incident_observations'"))[0].relrowsecurity,true);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(query('select * from incident_observations'));await assert.rejects(insert(row));await db.exec('reset role');}
  await db.exec('set role service_role');
  const client={from(){return {async insert(value){try{await insert(value);return {};}catch(error){return {error};}},select(){return {eq(_key,id){return {async single(){const data=(await query('select * from incident_observations where id=$1',[id]))[0];return {data:{...data,observed_at:data.observed_at.toISOString()}};}};}};}};}};
  assert.equal((await storeIncidentObservation(client,row)).stored,true);assert.equal((await storeIncidentObservation(client,row)).replay,true);
  const second=createIncidentObservation({id:'10000000-0000-4000-8000-000000000002',fixture,body:{...sample.body,incidents:sample.body.incidents.filter(r=>r.type!=='goal')},observedAt:'2020-01-02T00:00:00.000Z'});
  await assert.rejects(insert({...second,home_team_id:fixture.away_team_id}));
  await assert.rejects(insert({...second,external_id:'other'}));
  await assert.rejects(insert({...second,payload:{}}));
  await assert.rejects(query('update incident_observations set payload=null'));await assert.rejects(query('delete from incident_observations'));
  await insert(second);
  const rows=(await query('select * from incident_observations')).map(r=>({...r,observed_at:r.observed_at.toISOString()}));
  const view=incidentSnapshotView(rows,{fixture,ttlMs:60000,now:Date.parse('2020-01-02T00:00:01Z')});
  assert.equal(view.data.incidents.length,21);assert.equal(rows[0].payload.incidents.length,22);
  console.log('PASS: incident SQL RLS, private roles, fixture binding, immutable observations, retries and whole-list correction');
}finally{await db.close();}
