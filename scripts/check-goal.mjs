import 'server-only';
import {readFileSync} from 'node:fs';
import {createTeamResolver} from '../src/server/identity/team-identity.mjs';
import {requestGoal, readGoalTeamFixtures} from '../src/server/providers/goal-api/fixtures.mjs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
let requests = 0;
try {
  if (process.argv.length !== 3 || process.argv[2] !== '--dry-run') throw new Error('GOAL_DRY_RUN_ONLY');
  const scope = read('../src/server/providers/goal-api/reviewed-scope.json');
  const resolve = createTeamResolver(read('../src/server/identity/reviewed-teams.json'));
  if (resolve('goal-api', scope.teamId).canonicalId !== scope.canonicalTeamId) throw new Error('GOAL_UNREVIEWED_TEAM');
  if (!process.env.GOAL_API_KEY?.trim()) throw new Error('GOAL_KEY_MISSING');
  const get = path => {requests++; return requestGoal(path, process.env.GOAL_API_KEY);};
  const result = await readGoalTeamFixtures(get, scope, new Date().toISOString());
  console.log(JSON.stringify({mode:'dry-run',requests,scanned:result.scanned,excluded:result.excluded,pages:result.pages,fixtures:result.fixtures.length,empty:result.fixtures.length === 0}));
} catch (error) {
  const code = /^GOAL_[A-Z_0-9]+$/.test(error?.message ?? '') ? error.message : 'GOAL_VALIDATION_FAILED';
  console.error(JSON.stringify({mode:'dry-run',requests,error:code}));
  process.exitCode = 1;
}
