/**
 * 埋点事件接口 - 免登录模式下静默接受，不存数据库
 */
export async function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
