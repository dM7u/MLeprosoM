import Link from 'next/link';
import SiteHeader from '../site-header';
import TeamCrest from '../team-crest';
import {fixtureDate,fixtureScore} from '../fixture-format.mjs';
import {dashboardFixtures,defaultTournament} from '../dashboard-model.mjs';
import {standingsContext} from '../standings-context.mjs';
import {fixtureView,type StoredFixture} from '@/server/db/fixture-view';
import {dashboardStandingsSet,highlightedTeam} from '@/server/db/dashboard-standings';
import {teamStartsView} from '@/server/db/team-starts-view';
import TeamFormation from './team-formation';

export const dynamic='force-dynamic';

function MatchPanel({title,matches}:{title:string;matches:StoredFixture[]}) {
  return <section className="home-card team-summary" aria-label={title}><h2>{title}</h2>{matches.length?<ul>{matches.map(match=><li key={`${match.provider}:${match.external_id}`}><Link href={`/partidos/${match.id}`} aria-label={`Abrir ficha de ${match.home_team??'local'} contra ${match.away_team??'visitante'}`}><span className="team-match-names"><TeamCrest provider={match.provider} externalId={match.home_external_id}/><span>{match.home_team??'Sin datos'}<small>vs {match.away_team??'Sin datos'}</small></span><TeamCrest provider={match.provider} externalId={match.away_external_id}/></span><strong>{match.source_status==='finished'||match.source_status==='FINISHED'?fixtureScore(match.home_score,match.away_score):fixtureDate(match.kickoff_at)}</strong></Link></li>)}</ul>:<p className="home-empty">Sin datos de partidos.</p>}</section>;
}

export default async function EquipoPage() {
  const [fixtures,standings]=await Promise.all([fixtureView(),dashboardStandingsSet()]);
  const now=standings.annual.checked_at;
  const {finished,upcoming}=dashboardFixtures(fixtures.data,now);
  const starts=await teamStartsView(finished,highlightedTeam,now);
  const tournaments=[...new Set(standings.annual.selections?.flatMap(s=>s.tournament?[s.tournament]:[])??[])];
  const tournament=defaultTournament(fixtures.data,tournaments,now);
  const groups=standings.annual.selections?.filter(s=>s.kind==='tournament'&&s.tournament===tournament&&s.group).map(s=>s.group!)??[];
  const groupView=groups.map(group=>({group,view:standings.select({kind:'tournament',tournament,group})})).find(({view})=>view.snapshot?.rows.some(row=>row.team_id===highlightedTeam));
  const table=groupView?.view??standings.select({kind:'tournament',tournament});
  const tableRows=standingsContext(table.snapshot?.rows,highlightedTeam);
  const teamNames=new Map(table.teams?.map(team=>[team.id,team.label])??[]);
  const formationLineup=starts.formationLineup;
  return <div className="home-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a><SiteHeader section="team"/>
    <main id="contenido" className="home-content team-content"><h1 className="sr-only">Equipo de Newell&apos;s Old Boys</h1>
      <div className="team-top"><MatchPanel title="Partidos jugados" matches={finished.slice(0,3)}/><MatchPanel title="Próximos partidos" matches={upcoming.slice(0,3)}/>
        <section className="home-card team-summary" aria-labelledby="team-table-title"><h2 id="team-table-title">Posiciones</h2><p className="team-subtitle">{groupView?`${tournament} · ${groupView.group}`:tournament} · cálculo propio</p>{tableRows.length?<div className="team-table-rows">{tableRows.map(row=><div className={`team-table-row ${row.team_id===highlightedTeam?'team-table-ours':''}`} key={row.team_id}><strong>{row.calculated_position??'—'}</strong><TeamCrest provider="bsd" externalId={row.team_id}/><span>{teamNames.get(row.team_id)??'Sin datos'}</span><strong>{row.pts} pts</strong></div>)}</div>:<p className="home-empty">Sin datos de posición contextual.</p>}</section></div>
      <TeamFormation lineup={formationLineup} coveredCount={starts.coveredCount} finishedCount={starts.finishedCount}/>
      <div className="home-pair team-bottom"><section className="home-card" aria-labelledby="team-coach-title"><h2 id="team-coach-title">Puntuación del técnico</h2><p>Frank Kudelka</p><p className="team-subtitle">Foto y partidos dirigidos con resultado verificado: Sin datos</p><p>Jugados · Ganados · Empatados · Perdidos: Sin datos</p><p>Calificación media: Sin datos</p></section><section className="home-card" aria-labelledby="team-players-title"><h2 id="team-players-title">Estadísticas individuales</h2><p className="home-empty">Top 3 por media: Sin datos. Falta definir y validar la calificación propia.</p></section></div>
      <footer className="home-footer">Desarrollado por dM7.</footer>
    </main></div>;
}
