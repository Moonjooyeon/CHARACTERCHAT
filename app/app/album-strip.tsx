'use client';
import {useState} from 'react';
import type {Work} from './lib/data';
import {characterImage} from './lib/simulation-dialogue';
export default function AlbumStrip({work,unlocks=[]}:{work:Work;unlocks?:any[]}){const [selected,setSelected]=useState<any>(null);const items=[...work.characters.map((c,i)=>({id:c.id||'cast-'+i,title:c.name,image:characterImage(work,c),unlocked:true})),...unlocks];return <><div className="drawer-album-strip">{items.map(a=><button key={a.id} disabled={!a.unlocked} onClick={()=>setSelected(a)} aria-label={a.title+(a.unlocked?' 크게 보기':' · 잠김')}>{a.unlocked&&a.image?<img src={a.image} alt={a.title}/>:<span className="album-locked"><span>잠김</span></span>}</button>)}</div>{selected&&<section className="album-enlarged"><div className="section-heading"><strong>{selected.title}</strong><button className="text-button" onClick={()=>setSelected(null)}>큰 이미지 닫기</button></div><img src={selected.image} alt={selected.title}/></section>}</>}
