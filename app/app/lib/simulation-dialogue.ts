import {sampleNarration,acceptedCovers,type Work,type Character} from './data';
export function characterImage(work:Work,character?:Character){return character?.media?.type==='image'?character.media.url:character?.portrait&&acceptedCovers.includes(character.portrait)?character.portrait:work.cover;}
export function characterAge(character:Character){return character.ageLabel||(typeof character.age==='number'?character.age+'세':'나이 미설정');}
export function scriptedTurnText(work:Work,turn:{characterId:string;content:string}){const character=work.characters.find(c=>c.id===turn.characterId);return character?`${character.name}: ${turn.content}`:turn.content;}
/** Speaker attribution only for exact authored turns in this pinned snapshot. */
export function scriptedSpeaker(work:Work,text:string){const turn=work.sampleTurns?.find(t=>scriptedTurnText(work,t)===text);if(!turn)return null;const character=work.characters.find(c=>c.id===turn.characterId);return character?{character,content:sampleNarration(turn.content)}:null;}
