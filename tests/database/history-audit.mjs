import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync, readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const sql = readFileSync('supabase/check-history-access.sql', 'utf8');
const audit = async () => (await db.query(sql)).rows.map(row => row.evidence);
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const name of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync('supabase/migrations/' + name, 'utf8'));
  }
  // The audit itself must run inside a read-only transaction.
  await db.exec('begin read only');
  const clean = await audit();
  await db.exec('rollback');
  assert.equal(clean.length, 5);
  assert.ok(clean.every(row => row.exists && row.access_ok));
  assert.ok(clean.every(row => row.columns.length && row.constraints.length && row.indexes.length));
  const review = clean.find(row => row.table === 'standings_official_reviews');
  assert.match(review.triggers[0].function_definition, /STANDINGS_BATCH_NOT_COMPLETE/);
  assert.equal(review.triggers[0].enabled, 'O');
  await db.exec('alter table standings_official_reviews disable trigger standings_activation_complete;');
  const disabled = (await audit()).find(row => row.table === 'standings_official_reviews');
  assert.equal(disabled.triggers[0].enabled, 'D');
  assert.equal(disabled.access_ok, true); // Permissions alone never certify the DDL.
  await db.exec('create policy audit_test on lineup_observations for select to anon using (true);');
  assert.deepEqual((await audit()).find(row => row.table === 'lineup_observations').policies[0].roles, ['anon']);
  await db.exec('grant update (status) on incident_observations to service_role;');
  assert.equal((await audit()).find(row => row.table === 'incident_observations').access_ok, false);
  await db.exec('revoke update (status) on incident_observations from service_role; grant truncate on lineup_observations to public;');
  assert.equal((await audit()).find(row => row.table === 'lineup_observations').access_ok, false);
  await db.exec('alter table team_statistics_observations disable row level security;');
  assert.equal((await audit()).find(row => row.table === 'team_statistics_observations').access_ok, false);
  await db.exec('drop table incident_observations;');
  const missing = (await audit()).find(row => row.table === 'incident_observations');
  assert.equal(missing.exists, false);
  assert.equal(missing.access_ok, false);
  console.log('PASS: read-only history audit, full definitions, column/PUBLIC privileges, RLS and missing table detection');
} finally { await db.close(); }
