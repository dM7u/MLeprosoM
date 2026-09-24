import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {prepareBsdReview, adaptBsdCatalog} from '../../src/server/standings/bsd-adapter.mjs';
import {createStandingsBatch} from '../../src/server/standings/batch.mjs';
import {storeStandingsBatch as store} from '../../src/server/db/store-standings-batch.mjs';
import {officialReviewSample} from '../fixtures/official-review.mjs';
import {createOfficialReview} from '../../src/server/standings/official-review.mjs';
import {storeOfficialReview as storeReview} from '../../src/server/db/store-official-review.mjs';
const storeOfficialReview = (db, options) => storeReview(db, options, {now: options.now});
const storeStandingsBatch = (db, batch) => store(db, batch, {now: Date.parse('2026-09-25T00:00:00Z')});

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const review = load('docs/research/lpf-2026-standings-review.json');
const catalog = load('docs/research/bsd-catalog-20260924.json');
const input = adaptBsdCatalog(catalog, prepareBsdReview(load(review.mapping_file), review));
const batch = createStandingsBatch({id: '00000000-0000-4000-8000-000000000001', generatedAt: '2026-09-24T12:00:00Z', input,
  auditIssues: input.issues, excludedIds: input.excluded.map(row => String(row.id)), requestCount: catalog.requests});
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync('supabase/migrations/20260917000100_initial_football.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20260918000100_cup_score_breakdown.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20260924000100_standings_batches.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20260924000200_standings_official_reviews.sql', 'utf8'));
  const query = async (sql, params = []) => (await db.query(sql, params)).rows;
  const insert = row => {
    const keys = Object.keys(batch); // fixed, locally generated contract keys
    return db.query(`insert into standings_batches (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, keys.map(key => key === 'payload' ? JSON.stringify(row[key]) : row[key]));
  };
  assert.equal((await query("select relrowsecurity from pg_class where relname='standings_batches'"))[0].relrowsecurity, true);
  for (const role of ['anon', 'authenticated']) {
    await db.exec('set role ' + role);
    await assert.rejects(query('select * from standings_batches'));
    await assert.rejects(insert(batch));
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  // Real PostgreSQL-backed adapter exercises the same production insert/retry path.
  const client = {from: table => {
    assert.equal(table, 'standings_batches');
    return {
      insert: async row => {try {await insert(row); return {error: null};} catch (error) {return {error};}},
      select: () => ({eq: (key, id) => {assert.equal(key, 'id'); return {single: async () => ({data: (await query('select * from standings_batches where id=$1', [id]))[0], error: null})};}}),
    };
  }};
  assert.equal((await storeStandingsBatch(client, batch)).stored, true);
  assert.equal((await storeStandingsBatch(client, batch)).replay, true);
  assert.equal((await query('select count(*)::int as n from standings_batches'))[0].n, 1);
  assert.equal((await query('select payload from standings_batches'))[0].payload.snapshots.length, 7);
  await assert.rejects(db.exec("update standings_batches set status='incomplete'"));
  await assert.rejects(db.exec('delete from standings_batches'));
  const malformed = structuredClone(batch); malformed.id = '00000000-0000-4000-8000-000000000002'; malformed.payload = {};
  await assert.rejects(insert(malformed));
  const wrongScope = structuredClone(batch); wrongScope.id = malformed.id; wrongScope.provider = 'foreign';
  await assert.rejects(insert(wrongScope));
  assert.equal((await query('select count(*)::int as n from standings_batches'))[0].n, 1);
  const changed = createStandingsBatch({id: batch.id, input, generatedAt: '2026-09-24T13:00:00Z'});
  await assert.rejects(storeStandingsBatch(client, changed), /STANDINGS_IDEMPOTENCY_CONFLICT/);
  const missing = structuredClone(input); missing.fixtures = [];
  const incomplete = createStandingsBatch({id: malformed.id, input: missing, generatedAt: batch.generated_at});
  await storeStandingsBatch(client, incomplete);
  assert.equal((await query("select count(*)::int as n from standings_batches where status='complete'"))[0].n, 1);
  const options = officialReviewSample();
  await storeStandingsBatch(client, options.batch);
  const reviewed = createOfficialReview(options);
  const insertReview = row => {
    const keys = Object.keys(reviewed);
    return db.query(`insert into standings_official_reviews (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, keys.map(key => key === 'payload' ? JSON.stringify(row[key]) : row[key]));
  };
  const reviewClient = {from: table => {
    assert.equal(table, 'standings_official_reviews');
    return {insert: async row => {try {await insertReview(row); return {error: null};} catch (error) {return {error};}},
      select: () => ({eq: (_key, id) => ({single: async () => ({data: (await query('select * from standings_official_reviews where id=$1', [id]))[0]})})})};
  }};
  assert.equal((await storeOfficialReview(reviewClient, options)).activated, true);
  assert.equal((await storeOfficialReview(reviewClient, options)).replay, true);
  assert.equal((await query('select count(*)::int as n from standings_official_reviews'))[0].n, 1);
  const invalidReview = structuredClone(reviewed); invalidReview.id = '30000000-0000-4000-8000-000000000001';
  invalidReview.batch_payload_hash = '0'.repeat(64);
  invalidReview.payload.evidence.payload_hash = invalidReview.batch_payload_hash;
  await assert.rejects(insertReview(invalidReview));
  const forged = structuredClone(reviewed); forged.id = invalidReview.id; forged.batch_id = incomplete.id;
  forged.batch_payload_hash = incomplete.payload_hash;
  forged.payload.evidence.batch_id = incomplete.id; forged.payload.evidence.payload_hash = incomplete.payload_hash;
  await assert.rejects(insertReview(forged), /STANDINGS_BATCH_NOT_COMPLETE/);
  options.id = invalidReview.id; options.evidence.tables[0].rows[0].pts--;
  const denied = await storeOfficialReview(reviewClient, options);
  assert.equal(denied.status, 'differences'); assert.equal(denied.activated, false);
  await assert.rejects(db.exec('update standings_official_reviews set activated=true'));
  await assert.rejects(db.exec('delete from standings_official_reviews'));
  await db.exec('reset role');
  assert.equal((await query("select relrowsecurity from pg_class where relname='standings_official_reviews'"))[0].relrowsecurity, true);
  for (const role of ['anon', 'authenticated']) {
    await db.exec('set role ' + role);
    await assert.rejects(query('select * from standings_official_reviews'));
    await assert.rejects(insertReview(reviewed));
    await db.exec('reset role');
  }
  console.log('PASS: immutable atomic batches and official reviews, retry/conflict, RLS/private roles, exact batch/hash FK, incomplete activation rejected by SQL, differences audited without activation');
} finally { await db.close(); }
