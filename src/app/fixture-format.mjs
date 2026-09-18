export function fixtureDate(value) {
  if(!value || !Number.isFinite(Date.parse(value))) return 'Fecha sin confirmar';
  return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
}
export function fixtureScore(home,away) {
  return home===null||away===null||home===undefined||away===undefined?'Sin datos':`${home} – ${away}`;
}
export function fixtureStatus(status) {
  return ({finished:'Finalizado',notstarted:'Programado',postponed:'Postergado',cancelled:'Cancelado'})[status]??'Estado sin confirmar';
}
