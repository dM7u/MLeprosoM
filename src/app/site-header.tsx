import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader({section,live=false}:{section:'home'|'team';live?:boolean}) {
  return <header className="home-header"><div className="home-header-inner"><Link className="home-brand-art" href="/" aria-label="Inicio"><Image src="/brand/Leproso.png" alt="" width={1024} height={1536} priority/></Link><div className="home-header-right"><Link className="home-brand-name" href="/">Movete, leproso movete!</Link><nav aria-label="Secciones"><Link href="/" aria-current={section==='home'?'page':undefined}>Home{live&&<span className="home-live-dot" aria-label="Partido en vivo"/>}</Link><Link href="/equipo" aria-current={section==='team'?'page':undefined}>Equipo</Link></nav></div></div></header>;
}
