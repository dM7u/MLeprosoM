import Image from 'next/image';
import Link from 'next/link';
import HomeNextMatch from './home-next-match';
import HomeLineup, {type LineupMatch} from './home-lineup';
import TeamCrest from './team-crest';
import {fixtureView,type StoredFixture} from '@/server/db/fixture-view';
import {dashboardStandingsSet,highlightedTeam,type TableView} from '@/server/db/dashboard-standings';
import {teamStartsView} from '@/server/db/team-starts-view';
import {opponentLineupForNext} from '@/server/db/opponent-lineup.mjs';
import {dashboardFixtures,defaultTournament} from './dashboard-model.mjs';
import {fixtureScore} from './fixture-format.mjs';
import primaryScope from '@/server/identity/reviewed-primary-scope.json';
import reviewedHome from '@/server/data/reviewed-home-details.json';
import goalScope from '@/server/providers/goal-api/reviewed-scope.json';
export const dynamic='force-dynamic';

function pickLeagueView(standings:Awaited<ReturnType<typeof dashboardStandingsSet>>,fixtures:StoredFixture[],now:number) {
  const tournaments=[...new Set(standings.annual.selections?.flatMap(s=>s.tournament?[s.tournament]:[])??[])];
  const tournament=defaultTournament(fixtures,tournaments,now);
  if(!tournaments.includes(tournament))return {label:'Liga Profesional',view:null};
  const groups=standings.annual.selections?.filter(s=>s.kind==='tournament'&&s.tournament===tournament&&s.group).map(s=>s.group!)??[];
  for(const group of groups){
    const view=standings.select({kind:'tournament',tournament,group});
    if(view.snapshot?.rows.some(r=>r.team_id===highlightedTeam))return {label:`${tournament} · Grupo ${group}`,view};
  }
  return {label:`${tournament} · General`,view:standings.select({kind:'tournament',tournament})};
}

function LeagueCard({label,view}:{label:string;view:TableView|null}) {
  const row=view?.snapshot?.rows.find(r=>r.team_id===highlightedTeam);
  return <section className={`home-card home-league ${view?.status==='stale'?'home-stale':''}`} aria-labelledby="league-title"><div className="home-card-heading"><h2 id="league-title">Liga Profesional</h2><span>{label} · cálculo propio</span></div>
    {row?<><div className="league-grid league-head"><span>Pos.</span><span>Equipo</span><span>J</span><span>G</span><span>E</span><span>P</span><span>PTS</span></div><div className="league-grid league-values"><strong>{row.calculated_position??'—'}</strong><span className="league-team"><TeamCrest provider="bsd" externalId={highlightedTeam}/><span>Newell&apos;s</span></span><span>{row.played}</span><span className="won">{row.won}</span><span>{row.drawn}</span><span className="lost">{row.lost}</span><strong>{row.pts}</strong></div></>:<p className="home-empty">Sin datos de Newell&apos;s en el torneo en juego.</p>}
  </section>;
}

function CupCard({fixture}:{fixture:StoredFixture|null}) {
  const finished=fixture?.source_status==='FINISHED';
  const round=reviewedHome.cupRounds.find(row=>row.provider===fixture?.provider&&row.fixture_external_id===fixture.external_id&&row.stage===fixture.source_stage)?.label;
  const ourHome=fixture?.home_external_id===goalScope.teamId;
  const opponentName=ourHome?fixture?.away_team:fixture?.home_team;
  const ourScore=ourHome?fixture?.home_score:fixture?.away_score;
  const theirScore=ourHome?fixture?.away_score:fixture?.home_score;
  const outcome=ourScore==null||theirScore==null?'unknown':ourScore>theirScore?'win':ourScore<theirScore?'loss':'draw';
  return <section className="home-card home-cup" aria-labelledby="cup-title"><div className="home-card-heading"><h2 id="cup-title">Copa Argentina</h2></div>
    {fixture?<><div className="cup-scoreline"><TeamCrest provider="goal-api" externalId={fixture.home_external_id}/><strong className={`cup-result result-${outcome}`}>{finished?fixtureScore(fixture.home_score,fixture.away_score):'Sin resultado final'}</strong><TeamCrest provider="goal-api" externalId={fixture.away_external_id}/></div><p className="home-card-note">vs {opponentName??'Sin datos'}{round?` en ${round}`:''}</p></>:<p className="home-empty">Sin datos de fase o resultado verificado.</p>}
  </section>;
}

export default async function Page() {
  const [fixtures,standings]=await Promise.all([fixtureView(),dashboardStandingsSet()]);
  const now=standings.annual.checked_at;
  const {finished,upcoming}=dashboardFixtures(fixtures.data,now) as {finished:StoredFixture[];upcoming:StoredFixture[]};
  const starts=await teamStartsView(finished,primaryScope.externalTeamId,now);
  const latest=starts.latestLineup as LineupMatch|null;
  const coachName=reviewedHome.lineupCoaches.find(row=>row.provider===latest?.fixture.provider&&row.fixture_external_id===latest.fixture.external_id&&row.team_external_id===primaryScope.externalTeamId)?.name??null;
  const next=upcoming[0]??null;
  const rivalId=next?.home_external_id===primaryScope.externalTeamId?next.away_external_id??null:next?.away_external_id===primaryScope.externalTeamId?next.home_external_id??null:null;
  const rival=opponentLineupForNext(next,primaryScope.externalTeamId,{now});
  const cup=fixtures.data.filter(f=>f.provider==='goal-api').sort((a,b)=>(Date.parse(b.kickoff_at??'')||0)-(Date.parse(a.kickoff_at??'')||0))[0]??null;
  const league=pickLeagueView(standings,fixtures.data,now);
  return <div className="home-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="home-header"><div className="home-header-inner"><Link className="home-brand-art" href="/" aria-label="Inicio"><Image src="/brand/Leproso.png" alt="" width={1024} height={1536} priority/></Link><div className="home-header-right"><Link className="home-brand-name" href="/">Movete, leproso movete!</Link><nav aria-label="Secciones"><span aria-current="page">Home</span><span aria-disabled="true">Equipo</span><span aria-disabled="true">Partido en Vivo</span></nav></div></div></header>
    <main id="contenido" className="home-content"><h1 className="sr-only">Home de Newell&apos;s Old Boys</h1>
      <HomeNextMatch match={next}/>
      <HomeLineup match={latest} rival={rival} rivalId={rivalId} coachName={coachName} isLatestFinished={Boolean(latest&&latest.fixture.id===finished[0]?.id)} teamExternalId={primaryScope.externalTeamId}/>
      <div className="home-triple"><section className="home-card home-small" aria-labelledby="venue-title"><h2 id="venue-title">Estadio</h2><p>Nombre: Sin datos</p><p>Ubicación: Sin datos</p><p>Capacidad: Sin datos</p></section>
        <section className="home-card home-small" aria-labelledby="weather-title"><h2 id="weather-title">Pronóstico</h2><p>Tiempo: Sin datos</p><p>Temperatura: Sin datos</p><p>Descripción: Sin datos</p></section>
        <section className="home-card home-small" aria-labelledby="referee-title"><h2 id="referee-title">Árbitro</h2><p>Sin datos</p><p>{next?.home_team??'Local'} · V/E/D: Sin datos</p><p>{next?.away_team??'Visitante'} · V/E/D: Sin datos</p></section></div>
      <div className="home-pair home-last"><LeagueCard {...league}/><CupCard fixture={cup}/></div>
      <footer className="home-footer">Desarrollado por dM7.</footer>
    </main>
  </div>;
}
