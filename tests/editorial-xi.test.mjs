import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateReviewedXi} from '../src/server/editorial/reviewed-xi.mjs';
const fixture={provider:'test',fixture_external_id:'match',competition_external_id:'league',season_external_id:'season',home_external_id:'home',away_external_id:'away',kickoff_at:'2026-09-27T20:00:00Z',state:'scheduled'};
const now=Date.parse('2026-09-26T12:00:00Z'),maxAgeMs=48*3600000;
const sample=()=>({version:1,binding:{...fixture},team_external_id:'away',
  source:{type:'journalistic',outlet:'La Capital',url:'https://www.lacapital.com.ar/ovacion/test.html',author:null,published_text:'Synthetic test date',published_at:'2026-09-26T10:00:00Z'},
  observed_at:'2026-09-26T11:00:00Z',review:{reviewer:'test',reviewed_at:'2026-09-26T11:30:00Z',status:'reviewed',identity_confirmed:true},
  claim:'confirmed_by_outlet',ambiguous:false,starters:Array.from({length:11},(_,n)=>`Test player ${n}`)});
const check=e=>validateReviewedXi(e,{fixture,now,maxAgeMs});

test('editorial XI preserves attribution and names without inventing official confirmation or player IDs',()=>{
  const e=sample(),result=check(e);
  assert.equal(result.assessment,'eligible_for_future_publication');
  assert.equal(result.source.type,'journalistic');assert.equal(result.claim,'confirmed_by_outlet');
  assert.deepEqual(result.starters,e.starters);assert.notEqual(result.starters,e.starters);
  assert.equal(result.source.author,null);assert.equal(result.formation,undefined);
});
test('editorial XI rejects foreign matches, localia changes and rescheduled kickoff',()=>{
  for(const key of ['fixture_external_id','competition_external_id','season_external_id','home_external_id','away_external_id','kickoff_at']){
    const e=sample();e.binding[key]='other';assert.throws(()=>check(e),/IDENTITY/);
  }
  const e=sample();e.team_external_id='other';assert.throws(()=>check(e),/IDENTITY/);
});
test('partial, ambiguous and conflicting evidence never becomes an eligible XI',()=>{
  for(const change of [e=>e.starters.pop(),e=>e.ambiguous=true,e=>e.review.status='conflict']){
    const e=sample();change(e);assert.equal(check(e).assessment,'unavailable');
  }
  const e=sample();e.starters[10]='  TEST player 0 ';assert.throws(()=>check(e),/DUPLICATE/);
});
test('publication age is not renewed by observation; unknown timezone and kickoff fail closed',()=>{
  const e=sample();e.source.published_at=new Date(now-maxAgeMs).toISOString();
  assert.ok(check(e).issues.includes('publication_expired'));
  e.source.published_at=null;assert.ok(check(e).issues.includes('publication_time_unknown'));
  for(const state of ['started','finished','unavailable']) assert.ok(validateReviewedXi(sample(),{fixture:{...fixture,state},now,maxAgeMs}).issues.includes('fixture_not_upcoming'));
  assert.ok(validateReviewedXi(sample(),{fixture,now:Date.parse(fixture.kickoff_at),maxAgeMs}).issues.includes('fixture_not_upcoming'));
  assert.ok(validateReviewedXi(sample(),{fixture,now}).issues.includes('age_policy_pending'));
});
test('source, chronology and review must be explicit and valid',()=>{
  for(const change of [e=>e.source.url='https://evil.test/ovacion/test.html',e=>e.source.url+='?token=x',
    e=>e.source.published_at='2026-09-26T10:00:00',e=>e.observed_at='2026-09-27T10:00:00Z',
    e=>e.review.identity_confirmed=false,e=>e.claim='official']){
    const e=sample();change(e);assert.throws(()=>check(e),/^Error: EDITORIAL_XI_/);
  }
});
