import 'server-only';
import {resolveDetailFixture} from './detail-fixture.mjs';
export const resolveIncidentFixture=(db,options)=>resolveDetailFixture(db,options,'INCIDENTS');
