import 'server-only';
import {readTeamFixtures} from '../db/read-fixtures.mjs';
import {canonicalJson} from '../standings/batch.mjs';
import {validateReviewedXi} from './reviewed-xi.mjs';
import {createEditorialRevision,validateEditorialRevision,storeEditorialRevision} from './revisions.mjs';
import policy from './xi-policy.json' with {type:'json'};

const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const time=value=>typeof value==='string'&&/T.*(Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;

/** Manual saved evidence only. Dry-run resolves DB context but never inserts. */
export async function importEditorialXi(db,{evidence,operation,scope,mode,now=Date.now()}) {
  if(!['--dry-run','--apply'].includes(mode)||!uuid(operation?.id)||
    (operation.previousId!==null&&!uuid(operation.previousId))||
    operation.id===operation.previousId||!['review','retract'].includes(operation.action)||
    !text(operation.reviewer)||!Number.isFinite(time(operation.reviewedAt))||
    !Number.isFinite(now)||time(operation.reviewedAt)>now||
    (operation.reason!==null&&!text(operation.reason))||
    (operation.action==='retract'&&(!operation.previousId||!text(operation.reason))))throw new Error('EDITORIAL_XI_USAGE');
  if(scope?.provider!=='bsd'||!['externalTeamId','competitionId','seasonId'].every(key=>text(scope[key])))throw new Error('EDITORIAL_XI_INVALID_SCOPE');
  if(evidence?.binding?.provider!==scope.provider||evidence.binding.competition_external_id!==scope.competitionId||
    evidence.binding.season_external_id!==scope.seasonId||evidence.team_external_id!==scope.externalTeamId)throw new Error('EDITORIAL_XI_OUT_OF_SCOPE');
  // Shape/chronology only; the supplied binding is not trusted as DB identity.
  validateReviewedXi(evidence,{fixture:{...evidence.binding,state:'unavailable'},now,maxAgeMs:policy.maxAgeMs});
  if(time(evidence.review.reviewed_at)>time(operation.reviewedAt))throw new Error('EDITORIAL_XI_INVALID_TIME');
  const snapshot=await readTeamFixtures(db,{...scope,ttlMs:1,now});
  if(snapshot.status==='error'||snapshot.partial)throw new Error('EDITORIAL_XI_LOOKUP_FAILED');
  const matches=(snapshot.data??[]).filter(row=>row.external_id===evidence.binding.fixture_external_id);
  if(matches.length!==1)throw new Error('EDITORIAL_XI_OUT_OF_SCOPE');
  const stored=matches[0];
  if(stored.provider!==scope.provider||stored.competition_external_id!==scope.competitionId||stored.season_external_id!==scope.seasonId||
    ![stored.home_external_id,stored.away_external_id].includes(scope.externalTeamId))throw new Error('EDITORIAL_XI_OUT_OF_SCOPE');
  const fixture={id:stored.id,provider:stored.provider,fixture_external_id:stored.external_id,
    competition_external_id:stored.competition_external_id,season_external_id:stored.season_external_id,
    home_team_id:stored.home_team_id,away_team_id:stored.away_team_id,home_external_id:stored.home_external_id,
    away_external_id:stored.away_external_id,kickoff_at:stored.kickoff_at,
    state:stored.source_status==='notstarted'?'scheduled':stored.source_status==='finished'?'finished':'unavailable'};
  const teamId=stored.home_external_id===scope.externalTeamId?stored.home_team_id:stored.away_team_id;
  const context={fixture,teamId,now};
  let existing=null,heads=[],storageReady=true;
  try {
    const replay=await db.from('editorial_xi_revisions').select('*').eq('id',operation.id).maybeSingle();
    if(replay.error)throw new Error();
    existing=replay.data?validateEditorialRevision(replay.data,context):null;
    const response=await db.rpc('read_editorial_xi_heads',{p_fixture_id:fixture.id,p_team_id:teamId});
    if(response.error||!Array.isArray(response.data)||response.data.length>100)throw new Error();
    heads=response.data.map(row=>validateEditorialRevision(row,context));
    if(new Set(heads.map(row=>row.source_url)).size!==heads.length)throw new Error();
  }catch{storageReady=false;existing=null;heads=[];}
  // A retry may refer to the original kickoff. It is accepted only if identical.
  const creationFixture=existing?{...fixture,kickoff_at:existing.evidence.binding.kickoff_at}:fixture;
  const row=createEditorialRevision({...operation,evidence,fixture:creationFixture,teamId,now});
  let replay=false;
  if(storageReady) {
    if(existing) {
      if(canonicalJson(existing)!==canonicalJson(row))throw new Error('EDITORIAL_XI_WRITE_CONFLICT');
      replay=true;
    } else {
      const head=heads.find(head=>head.source_url===row.source_url);
      if((head?.id??null)!==row.previous_id)throw new Error('EDITORIAL_XI_WRITE_CONFLICT');
      if(head&&(Date.parse(head.reviewed_at)>Date.parse(row.reviewed_at)||
        (row.action==='retract'&&canonicalJson(row.evidence)!==canonicalJson(head.evidence))))throw new Error('EDITORIAL_XI_INVALID_PREDECESSOR');
    }
  }
  const issues=[];
  if(row.action==='retract')issues.push('retracted');
  else if(Date.parse(row.evidence.binding.kickoff_at)!==Date.parse(fixture.kickoff_at))issues.push('fixture_rescheduled');
  else issues.push(...validateReviewedXi(row.evidence,{fixture,now,maxAgeMs:policy.maxAgeMs}).issues);
  if(!storageReady)issues.push('editorial_storage_unavailable');
  if(mode==='--apply'&&!storageReady)throw new Error('EDITORIAL_XI_STORAGE_UNAVAILABLE');
  const result=mode==='--apply'?await storeEditorialRevision(db,row,context):null;
  return {mode,id:row.id,fixture_id:fixture.id,team_id:teamId,action:row.action,previous_id:row.previous_id,
    fixture_observed_at:stored.fetched_at??null,fixture_source_status:stored.source_status,
    observed_at:row.evidence.observed_at,published_at:row.evidence.source.published_at,
    storage_ready:storageReady,replay:replay||Boolean(result?.replay),assessment:issues.length?'unavailable':'eligible_for_future_publication',
    issues,content_hash:row.content_hash,provider_requests:0,published:false,writes:result?.stored?1:0,result};
}
