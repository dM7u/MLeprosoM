import 'server-only';
import {dataState} from '../data-state.mjs';
import {readTeamFixtures} from './read-fixtures.mjs';

/** Independent snapshots: a failed source never erases a successful source. */
export async function readCombinedFixtures(db, scopes, {ttlMs,now=Date.now()}, reader=readTeamFixtures) {
  dataState({data:null,fetchedAt:null,ttlMs,now});
  const snapshots=await Promise.all(scopes.map(async scope=>{
    try{return await reader(db,{...scope,ttlMs,now});}
    catch{return dataState({data:null,fetchedAt:null,ttlMs,now,refreshFailed:true});}
  }));
  const sources=snapshots.map((s,i)=>({provider:scopes[i].provider,status:s.status,label:s.label,updatedAt:s.updatedAt}));
  const rows=snapshots.flatMap(s=>s.data??[]);
  const timestamps=snapshots.filter(s=>s.data?.length).map(s=>s.updatedAt);
  const valid=timestamps.length>0&&timestamps.every(t=>typeof t==='string'&&Number.isFinite(Date.parse(t)));
  const fetchedAt=valid?new Date(Math.min(...timestamps.map(t=>Date.parse(t)))).toISOString():null;
  const incomplete=snapshots.some(s=>s.partial||['empty','error'].includes(s.status));
  const state=dataState({data:rows,fetchedAt,ttlMs,now,partial:incomplete,refreshFailed:snapshots.some(s=>s.status==='stale')||(!rows.length&&snapshots.some(s=>s.status==='error'))});
  return {...state,data:rows,sources};
}
