import Link from 'next/link';
import {notFound} from 'next/navigation';
import {fixtureView} from '@/server/db/fixture-view';
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
  return <main className="match-page">
    <Link className="detail-link" href="/#partidos">← Volver al tablero</Link>
    <header className="page-header"><div><p className="eyebrow">FICHA DEL PARTIDO</p><h1>{match.home_team ?? 'Equipo sin datos'}<span className="match-versus"> vs. </span>{match.away_team ?? 'Equipo sin datos'}</h1><p className="muted">{match.competition ?? 'Competición sin datos'}{match.tournament?` · ${match.tournament.name} · Fecha ${match.tournament.round}`:''}</p></div></header>
    <section className="panel match-summary" aria-label="Resultado guardado"><p className="eyebrow">{fixtureStatus(status)}</p><p className="big-score">{fixtureScore(match.home_score,match.away_score)}</p><p className="muted">{fixtureDate(match.kickoff_at)} · Horario de Argentina</p><p className="fine">Local: {match.home_team ?? 'Sin datos'} · Visitante: {match.away_team ?? 'Sin datos'}</p></section>
    <div className={`data-notice ${source?.status==='stale'?'warning':''}`} role="status"><strong>{providerLabel(match.provider)} · {source?.label ?? 'Sin datos de vigencia'}</strong><span>Consulta del partido: {match.fetched_at?fixtureDate(match.fetched_at):'Sin datos'}</span><span>Datos guardados. Sin seguimiento en vivo.</span></div>
    {match.provider==='goal-api'&&<section className="panel"><h2>Desglose del marcador</h2><dl className="detail-grid"><div><dt>Tiempo reglamentario</dt><dd>{fixtureScore(match.home_fulltime_score,match.away_fulltime_score)}</dd></div><div><dt>Prórroga</dt><dd>{fixtureScore(match.home_extra_score,match.away_extra_score)}</dd></div><div><dt>Penales</dt><dd>{fixtureScore(match.home_penalty_score,match.away_penalty_score)}</dd></div></dl><p className="fine">Cada marcador se muestra por separado, tal como está guardado.</p></section>}
    <section className="panel match-coverage"><h2>Información del partido</h2><p className="muted">Esta ficha muestra la cobertura disponible en la app.</p><dl className="detail-grid">{['Alineaciones','Eventos','Estadísticas','Estadio','Árbitro','Clima'].map(label=><div key={label}><dt>{label}</dt><dd>Sin datos</dd></div>)}</dl></section>
    <footer>Movete, Leproso Movete! · La ausencia de información no representa un valor cero.</footer>
  </main>;
}
