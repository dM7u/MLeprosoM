'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {fixtureDate} from './fixture-format.mjs';
type XiView={status:string;reason:string|null;expiresAt:number|null;data:{starters:string[];sources:{revision_id:string;url:string;outlet:string;published_at:string|null;claim:string}[]}|null};
export default function PossibleXi({view,matchId}:{view:XiView;matchId?:string}) {
  const [expired,setExpired]=useState(false);
  useEffect(()=>{
    const expiry=view.expiresAt;
    if(expiry===null)return;
    let timer:ReturnType<typeof setTimeout>;
    const check=()=>{clearTimeout(timer);const remaining=expiry-Date.now();setExpired(remaining<=0);if(remaining>0)timer=setTimeout(check,Math.min(remaining,60000));};
    check();window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return ()=>{clearTimeout(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[view.expiresAt]);
  const data=!expired&&view.status==='available'?view.data:null;
  return <section className="panel lineup-panel" aria-labelledby="possible-xi-heading"><p className="eyebrow">PRÓXIMO PARTIDO · NEWELL’S</p><h2 id="possible-xi-heading">Posible XI</h2>
    {data?<><p className="fine">Versión periodística · No es una alineación oficial. Nombres sin formación inferida.</p><ul>{data.starters.map(name=><li key={name}>{name}</li>)}</ul>{data.sources.map(source=><p className="table-note" key={source.revision_id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.outlet}</a> · Publicado: {fixtureDate(source.published_at)} · {source.claim==='confirmed_by_outlet'?'El medio lo presenta como confirmado':'Probable según el medio'}</p>)}</>:<div className="empty" role="status"><strong>Sin datos</strong><p>{expired?'La información perdió vigencia.':view.status==='error'?'No pudimos consultar las formaciones guardadas.':view.reason==='stale_context'?'El contexto del partido está desactualizado.':view.reason==='provider_lineup'?'Hay alineaciones del proveedor guardadas; consultá su estado en la ficha.':'No hay un posible XI vigente y verificado para mostrar.'}</p></div>}
    <p className="fine">Vigencia máxima: 48 horas desde la publicación, hasta el inicio del partido. Fuente y fecha en horario de Argentina. Sin actualización en vivo.</p>
    {matchId&&<Link className="detail-link" prefetch={false} href={`/partidos/${encodeURIComponent(matchId)}#alineaciones`}>Ver alineaciones en la ficha ↗</Link>}
  </section>;
}

