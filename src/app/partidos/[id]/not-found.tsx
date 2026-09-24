import Link from 'next/link';
export default function MatchNotFound(){return <main><p className="eyebrow">FICHA DEL PARTIDO</p><h1>Partido no disponible</h1><p className="muted">No encontramos este partido entre los datos guardados del equipo.</p><Link className="detail-link" href="/">← Volver al tablero</Link></main>;}
