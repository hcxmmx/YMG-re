/**
 * API日志记录工具
 * 用于记录API请求和响应的详细信息
 */

// 日志条目接口
export interface ApiLogEntry {
  id: string;
  timestamp: Date;
  type: 'gemini' | 'openai';
  method: 'POST' | 'GET';
  endpoint: string;
  request: {
    headers?: Record<string, any>;
    body?: any;
    config?: any;
  };
  response?: {
    status?: number;
    headers?: Record<string, any>;
    data?: any;
    text?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number; // 请求耗时（毫秒）
  success: boolean;
}

// 生成唯一ID
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API日志记录器类
export class ApiLogger {
  private static instance: ApiLogger;
  
  static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger();
    }
    return ApiLogger.instance;
  }

  // 记录API请求开始
  startRequest(
    type: 'gemini' | 'openai',
    method: 'POST' | 'GET',
    endpoint: string,
    requestData: {
      headers?: Record<string, any>;
      body?: any;
      config?: any;
    }
  ): string {
    const logId = generateLogId();
    
    // 存储请求开始时间
    const startTime = Date.now();
    (globalThis as any).__apiRequestTimes = (globalThis as any).__apiRequestTimes || {};
    (globalThis as any).__apiRequestTimes[logId] = startTime;

    console.log(`[API Logger] 开始请求 ${logId}:`, {
      type,
      method,
      endpoint,
      timestamp: new Date(),
      request: requestData
    });

    return logId;
  }

  // 记录API请求成功
  logSuccess(
    logId: string,
    type: 'gemini' | 'openai',
    method: 'POST' | 'GET',
    endpoint: string,
    requestData: {
      headers?: Record<string, any>;
      body?: any;
      config?: any;
    },
    responseData: {
      status?: number;
      headers?: Record<string, any>;
      data?: any;
      text?: string;
    }
  ) {
    const duration = this.calculateDuration(logId);
    
    const logEntry: ApiLogEntry = {
      id: logId,
      timestamp: new Date(),
      type,
      method,
      endpoint,
      request: requestData,
      response: responseData,
      duration,
      success: true
    };

    this.dispatchLogEvent(logEntry);
    
    console.log(`[API Logger] 请求成功 ${logId}:`, logEntry);
  }

  // 记录API请求失败
  logError(
    logId: string,
    type: 'gemini' | 'openai',
    method: 'POST' | 'GET',
    endpoint: string,
    requestData: {
      headers?: Record<string, any>;
      body?: any;
      config?: any;
    },
    error: Error,
    responseData?: {
      status?: number;
      headers?: Record<string, any>;
      data?: any;
      text?: string;
    }
  ) {
    const duration = this.calculateDuration(logId);
    
    const logEntry: ApiLogEntry = {
      id: logId,
      timestamp: new Date(),
      type,
      method,
      endpoint,
      request: requestData,
      response: responseData,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      },
      duration,
      success: false
    };

    this.dispatchLogEvent(logEntry);
    
    console.error(`[API Logger] 请求失败 ${logId}:`, logEntry);
  }

  // 计算请求耗时
  private calculateDuration(logId: string): number | undefined {
    const requestTimes = (globalThis as any).__apiRequestTimes;
    if (requestTimes && requestTimes[logId]) {
      const duration = Date.now() - requestTimes[logId];
      delete requestTimes[logId]; // 清理
      return duration;
    }
    return undefined;
  }

  // 分发日志事件到UI组件
  private dispatchLogEvent(logEntry: ApiLogEntry) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('api-log', { detail: logEntry });
      window.dispatchEvent(event);
    }
  }

  // 记录简单的信息日志
  logInfo(message: string, data?: any) {
    console.log(`[API Logger] ${message}`, data || '');
  }

  // 记录调试信息
  logDebug(message: string, data?: any) {
    console.debug(`[API Logger] ${message}`, data || '');
  }
}

// 导出单例实例
export const apiLogger = ApiLogger.getInstance();

// 便捷函数
export const logApiRequest = (
  type: 'gemini' | 'openai',
  method: 'POST' | 'GET',
  endpoint: string,
  requestData: any
) => apiLogger.startRequest(type, method, endpoint, requestData);

export const logApiSuccess = (
  logId: string,
  type: 'gemini' | 'openai',
  method: 'POST' | 'GET',
  endpoint: string,
  requestData: any,
  responseData: any
) => apiLogger.logSuccess(logId, type, method, endpoint, requestData, responseData);

export const logApiError = (
  logId: string,
  type: 'gemini' | 'openai',
  method: 'POST' | 'GET',
  endpoint: string,
  requestData: any,
  error: Error,
  responseData?: any
) => apiLogger.logError(logId, type, method, endpoint, requestData, error, responseData);
