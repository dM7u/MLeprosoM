import Link from 'next/link';
import crests from '../team-crests.json';

export default function CreditsPage(){
  return <main className="match-page"><Link className="detail-link" href="/">← Volver al tablero</Link>
    <header className="page-header"><div><p className="eyebrow">IDENTIDAD VISUAL</p><h1>Créditos de escudos</h1><p className="muted">Escudos usados para identificar equipos. MLeprosoM es un proyecto independiente de los clubes.</p></div></header>
    <section className="panel"><ul className="credits-list">{Object.entries(crests).map(([id,crest])=><li key={id}><strong>{crest.team}</strong><a href={crest.source} target="_blank" rel="noopener noreferrer">Ficha de origen ↗</a><span>{crest.license_note}</span></li>)}</ul></section>
  </main>;
}
