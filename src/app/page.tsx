import {fixtureView, type StoredFixture} from '@/server/db/fixture-view';
import {fixtureDate,fixtureScore,fixtureStatus,normalizedFixtureStatus,providerLabel} from './fixture-format.mjs';

export const dynamic='force-dynamic';

function FixtureList({title,fixtures}:{title:string;fixtures:StoredFixture[]}) {
  return <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6">
    <h2 className="mb-5 text-xl font-bold">{title}</h2>
    {!fixtures.length?<p className="text-neutral-400">Sin datos</p>:<ul className="divide-y divide-neutral-800">
      {fixtures.map(f=><li key={`${f.provider}:${f.id}`} className="py-5 first:pt-0 last:pb-0">
        <p className="text-xs text-neutral-400">{fixtureDate(f.kickoff_at)} · {fixtureStatus(normalizedFixtureStatus(f.provider,f.source_status))}</p>
        <p className="mt-1 text-xs text-neutral-400">{f.competition??'Competición sin datos'} · {providerLabel(f.provider)}</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="min-w-0 text-sm font-semibold leading-6"><p>{f.home_team??'Equipo sin datos'} <span className="font-normal text-neutral-500">(local)</span></p><p>{f.away_team??'Equipo sin datos'} <span className="font-normal text-neutral-500">(visitante)</span></p></div>
          <div className="shrink-0 text-right"><p className="text-lg font-bold tabular-nums">{fixtureScore(f.home_score,f.away_score)}</p>{(f.home_penalty_score!=null||f.away_penalty_score!=null)&&<p className="text-xs text-neutral-400">Penales: {fixtureScore(f.home_penalty_score,f.away_penalty_score)}</p>}</div>
        </div>
      </li>)}
    </ul>}
  </section>;
}

export default async function Page() {
  const snapshot=await fixtureView();
  const finished=snapshot.data.filter(f=>normalizedFixtureStatus(f.provider,f.source_status)==='finished').sort((a,b)=>(Date.parse(b.kickoff_at??'')||0)-(Date.parse(a.kickoff_at??'')||0));
  const scheduled=snapshot.data.filter(f=>normalizedFixtureStatus(f.provider,f.source_status)==='notstarted').sort((a,b)=>(Date.parse(a.kickoff_at??'')||Infinity)-(Date.parse(b.kickoff_at??'')||Infinity));
  const other=snapshot.data.filter(f=>!['finished','notstarted'].includes(normalizedFixtureStatus(f.provider,f.source_status)));
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-9 border-l-4 border-red-600 pl-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-400">MLeprosoM · Partidos</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Movete, Leproso Movete!</h1>
        <p className="mt-4 text-neutral-400">El fixture a mano. La memoria del hincha, con respaldo.</p>
      </header>
      <div className="mb-7 rounded-xl border border-neutral-800 p-4 text-sm" role="status">
        <p className={snapshot.status==='stale'?'font-semibold text-amber-300':'font-semibold text-neutral-200'}>{snapshot.label}</p>
        {snapshot.updatedAt&&<p className="mt-1 text-neutral-400">Última consulta de los datos mostrados: {fixtureDate(snapshot.updatedAt)}</p>}
        <p className="mt-1 text-neutral-400">Horarios de Argentina. Datos guardados; esta vista no es un seguimiento en vivo.</p>
        {snapshot.sources.map(s=><p key={s.provider} className="mt-1 text-neutral-400">{providerLabel(s.provider)}: {s.status==='error'?'No se pudo consultar':s.label}</p>)}
        {snapshot.status==='error'&&<p className="mt-2 text-red-300">No pudimos leer los partidos. Volvé a intentar más tarde.</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <FixtureList title="Partidos programados" fixtures={scheduled}/>
        <FixtureList title="Resultados guardados" fixtures={finished}/>
      </div>
      {other.length>0&&<div className="mt-6"><FixtureList title="Otros estados" fixtures={other}/></div>}
      <footer className="mt-8 text-xs text-neutral-500">Fuente indicada por partido. Tablas de posiciones pendientes de validación.</footer>
    </main>
  );
}
