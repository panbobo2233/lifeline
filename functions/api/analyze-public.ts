/**
 * Cloudflare Pages Function: /api/analyze-public
 * 免登录调用 DeepSeek API，API Key 存在 Cloudflare 环境变量中，绝不泄露到前端
 */

interface Env {
  DEEPSEEK_API_KEY: string;
  SITE_SECRET: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // 1. 安全校验：Origin
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const url = new URL(request.url);
  const allowedOrigin = url.origin; // 只允许同域名

  if (origin && origin !== allowedOrigin) {
    console.warn(`[Security] Origin不匹配: ${origin} ≠ ${allowedOrigin}`);
    return new Response(JSON.stringify({ error: '禁止访问' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. 安全校验：Site Token（简单防刷）
  const token = request.headers.get('X-Site-Token');
  if (!token) {
    return new Response(JSON.stringify({ error: '缺少安全令牌' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return new Response(JSON.stringify({ error: '无效的安全令牌' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [timestampStr, hash] = parts;
  const timestamp = Number(timestampStr);

  if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return new Response(JSON.stringify({ error: '安全令牌已过期' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expectedHash = simpleHash(`${env.SITE_SECRET}:${timestampStr}`);
  if (hash !== expectedHash) {
    return new Response(JSON.stringify({ error: '无效的安全令牌' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 解析请求
  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '无效的请求格式' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: '缺少 messages 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. 调用 DeepSeek API
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: body.messages,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API错误:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI服务暂时不可用 (${response.status})` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result: any = await response.json();
    const aiMessage = result.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ message: aiMessage, remainingCalls: -1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('AI分析失败:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'AI分析失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 简单hash（与后端保持一致）
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
