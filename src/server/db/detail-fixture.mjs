import 'server-only';
import {readTeamFixtures} from './read-fixtures.mjs';
/** Preserve the importer's bounded team/scope lookup and local/external binding. */
export async function resolveDetailFixture(db,{eventId,scope,now=Date.now()},errorPrefix) {
 if(!Number.isSafeInteger(eventId)||eventId<=0)throw new Error(errorPrefix+'_USAGE');
 if(scope?.provider!=='bsd'||['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k].trim()))throw new Error(errorPrefix+'_INVALID_SCOPE');
 const snapshot=await readTeamFixtures(db,{...scope,ttlMs:1,now});
 if(snapshot.status==='error'||snapshot.partial)throw new Error(errorPrefix+'_LOOKUP_FAILED');
 const matches=(snapshot.data??[]).filter(f=>f.external_id===String(eventId));
 if(matches.length!==1)throw new Error(errorPrefix+'_OUT_OF_SCOPE');
 const fixture=matches[0];
 if(fixture.provider!==scope.provider||fixture.competition_external_id!==scope.competitionId||fixture.season_external_id!==scope.seasonId||
  ![fixture.home_external_id,fixture.away_external_id].includes(scope.externalTeamId))throw new Error(errorPrefix+'_OUT_OF_SCOPE');
 return fixture;
}
