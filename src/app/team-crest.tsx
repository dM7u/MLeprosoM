import Image from 'next/image';
import crests from './team-crests.json';

export default function TeamCrest({provider,externalId}:{provider:string;externalId:string|null|undefined}) {
  const src=externalId?(crests as Record<string,{path:string}>)[`${provider}:${externalId}`]?.path:undefined;
  return src?<Image className="team-crest" src={src} alt="" width={28} height={28}/>:null;
}
