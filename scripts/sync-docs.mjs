import {copyFileSync, mkdirSync} from 'node:fs';
const root = new URL('../', import.meta.url);
mkdirSync(new URL('Fuentes/', root), {recursive:true});
for (const name of ['README.md','BACKLOG.md','ARQUITECTURA.md','MODELO_DE_DATOS.md','DATOS_EN_VIVO.md','PROVEEDORES.md']) {
  copyFileSync(new URL(name, root), new URL('Fuentes/'+name, root));
}
console.log('Fuentes actualizadas: 6 documentos');
