import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureDate,fixtureScore,fixtureStatus} from '../src/app/fixture-format.mjs';
test('display keeps missing scores distinct from a real zero',()=>{
 assert.equal(fixtureScore(null,0),'Sin datos');assert.equal(fixtureScore(0,0),'0 – 0');
 assert.equal(fixtureStatus('unexpected'),'Estado sin confirmar');
 assert.equal(fixtureDate(null),'Fecha sin confirmar');
 assert.match(fixtureDate('2026-09-11T20:00:00Z'),/17:00/);
});
