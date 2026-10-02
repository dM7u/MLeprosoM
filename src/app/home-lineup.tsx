'use client';
import {useState} from 'react';
import TeamCrest from './team-crest';

type Player={external_id:string;name:string;jersey_number:number|null;position:string|null};
type Side={formation:string|null;starters:Player[]}|null;
export type LineupMatch={fixture:{id:string;provider:string;home_external_id?:string|null;away_external_id?:string|null;home_team:string|null;away_team:string|null;home_score:number|null;away_score:number|null;kickoff_at:string|null};data:{home:Side;away:Side};observedAt:string|null};

function rows(side:Side) {
  if(!side||side.starters.length!==11||side.starters[0]?.position!=='G')return null;
  const counts=side.formation?.split('-').map(Number);
  if(!counts?.length||counts.some(n=>!Number.isSafeInteger(n)||n<1)||counts.reduce((a,b)=>a+b,0)!==10)return null;
  let offset=1;
  const lines=counts.map(count=>{const line=side.starters.slice(offset,offset+count);offset+=count;return line;});
  return [...lines.reverse(),[side.starters[0]]];
}

function PlayerShirt({player}:{player:Player}) {
  const surname=player.name.trim().split(/\s+/).at(-1)??player.name;
  return <li className="pitch-player" title={player.name}><span className="pitch-shirt">{player.jersey_number??'—'}</span><span className="pitch-name">{surname}</span><small>Sin datos</small></li>;
}

export default function HomeLineup({match,isLatestFinished,teamExternalId}:{match:LineupMatch|null;isLatestFinished:boolean;teamExternalId:string}) {
  const [other,setOther]=useState(false);
  const side:Side=match?.data[other?(match.fixture.away_external_id===teamExternalId?'home':'away'):(match.fixture.home_external_id===teamExternalId?'home':'away')]??null;
  const opponent=match?(match.fixture.home_external_id===teamExternalId?{id:match.fixture.away_external_id,name:match.fixture.away_team}:{id:match.fixture.home_external_id,name:match.fixture.home_team}):null;
  const formation=side?.formation??'Sin datos';
  const score=match?.fixture.home_score==null||match.fixture.away_score==null?'Sin datos':`${match.fixture.home_score}–${match.fixture.away_score}`;
  const lines=rows(side);
  const opponentReady=Boolean(match?.data[match.fixture.home_external_id===teamExternalId?'away':'home']?.starters?.length===11);
  return <section className="home-lineup home-card" aria-labelledby="home-lineup-title"><div className="home-lineup-heading"><div><p className="home-kicker">{isLatestFinished?'Último partido':'Última alineación disponible'}</p><h2 id="home-lineup-title">Último 11 <span>· {formation} · {score}</span></h2></div>{opponentReady&&opponent&&<button type="button" className="rival-hold" aria-label={`Mantener pulsado para ver el último once de ${opponent.name??'rival'}`} aria-pressed={other} onPointerDown={()=>setOther(true)} onPointerUp={()=>setOther(false)} onPointerCancel={()=>setOther(false)} onPointerLeave={()=>setOther(false)} onKeyDown={event=>{if(event.key===' '||event.key==='Enter')setOther(true);}} onKeyUp={event=>{if(event.key===' '||event.key==='Enter')setOther(false);}} onContextMenu={event=>event.preventDefault()}><TeamCrest provider={match!.fixture.provider} externalId={opponent.id}/><span>{opponent.name??'Rival'}</span></button>}</div>
    {match&&<p className="home-lineup-source">{match.fixture.home_team??'Sin datos'} · {match.fixture.away_team??'Sin datos'} · {match.fixture.kickoff_at?new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(match.fixture.kickoff_at)):'Fecha sin datos'} · BSD</p>}
    {lines?<div className={`pitch ${other?'opponent':''}`} aria-label={`Esquema de ${other?opponent?.name:"Newell's"}. Delanteros arriba y arquero abajo.`}>{lines.map((line,index)=><ul className="pitch-row" key={index}>{line.map(player=><PlayerShirt key={player.external_id} player={player}/>)}</ul>)}</div>:<p className="home-empty">Sin datos de once inicial y formación confirmados.</p>}
    <p className="home-lineup-foot">Calificaciones de jugadores y técnico: Sin datos. {opponentReady?'Mantené pulsado el escudo para ver al rival.':''}</p>
  </section>;
}
