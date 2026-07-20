/**
 * 统一的 AI 调用接口（强制走后端）
 */

interface AIResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  remainingCalls?: number;
  duplicate?: boolean;
  requestId?: string;
  analysisId?: string;
  savedToHistory?: boolean;
}

import { analyze, analyzePublic } from './ApiService';

export async function callAIService(params: {
  systemPrompt: string;
  userPrompt: string;
  model: 'deepseek' | 'chatgpt';
  apiKey?: string;
  userData: any;
  chartData: any;
  callType?: 'report' | 'synastry' | 'kline' | 'chat';
  metadata?: Record<string, any>;
  requestId?: string;
  analysisLog?: {
    analysisType: string;
    inputData: Record<string, any>;
    outputData?: Record<string, any>;
  };
}): Promise<AIResponse> {
  const { systemPrompt, userPrompt, callType, model, metadata, requestId, analysisLog } = params;

  const requestBody = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    callType: callType || 'chat',
    metadata: { source: 'frontend', model, requestId, ...(metadata || {}) },
    analysisLog
  };

  // 优先尝试登录接口，失败则回退到公开接口
  try {
    const data = await analyze(requestBody);
    return {
      success: true,
      analysis: data.message,
      remainingCalls: data.remainingCalls,
      duplicate: data.duplicate,
      requestId,
      analysisId: data.analysisId,
      savedToHistory: data.savedToHistory
    };
  } catch (authError: any) {
    // 登录接口失败，尝试免登录公开接口
    console.log('登录接口不可用，使用公开接口:', authError.message);
    try {
      const data = await analyzePublic(requestBody);
      return {
        success: true,
        analysis: data.message,
        remainingCalls: data.remainingCalls,
        duplicate: data.duplicate,
        requestId,
        analysisId: data.analysisId,
        savedToHistory: data.savedToHistory
      };
    } catch (publicError: any) {
      console.error('公开接口也失败:', publicError);
      return {
        success: false,
        error: publicError.message || '无法连接后端服务',
        requestId
      };
    }
  }
}
