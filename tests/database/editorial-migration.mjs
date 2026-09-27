import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {revision,options,id,evidence} from '../fixtures/editorial-revision.mjs';
import {storeEditorialRevision,readEditorialXi} from '../../src/server/editorial/revisions.mjs';
const db=new PGlite();
const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
const insert=row=>{
  const keys=Object.keys(row);
  return query(`insert into editorial_xi_revisions (${keys.join(',')}) values (${keys.map((_,n)=>'$'+(n+1)).join(',')})`,keys.map(key=>key==='evidence'?JSON.stringify(row[key]):row[key]));
};
const client={from(table){
  assert.equal(table,'editorial_xi_revisions');
  return {
    async insert(row){try{await insert(row);return {};}catch(error){return {error};}},
    select(){return {eq(key,value){
      assert.equal(key,'id');
      return {async maybeSingle(){return {data:(await query('select * from editorial_xi_revisions where id=$1',[value]))[0]??null};}};
    }};},
  };
},
  async rpc(name,args){assert.equal(name,'read_editorial_xi_heads');return {data:(await query('select read_editorial_xi_heads($1,$2) value',[args.p_fixture_id,args.p_team_id]))[0].value};}
};
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  const f=options.fixture;
  for(const side of ['home','away'])await query("insert into teams(id,provider,external_id,name,fetched_at) values ($1,'bsd',$2,'Test','2020-01-01')",[f[side+'_team_id'],f[side+'_external_id']]);
  const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values ('bsd','league','Test','2020-01-01') returning id"))[0].id;
  const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values ('bsd','season',$1,'Test','2020-01-01') returning id",[competition]))[0].id;
  await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,kickoff_at,source_status,fetched_at) values ($1,'bsd','event',$2,$3,$4,$5,'notstarted','2020-01-01')",[f.id,season,f.home_team_id,f.away_team_id,f.kickoff_at]);
  const row=revision(1);
  for(const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    await assert.rejects(insert(row));await assert.rejects(query('select * from editorial_xi_revisions'));
    await assert.rejects(client.rpc('read_editorial_xi_heads',{p_fixture_id:f.id,p_team_id:options.teamId}));
    await db.exec('reset role');
  }
  assert.equal((await query("select relrowsecurity from pg_class where relname='editorial_xi_revisions'"))[0].relrowsecurity,true);
  await db.exec('set role service_role');
  assert.equal((await storeEditorialRevision(client,row,options)).stored,true);
  assert.equal((await storeEditorialRevision(client,row,options)).replay,true);
  await assert.rejects(storeEditorialRevision(client,revision(1,{reason:'changed'}),options),/WRITE_CONFLICT/);
  await assert.rejects(insert(revision(2))); // second root forbidden
  const second=revision(2,{previousId:row.id});await storeEditorialRevision(client,second,options);
  // Competing successor submissions: unique predecessor enforces exactly one winner.
  const competing=await Promise.allSettled([insert(revision(3,{previousId:second.id})),insert(revision(4,{previousId:second.id}))]);
  assert.equal(competing.filter(result=>result.status==='fulfilled').length,1);
  const winner=competing[0].status==='fulfilled'?id(3):id(4);
  assert.equal((await readEditorialXi(client,options)).status,'available');
  const partial=evidence();partial.starters.pop();
  await storeEditorialRevision(client,revision(5,{previousId:winner,evidence:partial}),options);
  assert.equal((await readEditorialXi(client,options)).data,null);
  await storeEditorialRevision(client,revision(6,{previousId:id(5),evidence:partial,action:'retract',reason:'Retracted'}),options);
  await db.exec('begin read only');
  assert.deepEqual((await readEditorialXi(client,options)).issues,['retracted']);
  await db.exec('rollback');
  await assert.rejects(query('update editorial_xi_revisions set reason=null'));
  await assert.rejects(query('delete from editorial_xi_revisions'));
  await assert.rejects(query('truncate editorial_xi_revisions'));
  const other=evidence();other.source.url='https://www.lacapital.com.ar/ovacion/other.html';
  await assert.rejects(insert(revision(7,{previousId:id(6),evidence:other}))); // cross-key link
  await assert.rejects(insert({...revision(8,{evidence:other}),team_id:f.id})); // foreign team
  const forged=revision(8,{evidence:other});forged.evidence.binding.competition_external_id='wrong';
  await assert.rejects(insert(forged));
  assert.equal((await query('select count(*)::int n from editorial_xi_revisions'))[0].n,5);
  // After a reschedule: retry still succeeds; a retraction preserves old facts.
  await query('update fixtures set kickoff_at=$1 where id=$2',['2020-01-04T20:00:00Z',f.id]);
  const rescheduled={...options,fixture:{...f,kickoff_at:'2020-01-04T20:00:00Z'}};
  assert.equal((await storeEditorialRevision(client,row,rescheduled)).replay,true);
  await storeEditorialRevision(client,revision(9,{...rescheduled,previousId:id(6),evidence:partial,action:'retract',reason:'Still withdrawn'}),rescheduled);
  await assert.rejects(insert(revision(10,{previousId:id(9),action:'retract',reason:'Forged evidence'})));
  await assert.rejects(insert(revision(11,{previousId:id(9)}))); // old kickoff on new review
  // More than 100 source heads returns null, never an apparently complete prefix.
  for(let n=20;n<120;n++) {
    const e=evidence();e.binding.kickoff_at=rescheduled.fixture.kickoff_at;
    e.source.url=`https://www.lacapital.com.ar/ovacion/test-${n}.html`;
    await insert(revision(n,{...rescheduled,evidence:e}));
  }
  assert.equal((await client.rpc('read_editorial_xi_heads',{p_fixture_id:f.id,p_team_id:options.teamId})).data,null);
  console.log('PASS: editorial SQL roles/RLS, binding, idempotency, competing successors, retract/partial heads, snapshot RPC and immutable history');
}finally{await db.close();}
