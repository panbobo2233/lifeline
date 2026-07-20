/**
 * Cloudflare Pages Function: /api/site-token
 * 生成5分钟有效的安全令牌
 */

interface Env {
  SITE_SECRET: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;

  const timestamp = Date.now();
  const hash = simpleHash(`${env.SITE_SECRET}:${timestamp}`);

  return new Response(
    JSON.stringify({ token: `${timestamp}.${hash}` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
