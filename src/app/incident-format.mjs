/** Pure presentation of normalized facts; never calculates a score or playing time. */
export function incidentLabel(row) {
  const name=p=>p?.name??'Jugador sin datos';
  switch(row.type){
    case 'goal':return `Gol · ${name(row.player)}${row.subtype&&row.subtype!=='regular'?` · Tipo de fuente: ${row.subtype}`:''}`;
    case 'card':return `${row.subtype==='yellow'?'Amarilla':row.subtype==='red'?'Roja':'Tarjeta (tipo sin interpretar)'} · ${name(row.player)}`;
    case 'substitution':return `Entra ${name(row.player_in)} · Sale ${name(row.player_out)}`;
    case 'period':return row.period==='HT'?'Entretiempo':row.period==='FT'?'Final del partido':`Período: ${row.period??'Sin datos'}`;
    case 'injuryTime':return row.length===null?'Descuento anunciado: Sin datos':`Descuento anunciado: ${row.length} min`;
    default:return `Evento sin interpretar: ${row.source_type}`;
  }
}
export function incidentMinute(row) {
  return row.minute===null?'Minuto sin datos':`${row.minute}${row.added_time===null?'':`+${row.added_time}`}′`;
}
