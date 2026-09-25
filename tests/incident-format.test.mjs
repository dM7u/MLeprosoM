import {test} from 'node:test';
import assert from 'node:assert/strict';
import {incidentLabel,incidentMinute} from '../src/app/incident-format.mjs';
import {importIncidents} from '../src/server/db/import-incidents.mjs';
test('event presentation preserves unknown time, real zero and substitutions direction',()=>{
  assert.equal(incidentMinute({minute:null,added_time:null}),'Minuto sin datos');
  assert.equal(incidentMinute({minute:90,added_time:1}),'90+1′');
  assert.equal(incidentMinute({minute:0,added_time:null}),'0′');
  assert.equal(incidentLabel({type:'substitution',player_in:{name:'A'},player_out:{name:'B'}}),'Entra A · Sale B');
  assert.equal(incidentLabel({type:'injuryTime',length:0}),'Descuento anunciado: 0 min');
  assert.equal(incidentLabel({type:'injuryTime',length:null}),'Descuento anunciado: Sin datos');
  assert.match(incidentLabel({type:'card',subtype:'other'}),/sin interpretar/);
  assert.match(incidentLabel({type:'unknown',source_type:'VAR'}),/sin interpretar: VAR/);
});
test('incident import validates arguments before DB and never invents missing fixture',async()=>{
  const scope={provider:'bsd',externalTeamId:'4997',competitionId:'85',seasonId:'1635'};
  const args={scope,id:'10000000-0000-4000-8000-000000000001',mode:'--dry-run',now:Date.parse('2026-01-02T00:00:00Z')};
  await assert.rejects(importIncidents({from(){assert.fail('must not access DB');}},{...args,sample:null}));
  const db={from(){return this;},select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}};
  await assert.rejects(importIncidents(db,{...args,sample:{fetched_at:'2026-01-01T00:00:00Z',body:{event_id:223728,incidents:[]}}}),/OUT_OF_SCOPE/);
});
