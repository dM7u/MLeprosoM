import 'server-only';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../standings/batch.mjs';
import {validateReviewedXi} from './reviewed-xi.mjs';
import policy from './xi-policy.json' with {type:'json'};

const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const time=value=>typeof value==='string'&&/T.*(Z|[+-]\d{2}:\d{2})$/.test(value)?Date.parse(value):NaN;
const hash=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const columns=['id','contract_version','fixture_id','team_id','source_url','previous_id','action','reason','reviewed_at','reviewer','evidence'];
const body=row=>Object.fromEntries(columns.map(key=>[key,key==='reviewed_at'?new Date(row[key]).toISOString():row[key]]));

function assertContext(fixture,teamId) {
  if(!uuid(fixture?.id)||!uuid(teamId)||![fixture.home_team_id,fixture.away_team_id].includes(teamId))throw new Error('EDITORIAL_XI_INVALID_CONTEXT');
  return teamId===fixture.home_team_id?fixture.home_external_id:fixture.away_external_id;
}

export function createEditorialRevision({id,previousId=null,action='review',reason=null,reviewedAt,reviewer,evidence,fixture,teamId,now=Date.now()}) {
  const teamExternalId=assertContext(fixture,teamId);
  if(!uuid(id)||(previousId!==null&&!uuid(previousId))||id===previousId||!['review','retract'].includes(action)||
    (reason!==null&&(typeof reason!=='string'||!reason.trim()))||
    (action==='retract'&&(!previousId||!reason))||typeof reviewer!=='string'||!reviewer.trim()||
    !Number.isFinite(now)||!Number.isFinite(time(reviewedAt))||time(reviewedAt)>now)throw new Error('EDITORIAL_XI_INVALID_REVISION');
  const validationFixture=action==='retract'?{...fixture,kickoff_at:evidence?.binding?.kickoff_at}:fixture;
  const validated=validateReviewedXi(evidence,{fixture:validationFixture,now,maxAgeMs:policy.maxAgeMs});
  if(evidence.team_external_id!==teamExternalId||time(evidence.review.reviewed_at)>time(reviewedAt))throw new Error('EDITORIAL_XI_REVISION_MISMATCH');
  const facts=Object.fromEntries(Object.entries(validated).filter(([key])=>!['assessment','issues','deduplication_key'].includes(key)));
  const row={id,contract_version:1,fixture_id:fixture.id,team_id:teamId,source_url:facts.source.url,previous_id:previousId,
    action,reason,reviewed_at:new Date(reviewedAt).toISOString(),reviewer,evidence:facts};
  return {...row,content_hash:hash(row)};
}

export function validateEditorialRevision(row,{fixture,teamId,now}) {
  assertContext(fixture,teamId);
  if(row?.fixture_id!==fixture.id||row?.team_id!==teamId)throw new Error('EDITORIAL_XI_REVISION_MISMATCH');
  // Validate original facts without treating a later kickoff change as corruption.
  const original={...fixture,kickoff_at:row.evidence?.binding?.kickoff_at};
  const expected=createEditorialRevision({id:row.id,previousId:row.previous_id,action:row.action,reason:row.reason,
    reviewedAt:new Date(row.reviewed_at).toISOString(),reviewer:row.reviewer,evidence:row.evidence,fixture:original,teamId,now});
  if(row.content_hash!==expected.content_hash||canonicalJson(body(row))!==canonicalJson(body(expected)))throw new Error('EDITORIAL_XI_CORRUPT_REVISION');
  return expected;
}

export async function storeEditorialRevision(db,revision,context) {
  const row=validateEditorialRevision(revision,context);
  try {
    const replay=async()=>{
      const {data,error}=await db.from('editorial_xi_revisions').select('*').eq('id',row.id).maybeSingle();
      if(error)throw new Error('EDITORIAL_XI_STORAGE_FAILED');
      if(!data)return null;
      if(data.content_hash!==row.content_hash||canonicalJson(body(data))!==canonicalJson(body(row)))throw new Error('EDITORIAL_XI_WRITE_CONFLICT');
      return {stored:false,replay:true,id:row.id};
    };
    // Identical retries remain idempotent even after the fixture is reprogrammed.
    const existing=await replay();
    if(existing)return existing;
    const {error}=await db.from('editorial_xi_revisions').insert(row);
    if(!error)return {stored:true,replay:false,id:row.id};
    if(error.code==='23505') {
      const concurrentReplay=await replay();
      if(concurrentReplay)return concurrentReplay;
      throw new Error('EDITORIAL_XI_WRITE_CONFLICT');
    }
    throw new Error('EDITORIAL_XI_STORAGE_FAILED');
  }catch(error){throw new Error(error.message==='EDITORIAL_XI_WRITE_CONFLICT'?error.message:'EDITORIAL_XI_STORAGE_FAILED');}
}

/** Heads must come from read_editorial_xi_heads, not a filtered history query. */
export function editorialXiView(heads,{fixture,teamId,now=Date.now()}) {
  assertContext(fixture,teamId);
  const unavailable=issues=>({status:'unavailable',data:null,issues});
  if(!Array.isArray(heads)||heads.length>100)throw new Error('EDITORIAL_XI_HEADS_UNAVAILABLE');
  const rows=heads.map(row=>validateEditorialRevision(row,{fixture,teamId,now}));
  if(new Set(rows.map(row=>row.source_url)).size!==rows.length||new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('EDITORIAL_XI_AMBIGUOUS_HEADS');
  if(fixture.state!=='scheduled'||!Number.isFinite(time(fixture.kickoff_at))||now>=time(fixture.kickoff_at))return unavailable(['fixture_not_upcoming']);
  const candidates=[],issues=[];
  for(const row of rows) {
    if(row.action==='retract'){issues.push('retracted');continue;}
    if(time(row.evidence.binding.kickoff_at)!==time(fixture.kickoff_at)){issues.push('fixture_rescheduled');continue;}
    const result=validateReviewedXi(row.evidence,{fixture,now,maxAgeMs:policy.maxAgeMs});
    if(result.issues.includes('unresolved_conflict')||result.issues.includes('ambiguous_xi'))return unavailable(['unresolved_conflict']);
    if(result.assessment==='eligible_for_future_publication')candidates.push({row,result});
    else issues.push(...result.issues);
  }
  if(!candidates.length)return unavailable([...new Set(issues.length?issues:['no_evidence'])]);
  const names=candidate=>canonicalJson([...candidate.result.starters].map(name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es')).sort());
  if(candidates.some(candidate=>names(candidate)!==names(candidates[0])))return unavailable(['conflicting_sources']);
  return {status:'available',data:{origin:'journalistic',starters:[...candidates[0].result.starters],
    sources:candidates.map(({row,result})=>({revision_id:row.id,...result.source,claim:result.claim,observed_at:result.observed_at}))},issues:[...new Set(issues)]};
}

export async function readEditorialXi(db,options) {
  assertContext(options.fixture,options.teamId);
  try {
    const {data,error}=await db.rpc('read_editorial_xi_heads',{p_fixture_id:options.fixture.id,p_team_id:options.teamId});
    if(error)throw new Error();
    return editorialXiView(data,options);
  }catch{return {status:'error',data:null,issues:['editorial_storage_unavailable']};}
}
