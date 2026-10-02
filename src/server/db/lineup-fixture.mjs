import 'server-only';
import {resolveDetailFixture} from './detail-fixture.mjs';
export const resolveLineupFixture=(db,options)=>resolveDetailFixture(db,options,'LINEUPS');
