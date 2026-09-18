import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTeamResolver, sourceIdentity} from '../src/server/identity/team-identity.mjs';
const registry = JSON.parse(readFileSync(new URL('../src/server/identity/reviewed-teams.json', import.meta.url)));

test('reviewed Newells references share identity without replacing source IDs', () => {
  const resolve = createTeamResolver(registry);
  const bsd = resolve('bsd', '4997');
  const goal = resolve('goal-api', 'cmr7sjrx97uhirx06ll1213tl');
  assert.equal(bsd.status, 'verified');
  assert.equal(bsd.canonicalId, goal.canonicalId);
  assert.notEqual(bsd.sourceKey, goal.sourceKey);
});

test('unknown IDs and another provider remain unresolved', () => {
  const resolve = createTeamResolver(registry);
  for (const args of [['goal-api', '4997'], ['unknown', '4997'], ['bsd', '04997']]) {
    assert.equal(resolve(...args).status, 'unresolved');
    assert.equal(resolve(...args).canonicalId, null);
  }
});

test('rejects conflicting mappings instead of silently merging clubs', () => {
  const duplicate = structuredClone(registry.teams[0]);
  duplicate.canonicalId = 'another-club';
  assert.throws(() => createTeamResolver({...registry, teams: [...registry.teams, duplicate]}), /DUPLICATE_SOURCE_IDENTITY/);
  assert.throws(() => createTeamResolver({...registry, teams: [...registry.teams, registry.teams[0]]}), /INVALID_IDENTITY_REGISTRY/);
});

test('requires evidence and preserves opaque source identifiers', () => {
  const missing = structuredClone(registry);
  missing.teams[0].evidence = [];
  assert.throws(() => createTeamResolver(missing), /INVALID_IDENTITY_REGISTRY/);
  for (const id of [null, undefined, 4997, '', ' 4997']) assert.throws(() => sourceIdentity('bsd', id));
  assert.notEqual(sourceIdentity('a:b', 'c'), sourceIdentity('a', 'b:c'));
  assert.notEqual(sourceIdentity('a', 'ID'), sourceIdentity('a', 'id'));
});
