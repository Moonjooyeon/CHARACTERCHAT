import {requireChatGPTUser} from '../chatgpt-auth';
import ResponsivePreview from './preview';
export const dynamic='force-dynamic';
export default async function Preview(){await requireChatGPTUser('/qa-responsive');return <ResponsivePreview/>;}
