import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 免登录模式：没有 Supabase 配置时创建空客户端，不阻塞应用启动
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('[Lifeline] 未配置 Supabase，登录功能不可用，但免登录AI分析正常');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false }
    });

// 获取当前用户
export async function getCurrentUser() {
  if (!hasSupabaseConfig) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// 获取访问token
export async function getAccessToken() {
  if (!hasSupabaseConfig) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// 登出
export async function signOut() {
  if (!hasSupabaseConfig) return;
  await supabase.auth.signOut();
}

// 监听认证状态变化
export function onAuthStateChange(callback: (user: any) => void) {
  if (!hasSupabaseConfig) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
