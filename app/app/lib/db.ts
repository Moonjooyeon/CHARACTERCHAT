import { env } from 'cloudflare:workers';
export function db():D1Database { if(!env.DB) throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'); return env.DB; }
