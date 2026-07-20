/**
 * Cloudflare Pages Function: POST /api/analyze-public
 * 直接转发请求到 DeepSeek API，API Key 在服务端环境变量中，安全不泄露
 */

export async function onRequestPost(context: any) {
  const { request, env } = context;

  // 安全校验：只允许同域名请求
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  if (origin && origin !== url.origin) {
    return new Response(JSON.stringify({ error: '禁止跨域访问' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 解析请求体
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '无效的请求格式' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: '缺少 messages 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 检查 API Key 是否配置
  if (!env.DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({ error: '服务未配置，请在 Cloudflare 环境变量中设置 DEEPSEEK_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 调用 DeepSeek API
  try {
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
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

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('DeepSeek API 错误:', apiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI服务错误 (${apiResponse.status})` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result: any = await apiResponse.json();
    const aiMessage = result.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ message: aiMessage, remainingCalls: -1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('AI分析失败:', err.message);
    return new Response(
      JSON.stringify({ error: 'AI分析失败: ' + (err.message || '未知错误') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
