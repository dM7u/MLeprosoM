import Image from 'next/image';
import Link from 'next/link';
import HomeNextMatch from './home-next-match';
import HomeLineup, {type LineupMatch} from './home-lineup';
import TeamCrest from './team-crest';
import {fixtureView,type StoredFixture} from '@/server/db/fixture-view';
import {dashboardStandingsSet,highlightedTeam,type TableView} from '@/server/db/dashboard-standings';
import {teamStartsView} from '@/server/db/team-starts-view';
import {dashboardFixtures,defaultTournament} from './dashboard-model.mjs';
import {fixtureDate,fixtureScore,providerLabel} from './fixture-format.mjs';
import primaryScope from '@/server/identity/reviewed-primary-scope.json';
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
  return <section className="home-card home-league" aria-labelledby="league-title"><div className="home-card-heading"><h2 id="league-title">Liga Profesional</h2><span>{label}</span></div>
    {row?<><div className="league-grid league-head"><span>Pos.</span><span>Equipo</span><span>J</span><span>G</span><span>E</span><span>P</span><span>PTS</span></div><div className="league-grid league-values"><strong>{row.calculated_position??'—'}</strong><span className="league-team"><TeamCrest provider="bsd" externalId={highlightedTeam}/><span>Newell&apos;s</span></span><span>{row.played}</span><span className="won">{row.won}</span><span>{row.drawn}</span><span className="lost">{row.lost}</span><strong>{row.pts}</strong></div><p className="home-card-note">Posición calculada · {view?.status==='stale'?'Datos desactualizados':view?.label??'Sin datos'} · Empates oficiales pendientes</p></>:<p className="home-empty">Sin datos de Newell&apos;s en el torneo en juego.</p>}
  </section>;
}

function CupCard({fixture}:{fixture:StoredFixture|null}) {
  const finished=fixture?.source_status==='FINISHED';
  return <section className="home-card home-cup" aria-labelledby="cup-title"><div className="home-card-heading"><h2 id="cup-title">Copa Argentina</h2><span>Newell&apos;s</span></div>
    {fixture?<><p className="cup-result">{finished?fixtureScore(fixture.home_score,fixture.away_score):'Sin resultado final'}</p><p className="home-card-note">{fixture.home_team??'Sin datos'} · {fixture.away_team??'Sin datos'} · {fixtureDate(fixture.kickoff_at)}</p><p className="home-card-note">Fase y situación en Copa: Sin datos verificados.</p></>:<p className="home-empty">Sin datos de fase o resultado verificado.</p>}
  </section>;
}

export default async function Page() {
  const [fixtures,standings]=await Promise.all([fixtureView(),dashboardStandingsSet()]);
  const now=standings.annual.checked_at;
  const {finished,upcoming}=dashboardFixtures(fixtures.data,now) as {finished:StoredFixture[];upcoming:StoredFixture[]};
  const starts=await teamStartsView(finished,primaryScope.externalTeamId,now);
  const latest=starts.latestLineup as LineupMatch|null;
  const next=upcoming[0]??null;
  const cup=fixtures.data.filter(f=>f.provider==='goal-api').sort((a,b)=>(Date.parse(b.kickoff_at??'')||0)-(Date.parse(a.kickoff_at??'')||0))[0]??null;
  const league=pickLeagueView(standings,fixtures.data,now);
  return <div className="home-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="home-header"><Link className="home-brand" href="/" aria-label="Movete, leproso movete! Inicio"><Image src="/brand/Leproso.png" alt="" width={1024} height={1536} priority/><span>Movete, leproso<br/>movete!</span></Link><nav aria-label="Secciones"><span aria-current="page">Home</span><span aria-disabled="true">Equipo</span><span aria-disabled="true">Partido en Vivo</span></nav></header>
    <main id="contenido" className="home-content"><h1 className="sr-only">Home de Newell&apos;s Old Boys</h1>
      <HomeNextMatch match={next}/>
      <HomeLineup match={latest} isLatestFinished={Boolean(latest&&latest.fixture.id===finished[0]?.id)} teamExternalId={primaryScope.externalTeamId}/>
      <div className="home-pair"><section className="home-card home-small" aria-labelledby="venue-title"><div className="home-card-heading"><h2 id="venue-title">Estadio</h2><strong>Pronóstico</strong></div><div className="home-info-line"><span>Ubicación: Sin datos</span><span>Tiempo: Sin datos</span></div><div className="home-info-line"><span>Capacidad: Sin datos</span><span>Descripción: Sin datos</span></div></section>
        <section className="home-card home-small" aria-labelledby="referee-title"><div className="home-card-heading"><h2 id="referee-title">Árbitro</h2><span>Sin datos</span></div><div className="home-info-line"><span>{next?.home_team??'Local'}</span><span>V/E/D: Sin datos</span></div><div className="home-info-line"><span>{next?.away_team??'Visitante'}</span><span>V/E/D: Sin datos</span></div></section></div>
      <div className="home-pair home-last"><LeagueCard {...league}/><CupCard fixture={cup}/></div>
      <p className="home-provenance">Partidos: {fixtures.label} · {fixtures.updatedAt?`Última lectura ${fixtureDate(fixtures.updatedAt)}`:'Sin fecha de actualización'} · Liga: cálculo propio · Fuentes: {fixtures.sources.map(s=>providerLabel(s.provider)).join(', ')||'Sin datos'}.</p>
      <footer className="home-footer"><Link href="/creditos">Créditos de escudos</Link>{latest&&<Link href={`/partidos/${encodeURIComponent(latest.fixture.id)}`}>Ficha del último XI guardado ↗</Link>}</footer>
    </main>
  </div>;
}
