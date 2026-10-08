import type {Character} from './lib/data';
export default function CharacterVisual({character,fallback,className}:{character:Character;fallback?:string;className?:string}){
 if(character.media?.type==='video')return <video className={className} src={character.media.url} controls muted playsInline preload="metadata" aria-label={character.name+' 인물 영상'}/>;
 const src=character.media?.url||character.portrait||fallback;
 return src?<img className={className} src={src} alt={character.name||'인물 이미지'}/>:<div className={className+' character-media-empty'}>미디어 없음</div>;
}
