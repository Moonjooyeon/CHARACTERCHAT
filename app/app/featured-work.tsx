'use client';
import {portraitImageProps} from './lib/portrait-images';
import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import { sampleWorks, portraitMeta, workHook, type Work } from './lib/data';

const features=['sample-female-quiet-bookbinder','sample-cold-editor','sample-female-final-curtain-bet','sample-dragon'].map(id=>sampleWorks.find(w=>w.id===id)).filter((w):w is Work=>!!w);
export default function FeaturedWork({ onOpen }: { onOpen: (work: Work) => void }) {
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true),[hidden,setHidden]=useState(false);
 useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(query.matches),visibility=()=>setHidden(document.hidden);motion();visibility();query.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);return()=>{query.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}},[]);
 const rotating=!paused&&!hover&&!focused&&!reduced&&!hidden;
 useEffect(()=>{if(!rotating)return;const timer=setInterval(()=>setIndex(n=>(n+1)%features.length),6500);return()=>clearInterval(timer)},[rotating,index]);
 const work=features[index];if(!work)return null;const portrait=portraitMeta(work.cover);
 function move(n:number){setIndex((n+features.length)%features.length)}
 return <section className="featured-work" aria-roledescription="carousel" aria-label="온서 추천 이야기" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}}>
 <div className="featured-copy" aria-live={rotating?'off':'polite'} aria-atomic="true"><span className="featured-label">추천 · {work.tag}</span><h1>{work.title}</h1><p className="featured-hook">{workHook(work)}</p><button className="featured-open" onClick={()=>onOpen(work)} aria-label={`${work.title} 작품 보기`}><span>작품 보기</span></button></div><div className="featured-art" key={work.id}><img className="featured-backdrop" src={work.cover} alt="" aria-hidden="true"/><img className="featured-character" src={work.cover} {...portraitImageProps(work.cover,'(max-width: 600px) 340px, 600px')} alt={`${work.characters[0].name} 일러스트`} width={portrait.width} height={portrait.height} loading="eager" decoding="async"/></div>
 <div className="featured-controls"><div className="featured-dots" aria-label="추천 이야기 선택">{features.map((w,i)=><button key={w.id} className={i===index?'active':''} aria-label={`${i+1}. ${w.title}`} aria-pressed={i===index} onClick={()=>move(i)}><span/></button>)}</div><span className="featured-count">{String(index+1).padStart(2,'0')} / {String(features.length).padStart(2,'0')}</span><button aria-label="이전 추천 이야기" onClick={()=>move(index-1)}><ChevronLeft size={18}/></button><button aria-label="다음 추천 이야기" onClick={()=>move(index+1)}><ChevronRight size={18}/></button><button aria-label={paused?'추천 자동 넘김 재생':'추천 자동 넘김 일시정지'} aria-pressed={paused} disabled={reduced} title={reduced?'기기의 동작 줄이기 설정으로 자동 넘김이 꺼져 있어요.':undefined} onClick={()=>setPaused(v=>!v)}>{paused||reduced?<Play size={15}/>:<Pause size={15}/>}</button></div></section>;
}
