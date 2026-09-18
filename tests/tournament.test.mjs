import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTournamentResolver} from '../src/server/competitions/resolve-tournament.mjs';
const mapping=JSON.parse(readFileSync(new URL('../src/server/competitions/newells-2026.json',import.meta.url)));
const resolve=createTournamentResolver(mapping);
const fixture=row=>({provider:'bsd',competition_external_id:'85',season_external_id:'1635',external_id:String(row.bsd_event_id),home_external_id:String(row.home_team_id),away_external_id:String(row.away_team_id),source_round:row.round});
test('reviewed map classifies 16 fixtures per tournament without using date',()=>{
 const counts={};for(const row of mapping.rows){const f=fixture(row);const result=resolve({...f,kickoff_at:'2030-01-01'});assert.equal(result.name,row.tournament);counts[result.name]=(counts[result.name]??0)+1;}
 assert.deepEqual(counts,{Apertura:16,Clausura:16});
});
test('unreviewed or changed identities, season, round and localia stay unclassified',()=>{
 const f=fixture(mapping.rows[0]);
 for(const patch of [{provider:'goal-api'},{competition_external_id:'other'},{season_external_id:'2027'},{external_id:'missing'},{home_external_id:f.away_external_id,away_external_id:f.home_external_id},{source_round:999},{home_external_id:null}])assert.equal(resolve({...f,...patch}),null);
});
test('ambiguous map is rejected',()=>assert.throws(()=>createTournamentResolver({...mapping,rows:[mapping.rows[0],mapping.rows[0]]}),/INVALID_TOURNAMENT_MAP/));
