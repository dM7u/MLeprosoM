import Link from 'next/link';
import {notFound} from 'next/navigation';
import {fixtureView} from '@/server/db/fixture-view';
import {statisticsViewForMatch} from '@/server/db/statistics-view';
import {lineupViewForMatch} from '@/server/db/lineup-view';
import {incidentViewForMatch} from '@/server/db/incident-view';
import {incidentLabel,incidentMinute} from '../../incident-format.mjs';
import {fixtureDate,fixtureScore,fixtureStatus,normalizedFixtureStatus,providerLabel} from '../../fixture-format.mjs';

export const dynamic = 'force-dynamic';

export default async function MatchPage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  // Reuse the team's scoped, read-only service. No provider request or arbitrary fixture lookup.
  const snapshot = await fixtureView();
  const match = snapshot.data.find(f => f.id === id);
  if (!match) {
    if (snapshot.status === 'error' || snapshot.status === 'partial' || snapshot.sources.some(s => s.status==='error' || s.status==='partial')) return <main><Link className="detail-link" href="/">← Volver al tablero</Link><h1>Sin datos</h1><p>No pudimos recuperar el partido. Volvé a intentar más tarde.</p></main>;
    notFound();
  }
  const source = snapshot.sources.find(s => s.provider === match.provider);
  const status = normalizedFixtureStatus(match.provider,match.source_status);
  const [statistics,lineups,events] = await Promise.all([statisticsViewForMatch(match),lineupViewForMatch(match),incidentViewForMatch(match)]);
  const metrics = [
    ['ball_possession','Posesión','%'],['total_shots','Tiros',''],['shots_on_target','Tiros al arco',''],
    ['corner_kicks','Córners',''],['fouls','Faltas',''],['offsides','Offsides',''],['passes','Pases',''],
    ['accurate_passes','Pases precisos',''],['pass_accuracy_pct','Precisión de pases','%'],
    ['yellow_cards','Amarillas',''],['red_cards','Rojas',''],
  ];
  return <main className="match-page">
    <Link className="detail-link" href="/#partidos">← Volver al tablero</Link>
    <header className="page-header"><div><p className="eyebrow">FICHA DEL PARTIDO</p><h1>{match.home_team ?? 'Equipo sin datos'}<span className="match-versus"> vs. </span>{match.away_team ?? 'Equipo sin datos'}</h1><p className="muted">{match.competition ?? 'Competición sin datos'}{match.tournament?` · ${match.tournament.name} · Fecha ${match.tournament.round}`:''}</p></div></header>
    <section className="panel match-summary" aria-label="Resultado guardado"><p className="eyebrow">{fixtureStatus(status)}</p><p className="big-score">{fixtureScore(match.home_score,match.away_score)}</p><p className="muted">{fixtureDate(match.kickoff_at)} · Horario de Argentina</p><p className="fine">Local: {match.home_team ?? 'Sin datos'} · Visitante: {match.away_team ?? 'Sin datos'}</p></section>
    <div className={`data-notice ${source?.status==='stale'?'warning':''}`} role="status"><strong>{providerLabel(match.provider)} · {source?.label ?? 'Sin datos de vigencia'}</strong><span>Consulta del partido: {match.fetched_at?fixtureDate(match.fetched_at):'Sin datos'}</span><span>Datos guardados. Sin seguimiento en vivo.</span></div>
    {match.provider==='goal-api'&&<section className="panel"><h2>Desglose del marcador</h2><dl className="detail-grid"><div><dt>Tiempo reglamentario</dt><dd>{fixtureScore(match.home_fulltime_score,match.away_fulltime_score)}</dd></div><div><dt>Prórroga</dt><dd>{fixtureScore(match.home_extra_score,match.away_extra_score)}</dd></div><div><dt>Penales</dt><dd>{fixtureScore(match.home_penalty_score,match.away_penalty_score)}</dd></div></dl><p className="fine">Cada marcador se muestra por separado, tal como está guardado.</p></section>}
    <nav className="match-sections" aria-label="Secciones del partido"><a href="#estadisticas">Estadísticas</a><a href="#alineaciones">Alineaciones</a><a href="#eventos">Eventos</a></nav>
    <section className="panel match-coverage" id="estadisticas"><h2>Estadísticas de equipo</h2>
      {statistics?.data ? <>
        <p className="fine">Fuente: BSD · Totales del partido · Datos del proveedor, sin contraste oficial independiente.</p>
        <div className={`data-notice ${statistics.status==='stale'?'warning':''}`} role="status"><strong>{statistics.status==='stale'?'Datos desactualizados':statistics.status==='partial'?'Datos parciales':'Datos actualizados'}</strong><span>Consulta de estadísticas: {fixtureDate(statistics.updatedAt)}</span></div>
        {statistics.lastObservedAt!==statistics.updatedAt&&<p className="fine">Se conservó la última información útil. Último intento: {fixtureDate(statistics.lastObservedAt)}.</p>}
        <div className="table-scroll" tabIndex={0} aria-label="Estadísticas comparadas"><table className="match-statistics"><thead><tr><th scope="col">Métrica</th><th scope="col">{match.home_team??'Local'}</th><th scope="col">{match.away_team??'Visitante'}</th></tr></thead><tbody>{metrics.map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th>{['home','away'].map(side=><td key={side}>{statistics.data[side][key]===null?'Sin datos':`${statistics.data[side][key]}${unit}`}</td>)}</tr>)}</tbody></table></div>
      </> : <p className="empty">{statistics?.status==='error'?'Sin datos: no pudimos recuperar las estadísticas.':'Sin datos de estadísticas guardadas para este partido.'}</p>}
    </section>
    <section className="panel match-coverage lineup-panel" id="alineaciones"><h2>Alineaciones</h2>{lineups?.data?<>
      <p className="fine">Confirmadas por BSD · Sin contraste oficial independiente.</p>
      <div className={`data-notice ${lineups.status==='stale'?'warning':''}`}><strong>{lineups.status==='stale'?'Datos desactualizados':lineups.status==='partial'?'Datos parciales':'Datos actualizados'}</strong><span>Consulta de alineaciones: {fixtureDate(lineups.updatedAt)}</span></div>
      {lineups.lastObservedAt!==lineups.updatedAt&&<p className="fine">Se conserva la última alineación útil. Última observación: {fixtureDate(lineups.lastObservedAt)}.</p>}
      <div className="matches-grid">{(['home','away'] as const).map(side=>{
        const team=lineups.data[side];
        type Player={external_id:string;name:string;position:string|null;jersey_number:number|null;captain:boolean|null};
        const players=(list:Player[]|null)=>list===null?<p className="muted">Sin datos</p>:list.length===0?<p className="muted">Sin jugadores informados.</p>:<ul>{list.map(player=><li key={player.external_id}>{player.jersey_number===null?'Dorsal sin datos':`#${player.jersey_number}`} · {player.name}{player.captain===true?' (C)':''}</li>)}</ul>;
        return <div key={side}><h3>{side==='home'?match.home_team:match.away_team}</h3><p className="fine">{side==='home'?'Local':'Visitante'} · Formación: {team.formation??'Sin datos'}</p><h4>Titulares ({team.starters.length})</h4>{players(team.starters)}<h4>Suplentes{team.substitutes===null?'':` (${team.substitutes.length})`}</h4>{players(team.substitutes)}</div>;
      })}</div>
    </>:<p className="empty">{lineups?.status==='error'?'Sin datos: no pudimos recuperar las alineaciones.':'Sin datos de alineaciones confirmadas guardadas.'}</p>}</section>
    <section className="panel match-coverage" id="eventos"><h2>Eventos del partido</h2>{events?.data?<>
      <p className="fine">Fuente: BSD · Orden del proveedor · Cobertura sin verificar · Sin seguimiento en vivo.</p>
      <div className={`data-notice ${events.status==='stale'?'warning':''}`}><strong>{events.status==='stale'?'Datos desactualizados':events.status==='partial'?'Datos parciales':'Datos actualizados'}</strong><span>Consulta de eventos: {fixtureDate(events.updatedAt)}</span></div>
      {events.lastObservedAt!==events.updatedAt&&<p className="fine">Se conserva una lista anterior; la última observación no aportó eventos utilizables. Último intento: {fixtureDate(events.lastObservedAt)}.</p>}
      <ol className="incident-list">{events.data.incidents.map((event:{source_index:number;type:string;source_type:string;minute:number|null;added_time:number|null;side:string|null;partial:boolean})=><li key={event.source_index}><strong>{incidentMinute(event)}</strong><div><p>{incidentLabel(event)}</p>{event.side&&<small>{event.side==='home'?match.home_team:match.away_team}</small>}{event.partial&&<small> · Datos parciales</small>}</div></li>)}</ol>
    </>:<p className="empty">{events?.status==='error'?'Sin datos: no pudimos recuperar los eventos.':'Sin datos de eventos guardados. Esto no indica que el partido no haya tenido incidencias.'}</p>}</section>
    <section className="panel match-coverage"><h2>Información del partido</h2><p className="muted">Esta ficha muestra la cobertura disponible en la app.</p><dl className="detail-grid">{['Estadio','Árbitro','Clima'].map(label=><div key={label}><dt>{label}</dt><dd>Sin datos</dd></div>)}</dl></section>
    <footer>Movete, Leproso Movete! · La ausencia de información no representa un valor cero.</footer>
  </main>;
}
