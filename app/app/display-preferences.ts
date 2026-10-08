'use client';
import {useEffect,useState} from 'react';
const key='onseo.display.v1';
function read(){try{const p=JSON.parse(localStorage.getItem(key)||'{}');return {font:[16,17,19,21].includes(p.font)?p.font:17,art:typeof p.art==='boolean'?p.art:true}}catch{return {font:17,art:true}}}
export function useDisplayPreferences(onError:(message:string)=>void){const [prefs,setPrefs]=useState({font:17,art:true});useEffect(()=>{setPrefs(read());const sync=(e:StorageEvent)=>{if(e.key===key||e.key===null)setPrefs(read())};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);function save(patch:Partial<typeof prefs>){const next={...read(),...patch};setPrefs(next);try{localStorage.setItem(key,JSON.stringify(next))}catch{onError('브라우저에서 저장을 허용하지 않아 새로고침하면 화면 설정이 초기화돼요.')}}return {...prefs,setFont:(font:number)=>{if([16,17,19,21].includes(font))save({font})},setArt:(art:boolean)=>save({art})};}
