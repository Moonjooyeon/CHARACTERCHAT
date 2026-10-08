'use client';
import {characterImage} from './lib/simulation-dialogue';
import {portraitImageProps} from './lib/portrait-images';
import {useEffect,useState} from 'react';
import {ChevronDown,Image as ImageIcon} from 'lucide-react';
import {portraitMeta,type Work} from './lib/data';
export default function ChatArt({work,unlocks,children,selected,onSelect,reveal=0}:{work:Work;unlocks:any[];children:React.ReactNode;selected:string;onSelect:(id:string)=>void;reveal?:number}){
 const [expanded,setExpanded]=useState(false),[failed,setFailed]=useState('');
 useEffect(()=>{if(reveal)setExpanded(true)},[reveal]);
 // Only the public cover and server-authorized unlocked image URLs reach this surface.
 const cast=work.characters.length>1?work.characters:[],character=cast.find(c=>'cast:'+c.id===selected),available=unlocks.filter(a=>a.unlocked&&a.image),asset=available.find(a=>a.id===selected),src=asset&&failed!==asset.id?asset.image:character?characterImage(work,character):work.cover;const displayName=character?.name||(cast.length?work.title:work.characters[0]?.name);
 return <aside className={'chat-art '+(expanded?'expanded':'')} aria-label="대화 캐릭터 이미지"><button className="chat-art-toggle" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}><ImageIcon size={17}/>{displayName} 이미지<ChevronDown size={17}/></button><div className="chat-art-stage"><img className="chat-art-image" src={src} {...portraitImageProps(src,'(max-width: 760px) 100vw, 43vw')} alt={asset?.title||displayName+' 캐릭터 이미지'} style={{objectPosition:asset?'50% 20%':portraitMeta(src).position}} onError={()=>{if(asset)setFailed(asset.id)}}/><div className="chat-art-caption"><span>{work.title}</span><strong>{displayName}</strong></div>{(available.length>0||cast.length>0)&&<label className="chat-art-select"><span>표시할 이미지</span><select aria-label="대화 옆 이미지 선택" value={asset||character?selected:'cover'} onChange={e=>{onSelect(e.target.value);setFailed('')}}><option value="cover">작품 표지</option>{cast.map(c=><option key={c.id} value={'cast:'+c.id}>{c.name} · 공개 캐릭터</option>)}{available.map(a=><option key={a.id} value={a.id}>{a.title} · 수집 완료</option>)}</select></label>}<details className="chat-art-details"><summary>작품 · 대화 정보<ChevronDown size={15}/></summary><div>{children}</div></details></div></aside>;
}
