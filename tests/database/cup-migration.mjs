import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
for(const file of ['20260917000100_initial_football.sql','20260918000100_cup_score_breakdown.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
await db.exec("insert into teams(provider,external_id,name,fetched_at) values ('goal-api','a','A',now()),('goal-api','b','B',now()); insert into competitions(provider,external_id,name,fetched_at) values ('goal-api','cup','Cup',now()); insert into seasons(provider,external_id,competition_id,name,fetched_at) select 'goal-api','2026',id,'2026',now() from competitions;");
const insert="insert into fixtures(provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at,source_round_label,home_score,away_score,home_penalty_score,away_penalty_score) select 'goal-api','match',s.id,a.id,b.id,'FINISHED',now(),'Final',1,1,4,3 from seasons s,teams a,teams b where a.external_id='a' and b.external_id='b'";
await db.exec(insert);
let row=(await db.query('select * from fixtures')).rows[0];assert.equal(row.home_score,1);assert.equal(row.home_penalty_score,4);assert.equal(row.home_extra_score,null);assert.equal(row.source_round_label,'Final');
for(const column of ['home_fulltime_score','away_fulltime_score','home_extra_score','away_extra_score','home_penalty_score','away_penalty_score'])await assert.rejects(db.exec(`update fixtures set ${column}=-1`));
await assert.rejects(db.exec(insert));
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select home_penalty_score from fixtures'));await db.exec('reset role');}
await db.exec('set role service_role');assert.equal((await db.query('select count(*)::int n from fixtures')).rows[0].n,1);
await db.close();console.log('PASS: cup migration preserves scores, rejects negatives/duplicates and retains RLS privileges');
