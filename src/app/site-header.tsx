import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader({section}:{section:'home'|'team'|'live'}) {
  return <header className="home-header"><div className="home-header-inner"><Link className="home-brand-art" href="/" aria-label="Inicio"><Image src="/brand/Leproso.png" alt="" width={1024} height={1536} priority/></Link><div className="home-header-right"><Link className="home-brand-name" href="/">Movete, leproso movete!</Link><nav aria-label="Secciones"><Link href="/" aria-current={section==='home'?'page':undefined}>Home</Link><Link href="/equipo" aria-current={section==='team'?'page':undefined}>Equipo</Link><span aria-disabled="true">Partido en Vivo</span></nav></div></div></header>;
}
