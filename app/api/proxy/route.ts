import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'GET', headers = {}, body: requestBody } = body;

    if (!url) {
      return NextResponse.json(
        { error: '缺少URL参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: '无效的URL格式' },
        { status: 400 }
      );
    }

    // 安全检查 - 只允许HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return NextResponse.json(
        { error: '不支持的协议，只允许HTTP和HTTPS' },
        { status: 400 }
      );
    }

    // 防止内部网络访问
    const hostname = targetUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname.endsWith('.local')
    ) {
      return NextResponse.json(
        { error: '不允许访问内部网络地址' },
        { status: 403 }
      );
    }

    console.log(`🔄 代理请求: ${method} ${url}`);

    // 清理请求头，移除可能导致问题的头部
    const cleanHeaders = { ...headers };
    const headersToRemove = [
      'host', 'origin', 'referer', 'x-forwarded-for',
      'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip',
      'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-dest',
      'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'
    ];
    
    headersToRemove.forEach(header => {
      delete cleanHeaders[header];
      delete cleanHeaders[header.toLowerCase()];
    });

    // 添加基本请求头
    cleanHeaders['User-Agent'] = 'MMG2-Proxy/1.0';
    if (!cleanHeaders['Accept']) {
      cleanHeaders['Accept'] = 'application/json, text/plain, */*';
    }

    // 发送代理请求
    const fetchOptions: RequestInit = {
      method,
      headers: cleanHeaders,
      signal: AbortSignal.timeout(30000), // 30秒超时
    };

    if (method !== 'GET' && method !== 'HEAD' && requestBody) {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    const response = await fetch(url, fetchOptions);
    
    // 获取响应数据
    const contentType = response.headers.get('content-type') || '';
    let responseData;
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log(`✅ 代理响应: ${response.status} ${response.statusText}`);

    // 返回响应
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      contentType
    });

  } catch (error) {
    console.error('❌ 代理请求失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return NextResponse.json(
      { 
        error: `代理请求失败: ${errorMessage}`,
        success: false 
      },
      { status: 500 }
    );
  }
}

// 也支持GET请求（用于简单的URL代理）
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: '缺少URL参数' },
      { status: 400 }
    );
  }

  // 转发到POST处理器
  const mockRequest = {
    json: async () => ({ url, method: 'GET' })
  } as NextRequest;

  return POST(mockRequest);
}
