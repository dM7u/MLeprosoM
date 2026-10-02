'use client';
import {useEffect,useState} from 'react';
import TeamCrest from './team-crest';

type Match={provider:string;home_external_id?:string|null;away_external_id?:string|null;home_team:string|null;away_team:string|null;kickoff_at:string|null};

export function localKickoff(value:string|null,now:Date,locale:string) {
  if(!value||!Number.isFinite(Date.parse(value)))return {time:'Sin datos',day:'Fecha sin confirmar'};
  const date=new Date(value);
  const time=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'}).format(date);
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const target=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const days=Math.round((target.getTime()-start.getTime())/86400000);
  const day=days===0?'Hoy':days===1?'Mañana':new Intl.DateTimeFormat(locale,{weekday:'short',day:'numeric',month:'short'}).format(date);
  return {time,day};
}

export default function HomeNextMatch({match}:{match:Match|null}) {
  const [local,setLocal]=useState<{time:string;day:string}|null>(null);
  useEffect(()=>{
    if(!match?.kickoff_at)return;
    const update=()=>setLocal(localKickoff(match.kickoff_at,new Date(),navigator.language||'es-ES'));
    update();const timer=setInterval(update,60000);return ()=>clearInterval(timer);
  },[match?.kickoff_at]);
  if(!match)return <section className="home-next home-card"><p className="home-kicker">Próximo partido</p><p className="home-empty">Sin datos de un próximo partido confirmado.</p></section>;
  return <section className="home-next home-card" aria-labelledby="home-next-title"><h2 id="home-next-title" className="sr-only">Próximo partido</h2>
    <div className="home-next-top"><TeamCrest provider={match.provider} externalId={match.home_external_id}/><strong suppressHydrationWarning>{local?.time??'Hora local'}</strong><TeamCrest provider={match.provider} externalId={match.away_external_id}/></div>
    <div className="home-next-bottom"><span>{match.home_team??'Sin datos'}</span><span suppressHydrationWarning>{local?.day??'Fecha local'}</span><span>{match.away_team??'Sin datos'}</span></div>
  </section>;
}
