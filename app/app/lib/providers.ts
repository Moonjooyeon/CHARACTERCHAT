/** Server-only provider boundary. No credentials and no paid calls are configured. */
import { sampleNarration, type Work } from './data';
import {scriptedTurnText} from './simulation-dialogue';
export const providerReadiness={chat:'sample-only',image:'not-connected',payment:'test-ledger-only'} as const;
export type ChatInput={work:Work;turn:number;message:string;context?:unknown};
export interface ChatProvider { reply(input:ChatInput):Promise<string>; }
export interface ImageProvider { generate(input:{prompt:string;count:number;ratio:'2:3'|'1:1'|'16:9'}):Promise<{images:string[]}>; }
// Handwritten character demo turns, not live inference. User-created stories retain the fallback.
export const sampleChatProvider:ChatProvider={async reply({work,turn}){const turns=work.sampleTurns?.filter(t=>work.characters.some(c=>c.id===t.characterId));if(turns?.length)return scriptedTurnText(work,turns[turn%turns.length]);const authored=work.sampleReplies;if(authored)return authored[turn%authored.length];const name=work.characters[0].name;return sampleNarration([`${name}은 잠시 생각에 잠겼다가 고개를 끄덕였다.\n\n“그 이야기는 조금 더 듣고 싶어요. 지금 가장 궁금한 건 무엇인가요?”`,`조용한 공기 사이로 ${name}의 목소리가 들렸다.\n\n“서두르지 않아도 괜찮아요. 우리에게는 아직 시간이 있으니까.”`,`“그럼, 여기서부터 시작해 볼까요?”\n\n${name}이 당신을 바라보며 작은 미소를 지었다.`][turn%3])}};
export const disconnectedImageProvider:ImageProvider={async generate(){throw new Error('IMAGE_PROVIDER_NOT_CONNECTED')}};
