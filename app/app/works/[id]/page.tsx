import StudioApp from '../../studio-app';
import { requireChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function WorkPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Protected id={id}/>;}
async function Protected({id}:{id:string}){await requireChatGPTUser('/works/'+encodeURIComponent(id));return <StudioApp/>;}
