import {createEditorialRevision} from '../../src/server/editorial/revisions.mjs';
export const now=Date.parse('2020-01-02T12:00:00Z');
export const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',fixture_external_id:'event',competition_external_id:'league',season_external_id:'season',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',
  home_external_id:'home',away_external_id:'away',kickoff_at:'2020-01-03T20:00:00Z',state:'scheduled'};
export const options={fixture,teamId:fixture.away_team_id,now};
export const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const evidence=()=>({version:1,binding:{...fixture},team_external_id:'away',
  source:{type:'journalistic',outlet:'La Capital',url:'https://www.lacapital.com.ar/ovacion/test.html',author:null,published_text:'Synthetic test date',published_at:'2020-01-02T10:00:00Z'},
  observed_at:'2020-01-02T11:00:00Z',review:{reviewer:'test',reviewed_at:'2020-01-02T11:30:00Z',status:'reviewed',identity_confirmed:true},
  claim:'probable',ambiguous:false,starters:Array.from({length:11},(_,n)=>`Test player ${n}`)});
export const revision=(n,overrides={})=>createEditorialRevision({...options,id:id(n),evidence:evidence(),reviewedAt:'2020-01-02T11:30:00Z',reviewer:'test',...overrides});
