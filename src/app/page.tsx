import PossibleXi from './possible-xi';
import {upcomingXiView} from '@/server/editorial/upcoming-xi-view';
import Link from 'next/link';
import Image from 'next/image';
import TeamCrest from './team-crest';
import {fixtureView, type StoredFixture} from '@/server/db/fixture-view';
import {dashboardStandingsSet, highlightedTeam, type TableView} from '@/server/db/dashboard-standings';
import {dashboardFixtures,defaultTournament} from './dashboard-model.mjs';
import {standingsContext,matchupStandings,selectMatchupTournament} from './standings-context.mjs';
import primaryScope from '@/server/identity/reviewed-primary-scope.json';
import {teamStartsView} from '@/server/db/team-starts-view';
import {fixtureDate,fixtureScore,fixtureStatus,normalizedFixtureStatus,providerLabel} from './fixture-format.mjs';
export const dynamic='force-dynamic';

function FixtureCard({fixture:f}:{fixture:StoredFixture}) {
  return <article className="match-card">
    <p className="eyebrow">{f.tournament?.name ?? f.competition ?? 'Competición sin datos'}{f.tournament ? ` · Fecha ${f.tournament.round}` : ''}</p>
    <p className="match-date">{fixtureDate(f.kickoff_at)}</p>
    <div className="match-teams"><span><TeamCrest provider={f.provider} externalId={f.home_external_id}/>{f.home_team ?? 'Equipo sin datos'}<small>Local</small></span><strong>{fixtureScore(f.home_score,f.away_score)}</strong><span><TeamCrest provider={f.provider} externalId={f.away_external_id}/>{f.away_team ?? 'Equipo sin datos'}<small>Visitante</small></span></div>
    <p className="fine">{fixtureStatus(normalizedFixtureStatus(f.provider,f.source_status))} · {providerLabel(f.provider)}</p>
    {(f.home_penalty_score!=null||f.away_penalty_score!=null)&&<p className="fine">Penales: {fixtureScore(f.home_penalty_score,f.away_penalty_score)}</p>}
    <Link className="detail-link" prefetch={false} href={`/partidos/${encodeURIComponent(f.id)}`}>Ver ficha del partido <span aria-hidden="true">↗</span></Link>
  </article>;
}
function Matches({title,rows}:{title:string;rows:StoredFixture[]}) {
  return <section className="panel"><h2>{title}</h2>{rows.length?rows.map(f=><FixtureCard key={`${f.provider}:${f.id}`} fixture={f}/>):<p className="empty">Sin datos</p>}</section>;
}
function FrequentStarters({view}:{view:Awaited<ReturnType<typeof teamStartsView>>}) {
  return <section className="panel" aria-labelledby="starters-heading"><p className="eyebrow">PANEL DE NEWELL’S · DATOS GUARDADOS</p><h2 id="starters-heading">Titularidades más frecuentes</h2>
    {view.status==='available'?<><p className="fine">Partidos con once titulares identificados: {view.coveredCount} de {view.finishedCount} terminados de liga. Conteo propio sobre alineaciones confirmadas por BSD.</p>
      <ol className="starters-list">{view.certain.map(player=><li key={player.id}><span>{player.name}</span><strong>{player.starts} titularidades</strong></li>)}</ol>
      {view.tied.length>view.places?<><p className="table-note">Persisten {view.tied.length} jugadores empatados para {view.places} lugares: comparten titularidades y fecha de última titularidad. No hay once únicos con esta muestra.</p><ul className="starters-list">{view.tied.map(player=><li key={player.id}><span>{player.name}</span><strong>{player.starts} titularidades</strong></li>)}</ul></>:<ol className="starters-list" start={view.certain.length+1}>{view.tied.map(player=><li key={player.id}><span>{player.name}</span><strong>{player.starts} titularidades</strong></li>)}</ol>}
      <p className="table-note">Igual cantidad de titularidades: primero quien fue titular más recientemente, según la fecha del partido. Muestra incompleta; las alineaciones se recibieron después de los partidos. Última observación guardada: {view.observedAt?fixtureDate(view.observedAt):'Sin datos'}.</p></>:<p className="empty">{view.status==='error'?'No pudimos consultar las alineaciones guardadas.':'Sin datos de titularidades confirmadas.'}</p>}
  </section>;
}
function Positions({view}:{view:TableView}) {
  if(!view.snapshot)return <div className="empty" role="status"><strong>Sin datos</strong><p>{view.status==='error'?'No pudimos consultar la tabla. Volvé a intentar más tarde.':'No hay una tabla habilitada para esta selección.'}</p></div>;
  const names=new Map(view.teams?.map(t=>[t.id,t.label]));
  return <><p className="mobile-scroll-hint">Deslizá la tabla para ver todas las columnas →</p><div className="table-scroll" tabIndex={0} aria-label="Tabla de posiciones, desplazamiento horizontal"><table><caption className="sr-only">Posiciones calculadas. Ajustes oficiales sin verificar.</caption><thead><tr>{['Pos.*','Equipo','PJ','G','E','P','GF','GC','DG','PTS'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{view.snapshot.rows.map(r=><tr key={r.team_id} className={r.team_id===highlightedTeam?'our-team':''}><td>{r.calculated_position??'Empate'}</td><th scope="row"><span className="team-label"><TeamCrest provider="bsd" externalId={r.team_id}/>{names.get(r.team_id)??'Sin datos'}</span></th>{[r.played,r.won,r.drawn,r.lost,r.gf,r.ga,r.gd,r.pts].map((v,i)=><td key={i}>{v??'Sin datos'}</td>)}</tr>)}</tbody></table></div></>;
}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [snapshot,standings,params]=await Promise.all([fixtureView(),dashboardStandingsSet(),searchParams]);
  const annual=standings.annual;
  const now=annual.checked_at;
  const {finished,upcoming,unresolved}=dashboardFixtures(snapshot.data,now) as {finished:StoredFixture[];upcoming:StoredFixture[];unresolved:StoredFixture[]};
  const [xi,starts]=await Promise.all([upcomingXiView(upcoming[0],snapshot.status==='fresh'&&snapshot.sources.every(source=>source.status==='fresh')),teamStartsView(finished,primaryScope.externalTeamId,now)]);
  const tournaments=[...new Set(annual.selections?.flatMap(s=>s.tournament?[s.tournament]:[])??[])];
  const requested=typeof params.table==='string'?params.table:undefined;
  const selected=requested && [...tournaments,'Anual','Promedios'].includes(requested)?requested:defaultTournament(snapshot.data,tournaments,now);
  const groups=annual.selections?.filter(s=>s.tournament===selected&&s.group).map(s=>s.group!)??[];
  const group=typeof params.zone==='string'&&groups.includes(params.zone)?params.zone:undefined;
  const view=selected==='Anual'||selected==='Promedios'?annual:standings.select({kind:'tournament',tournament:selected,...(group?{group}:{})});
  const contextRows=standingsContext(view.snapshot?.rows,highlightedTeam);
  const {tournament:nextTournament,view:nextTournamentView}=selectMatchupTournament(upcoming[0],annual.selections,standings.select);
  const opponentRows=matchupStandings(nextTournamentView?.snapshot?.rows,upcoming[0],primaryScope);
  const href=(table:string,zone?:string)=>`/?${new URLSearchParams({table,...(zone?{zone}:{})})}#tablas`;
  return <div className="app-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a><aside className="sidebar"><Link href="/" className="brand" aria-label="Movete, Leproso Movete! — Inicio"><Image className="brand-art" src="/brand/Leproso.png" alt="" width={1024} height={1536} sizes="(max-width: 640px) 42px, 120px" priority/><span>Movete, Leproso<br/>Movete!</span></Link><p className="sidebar-label">EL TABLERO DEL HINCHA</p><nav aria-label="Navegación principal"><a href="#contenido">↗ Resumen</a><a href="#partidos">◷ Partidos</a><a href="#tablas">▤ Tablas</a></nav><p className="sidebar-note">Rojo y negro.<br/>Los números, a la vista.</p></aside>
    <main id="contenido"><header className="page-header"><div><p className="eyebrow">NEWELL’S OLD BOYS / EL TABLERO</p><h1>La Lepra, en números.</h1><p className="muted">Para discutir con datos. La pasión ya la tenemos.</p></div><span className="badge">Actualización manual</span></header>
      <section className="hero"><div><p className="eyebrow">PRÓXIMO PARTIDO GUARDADO</p><h2>Otra fecha.<br/>{" "}<span>La misma camiseta.</span></h2><p className="fine">Horarios de Argentina · Sin seguimiento en vivo</p></div><div>{upcoming[0]?<FixtureCard fixture={upcoming[0]}/>:<p className="empty">Sin datos de un próximo partido con fecha futura confirmada.</p>}</div></section>
      <div className={`data-notice ${snapshot.status==='stale'?'warning':''}`} role="status"><strong>Partidos · {snapshot.label}</strong><span>{snapshot.updatedAt?`Consultados: ${fixtureDate(snapshot.updatedAt)}`:'Sin fecha de actualización'}</span>{snapshot.sources.map(s=><span key={s.provider}>{providerLabel(s.provider)}: {s.status==='error'?'No se pudo consultar':s.label}</span>)}{snapshot.status==='error'&&<span>No pudimos leer los partidos.</span>}</div>
      <PossibleXi view={xi} matchId={upcoming[0]?.id}/>
      {upcoming[0]&&<section className="panel" aria-labelledby="opponent-heading"><p className="eyebrow">PRÓXIMO PARTIDO · {nextTournament?`TABLA GENERAL DEL ${nextTournament.toUpperCase()}`:'TABLA SIN DATOS'}</p><h2 id="opponent-heading">Newell’s y el próximo rival</h2>{opponentRows.length===2&&nextTournamentView?.snapshot?<><div className={`data-notice ${nextTournamentView.status==='stale'?'warning':''}`}><strong>{nextTournamentView.label}</strong>{nextTournamentView.results_as_of&&<span>Resultados observados: {fixtureDate(nextTournamentView.results_as_of)}</span>}</div><Positions view={{...nextTournamentView,snapshot:{...nextTournamentView.snapshot,rows:opponentRows}}}/><p className="table-note">Local primero, visitante después. Posiciones calculadas en {nextTournament}, no oficiales; empates y ajustes disciplinarios pendientes. No representa la posición al momento del futuro partido.</p></>:<p className="empty">Sin datos de una tabla del torneo verificado compatible para ambos equipos.</p>}</section>}
      <div className="matches-grid" id="partidos"><Matches title="Últimos 3 partidos" rows={finished.slice(0,3)}/><Matches title="Próximos 3 partidos" rows={upcoming.slice(0,3)}/></div>
      <FrequentStarters view={starts}/>
      <div className="matches-grid"><section className="panel"><h2>Estadísticas de jugadores</h2><p className="empty">Sin datos individuales guardados.</p></section><section className="panel"><h2>Técnico</h2><p className="empty">Sin datos del técnico ni metodología validada para un rating.</p></section></div>
      {selected!=='Promedios'&&<section className="panel" aria-labelledby="context-heading"><p className="eyebrow">{selected}{group?` · Zona ${group}`:' · General'}</p><h2 id="context-heading">Newell’s y su entorno en la tabla</h2><div className={`data-notice ${view.status==='stale'?'warning':''}`}><strong>{view.label}</strong>{view.results_as_of&&<span>Resultados observados: {fixtureDate(view.results_as_of)}</span>}</div>{contextRows.length&&view.snapshot?<Positions view={{...view,snapshot:{...view.snapshot,rows:contextRows}}}/>:<p className="empty">Sin datos de Newell’s en esta selección.</p>}<p className="table-note">Filas contiguas en el orden de la tabla seleccionada. Posiciones calculadas, no oficiales; los empates pendientes no determinan quién está por encima o por debajo. Ajustes disciplinarios sin verificar.</p></section>}
      <section className="panel standings" id="tablas"><div className="section-heading"><div><p className="eyebrow">EL CONTEXTO DE LA FECHA</p><h2>Tablas de la liga</h2></div><span className="badge">Cálculo propio</span></div><nav className="tabs" aria-label="Seleccionar tabla">{[...new Set([...tournaments,'Anual','Promedios'])].map(t=><Link prefetch={false} key={t} className={t===selected?'selected':''} aria-current={t===selected?'page':undefined} href={href(t)}>{t}</Link>)}</nav>
      {selected==='Promedios'?<div className="empty"><strong>Sin datos</strong><p>Promedios y contexto de descenso pendientes de validación.</p></div>:<><nav className="zone-tabs" aria-label="Seleccionar zona">{groups.length>0&&[undefined,...groups].map(g=><Link prefetch={false} key={g??'general'} className={g===group?'selected':''} aria-current={g===group?'page':undefined} href={href(selected,g)}>{g?`Zona ${g}`:'General'}</Link>)}</nav><div className={`data-notice ${view.status==='stale'?'warning':''}`} role="status"><strong>{view.label}</strong>{view.results_as_of&&<span>Resultados observados: {fixtureDate(view.results_as_of)}</span>}</div><Positions view={view}/><p className="table-note">* Posición calculada, no oficial. Ajustes disciplinarios sin verificar. Los empates pendientes no reciben una posición inventada.</p></>}
      </section><details className="panel archive"><summary>Ver todos los partidos guardados ({snapshot.data.length})</summary><div className="matches-grid"><Matches title="Resultados" rows={finished}/><Matches title="Programados" rows={upcoming}/></div>{unresolved.length>0&&<Matches title="Fecha pendiente u otros estados" rows={unresolved}/>}</details><footer>Movete, Leproso Movete! · Fuentes externas identificadas por partido. Tablas calculadas a partir de resultados BSD contrastados con LPF. · <Link href="/creditos">Créditos de escudos</Link></footer>
    </main></div>;
}
