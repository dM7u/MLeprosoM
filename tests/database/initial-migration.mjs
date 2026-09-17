import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(readFileSync('supabase/migrations/20260917000100_initial_football.sql','utf8'));
const q=async(s)=> (await db.query(s)).rows;
assert.equal((await q("select count(*)::int n from pg_class where relname in ('teams','competitions','seasons','fixtures','sync_runs') and relrowsecurity"))[0].n,5);
await db.exec("insert into teams(provider,external_id,name,fetched_at) values ('test','1','A',now()),('test','2','B',now()); insert into competitions(provider,external_id,name,fetched_at) values ('test','1','League',now()); insert into seasons(provider,external_id,competition_id,name,fetched_at) select 'test','1',id,'Season',now() from competitions;");
const insert="insert into fixtures(provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) select 'test','1',s.id,a.id,b.id,'notstarted',now() from seasons s,teams a,teams b where a.external_id='1' and b.external_id='2'";
await db.exec(insert);
assert.equal((await q('select home_score from fixtures'))[0].home_score,null);
await assert.rejects(db.exec(insert));
await assert.rejects(db.exec('update fixtures set home_score=-1'));
await assert.rejects(db.exec('update fixtures set away_team_id=home_team_id'));
await assert.rejects(db.exec("update fixtures set provider='other'"));
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from fixtures'));await db.exec('reset role');}
await db.exec('set role service_role');assert.equal((await q('select * from fixtures')).length,1);
await db.close();console.log('PASS: migration, RLS, roles, null scores, uniqueness, same-team and cross-provider constraints');

