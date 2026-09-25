/** Window in the existing table order; never computes a rank or resolves ties. */
export function standingsContext(rows, teamId) {
  if (!Array.isArray(rows)) return [];
  const matches=rows.flatMap((row,index)=>row.team_id===teamId?[index]:[]);
  if(matches.length!==1)return [];
  const index=matches[0];
  return rows.slice(Math.max(0,index-1),Math.min(rows.length,index+2));
}

/** Both opponents must belong to the reviewed league scope; preserve home/away order. */
export function matchupStandings(rows, fixture, scope) {
  if (!Array.isArray(rows) || !fixture || fixture.provider!==scope.provider ||
    fixture.competition_external_id!==scope.competitionId || fixture.season_external_id!==scope.seasonId) return [];
  const ids=[fixture.home_external_id,fixture.away_external_id];
  if(ids.some(id=>typeof id!=='string'||!id) || ids[0]===ids[1] || !ids.includes(scope.externalTeamId))return [];
  const teams=ids.map(id=>rows.filter(row=>row.team_id===id));
  return teams.every(matches=>matches.length===1)?teams.map(matches=>matches[0]):[];
}
