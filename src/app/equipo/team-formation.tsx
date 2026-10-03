"use client";
import {useState} from 'react';

type FormationPlayer={id:string;name:string;jersey_number:number|null;position:string|null;starts:number};
type FormationLineup={formation:string;starts:number;starters:FormationPlayer[]}|null;

function UsedFormation({lineup}:{lineup:FormationLineup}) {
  if(!lineup)return <p className="home-empty">Sin datos para ubicar un once único en la formación más usada.</p>;
  const counts=lineup.formation.split('-').map(Number);
  if(lineup.starters.length!==11||counts.reduce((total,n)=>total+n,0)!==10)return <p className="home-empty">Sin datos de formación verificada.</p>;
  let offset=1;
  const rows=counts.map(count=>{const players=lineup.starters.slice(offset,offset+count);offset+=count;return players.reverse();});
  rows.reverse();
  rows.push([lineup.starters[0]]);
  return <div className="pitch team-formation" aria-label={`Once por puestos en formación ${lineup.formation}. Delanteros arriba y arquero abajo.`}><div className="pitch-field" aria-hidden="true"><span className="pitch-mid-arc"/><span className="pitch-penalty-area"/><span className="pitch-goal-area"/></div>{rows.map((row,index)=><ul className="pitch-row" key={index}>{row.map(player=><li className={`pitch-player ${player.position==='G'?'pitch-player--keeper':''}`} key={player.id} title={`${player.name}: ${player.starts} titularidades en el puesto`}><span className="pitch-shirt"><span className="pitch-shirt-number">{player.jersey_number??'—'}</span></span><span className="pitch-name">{player.name.trim().split(/\s+/).at(-1)}</span><small>{player.starts} PJ · media: Sin datos</small></li>)}</ul>)}</div>;
}

type Mode='best'|'worst'|'used';
const modes:{id:Mode;label:string}[]=[{id:'best',label:'Mejor 11'},{id:'worst',label:'Peor 11'},{id:'used',label:'Más utilizados'}];

export default function TeamFormation({lineup,coveredCount,finishedCount}:{lineup:FormationLineup;coveredCount:number;finishedCount:number}) {
  const [mode,setMode]=useState<Mode>('best');
  const title=modes.find(item=>item.id===mode)?.label??'Mejor 11';
  const description=mode==='used'?`Formación inicial más frecuente: ${lineup?`${lineup.starts} de ${coveredCount}`:'Sin datos'}. Titularidades por puesto; empate resuelto por la más reciente.`:'Calificaciones por puesto: Sin datos.';
  return <section className="home-card team-most-used" aria-labelledby="team-xi-title"><div className="home-card-heading"><h2 id="team-xi-title">{title} · {lineup?.formation??'Sin datos'}</h2><span>{coveredCount}/{finishedCount} partidos con titulares utilizables</span></div><div className="team-xi-tabs" role="group" aria-label="Vistas del once">{modes.map(item=><button key={item.id} type="button" aria-pressed={mode===item.id} onClick={()=>setMode(item.id)}>{item.label}</button>)}</div><p className="team-subtitle">{description}</p><div aria-live="polite">{mode==='used'?<UsedFormation lineup={lineup}/>:<div className="pitch team-formation team-formation-empty"><div className="pitch-field" aria-hidden="true"><span className="pitch-mid-arc"/><span className="pitch-penalty-area"/><span className="pitch-goal-area"/></div><p>Sin datos de calificaciones para seleccionar el {title.toLowerCase()}.</p></div>}</div></section>;
}
