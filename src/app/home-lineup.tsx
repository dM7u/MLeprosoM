'use client';
import {useState} from 'react';
import TeamCrest from './team-crest';
import labels from '@/server/identity/reviewed-league-labels.json';

type Player={external_id:string;name:string;jersey_number:number|null;position:string|null};
type Side={formation:string|null;starters:Player[]}|null;
export type LineupMatch={fixture:{id:string;external_id:string;provider:string;home_external_id?:string|null;away_external_id?:string|null;home_team:string|null;away_team:string|null;home_score:number|null;away_score:number|null;kickoff_at:string|null};data:{home:Side;away:Side};observedAt:string|null};
export type RivalLineup={team_external_id:string;formation:string;starters:Player[];fixture:{external_id:string;kickoff_at:string;home_external_id:string;away_external_id:string;home_team:string;away_team:string;home_score:number|null;away_score:number|null}};

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
  return <li className={`pitch-player ${player.position==='G'?'pitch-player--keeper':''}`} title={player.name}><span className="pitch-shirt"><span className="pitch-shirt-number">{player.jersey_number??'—'}</span></span><span className="pitch-name">{surname}</span></li>;
}

function resultState(fixture:LineupMatch['fixture']|RivalLineup['fixture']|undefined,teamId:string|null) {
  if(!fixture||!teamId||fixture.home_score==null||fixture.away_score==null)return 'unknown';
  const ourScore=fixture.home_external_id===teamId?fixture.home_score:fixture.away_external_id===teamId?fixture.away_score:null;
  const theirScore=fixture.home_external_id===teamId?fixture.away_score:fixture.away_external_id===teamId?fixture.home_score:null;
  return ourScore==null||theirScore==null?'unknown':ourScore>theirScore?'win':ourScore<theirScore?'loss':'draw';
}

export default function HomeLineup({match,rival,rivalId,coachName,isLatestFinished,teamExternalId}:{match:LineupMatch|null;rival:RivalLineup|null;rivalId:string|null;coachName:string|null;isLatestFinished:boolean;teamExternalId:string}) {
  const [other,setOther]=useState(false);
  const side:Side=other&&rival?{formation:rival.formation,starters:rival.starters}:match?.data[match.fixture.home_external_id===teamExternalId?'home':'away']??null;
  const opponent=match?(match.fixture.home_external_id===teamExternalId?{id:match.fixture.away_external_id,name:match.fixture.away_team}:{id:match.fixture.home_external_id,name:match.fixture.home_team}):null;
  const opponentLabel=labels.teams.find(team=>team.id===opponent?.id)?.label??opponent?.name??'rival';
  const rivalLabel=labels.teams.find(team=>team.id===rivalId)?.label??'rival';
  const rivalLastOpponent=rival?(rival.fixture.home_external_id===rivalId?{id:rival.fixture.away_external_id,name:rival.fixture.away_team}:{id:rival.fixture.home_external_id,name:rival.fixture.home_team}):null;
  const shownOpponent=other&&rivalLastOpponent?(labels.teams.find(team=>team.id===rivalLastOpponent.id)?.label??rivalLastOpponent.name):opponentLabel;
  const formation=side?.formation??'Sin datos';
  const shownFixture=other&&rival?rival.fixture:match?.fixture;
  const score=shownFixture?.home_score==null||shownFixture.away_score==null?'Sin datos':`${shownFixture.home_score}–${shownFixture.away_score}`;
  const outcome=resultState(shownFixture,other?rivalId:teamExternalId);
  const lines=rows(side);
  return <section className="home-lineup home-card" aria-labelledby="home-lineup-title"><div className="home-lineup-heading"><div><p className="home-kicker">{other?`Último 11 guardado de ${rivalLabel}`:isLatestFinished?'Último 11':'Último 11 disponible'}</p><h2 id="home-lineup-title"><span className="lineup-meta"><TeamCrest provider="bsd" externalId={other?rivalId:teamExternalId}/><span>Formación {formation} · Resultado <strong className={`result-${outcome}`}>{score}</strong> vs {shownOpponent}</span></span></h2></div>{rivalId&&<button type="button" className="rival-hold" aria-label={rival?`Mantener pulsado para ver el último once guardado de ${rivalLabel}`:`Sin datos del último once de ${rivalLabel}`} aria-pressed={other} disabled={!rival} onPointerDown={()=>setOther(true)} onPointerUp={()=>setOther(false)} onPointerCancel={()=>setOther(false)} onPointerLeave={()=>setOther(false)} onKeyDown={event=>{if(event.key===' '||event.key==='Enter')setOther(true);}} onKeyUp={event=>{if(event.key===' '||event.key==='Enter')setOther(false);}} onContextMenu={event=>event.preventDefault()}><TeamCrest provider="bsd" externalId={rivalId}/></button>}</div>
    {lines?<div className={`pitch ${other?'opponent':''}`} aria-label={`Esquema de ${other?rivalLabel:"Newell's"}. Delanteros arriba y arquero abajo.`}><div className="pitch-field" aria-hidden="true"><span className="pitch-mid-arc"/><span className="pitch-penalty-area"/><span className="pitch-goal-area"/></div>{lines.map((line,index)=><ul className="pitch-row" key={index}>{line.map(player=><PlayerShirt key={player.external_id} player={player}/>)}</ul>)}<span className="pitch-coach">DT: {other?'Sin datos':coachName??'Sin datos'}</span></div>:<p className="home-empty">Sin datos de once inicial y formación confirmados.</p>}
  </section>;
}
