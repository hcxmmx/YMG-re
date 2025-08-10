import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('📥 代理API被调用');
  
  try {
    // 解析请求体
    const requestData = await request.json();
    console.log('📋 收到的请求数据:', {
      url: requestData.url,
      method: requestData.method,
      hasHeaders: !!requestData.headers,
      hasBody: !!requestData.body
    });

    const { url, method = 'GET', headers = {}, body: requestBody } = requestData;

    // 基本验证
    if (!url) {
      console.error('❌ 缺少URL参数');
      return NextResponse.json({ error: '缺少URL参数', success: false }, { status: 400 });
    }

    // URL格式验证
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      console.error('❌ 无效的URL格式:', url);
      return NextResponse.json({ error: '无效的URL格式', success: false }, { status: 400 });
    }

    // 协议验证
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      console.error('❌ 不支持的协议:', targetUrl.protocol);
      return NextResponse.json({ error: '不支持的协议', success: false }, { status: 400 });
    }

    // 安全检查 - 防止访问内网
    const hostname = targetUrl.hostname.toLowerCase();
    const dangerousHosts = ['localhost', '127.0.0.1'];
    const dangerousPatterns = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./];
    
    if (dangerousHosts.includes(hostname) || 
        dangerousPatterns.some(pattern => pattern.test(hostname)) ||
        hostname.endsWith('.local')) {
      console.error('❌ 禁止访问内网地址:', hostname);
      return NextResponse.json({ error: '禁止访问内网地址', success: false }, { status: 403 });
    }

    console.log(`🚀 开始代理请求: ${method} ${url}`);

    // 准备请求头
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'MMG2-Proxy/1.0',
      'Accept': 'application/json, text/plain, */*',
      ...headers
    };

    // 移除危险的请求头
    const dangerousHeaders = ['host', 'origin', 'referer'];
    dangerousHeaders.forEach(header => {
      delete proxyHeaders[header];
      delete proxyHeaders[header.toLowerCase()];
    });

    // 准备fetch选项
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: proxyHeaders,
    };

    // 如果有请求体，添加到选项中
    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = requestBody;
      console.log('📤 添加请求体，长度:', typeof requestBody === 'string' ? requestBody.length : 'unknown');
    }

    // 发送请求
    const response = await fetch(url, fetchOptions);
    console.log(`📨 收到响应: ${response.status} ${response.statusText}`);

    // 解析响应
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    try {
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (parseError) {
      console.error('❌ 解析响应失败:', parseError);
      responseData = await response.text(); // 降级到文本
    }

    console.log('✅ 代理请求成功');

    // 返回结果
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      contentType
    });

  } catch (error) {
    console.error('❌ 代理请求出错:', error);
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      error: `代理请求失败: ${errorMsg}`,
      success: false
    }, { status: 500 });
  }
}

// 支持GET请求（用于简单的URL代理）
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: '缺少URL参数', success: false },
      { status: 400 }
    );
  }

  console.log('📥 GET代理请求:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MMG2-Proxy/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      contentType
    });

  } catch (error) {
    console.error('❌ GET代理请求失败:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      error: `GET代理请求失败: ${errorMsg}`,
      success: false
    }, { status: 500 });
  }
}
