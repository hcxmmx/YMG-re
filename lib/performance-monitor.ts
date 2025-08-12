/**
 * 聊天界面性能监控工具
 * 用于分析和优化长对话的性能问题
 */

interface PerformanceMetrics {
  messageCount: number;
  renderTime: number;
  scrollTime: number;
  memoryUsage?: number;
  timestamp: number;
}

interface ScrollMetrics {
  isVirtualScrollEnabled: boolean;
  visibleMessages: number;
  totalMessages: number;
  fps: number;
  avgRenderTime: number;
}

class ChatPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private scrollMetrics: ScrollMetrics[] = [];
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private renderTimes: number[] = [];

  /**
   * 记录消息渲染性能
   */
  recordRenderStart() {
    return performance.now();
  }

  recordRenderEnd(startTime: number, messageCount: number) {
    const renderTime = performance.now() - startTime;
    
    this.metrics.push({
      messageCount,
      renderTime,
      scrollTime: 0, // 暂时设为0
      timestamp: Date.now()
    });

    this.renderTimes.push(renderTime);
    
    // 只保留最近的100次记录
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    if (this.renderTimes.length > 50) {
      this.renderTimes = this.renderTimes.slice(-50);
    }

    // 输出性能警告
    if (renderTime > 16) { // 超过一帧的时间
      console.warn(`[性能警告] 消息渲染耗时 ${renderTime.toFixed(2)}ms (消息数: ${messageCount})`);
    }
  }

  /**
   * 记录滚动性能
   */
  recordScrollMetrics(metrics: Omit<ScrollMetrics, 'fps' | 'avgRenderTime'>) {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.frameCount++;

    // 计算FPS (每秒更新一次)
    if (deltaTime >= 1000) {
      const fps = (this.frameCount * 1000) / deltaTime;
      const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length || 0;

      this.scrollMetrics.push({
        ...metrics,
        fps: Math.round(fps),
        avgRenderTime: Math.round(avgRenderTime * 100) / 100
      });

      this.frameCount = 0;
      this.lastFrameTime = currentTime;

      // 只保留最近的20次记录
      if (this.scrollMetrics.length > 20) {
        this.scrollMetrics = this.scrollMetrics.slice(-20);
      }
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const recentMetrics = this.metrics.slice(-10);
    const recentScrollMetrics = this.scrollMetrics.slice(-5);
    
    const avgRenderTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length
      : 0;

    const maxRenderTime = recentMetrics.length > 0
      ? Math.max(...recentMetrics.map(m => m.renderTime))
      : 0;

    const currentScrollMetrics = recentScrollMetrics[recentScrollMetrics.length - 1];

    return {
      summary: {
        avgRenderTime: Math.round(avgRenderTime * 100) / 100,
        maxRenderTime: Math.round(maxRenderTime * 100) / 100,
        currentFPS: currentScrollMetrics?.fps || 0,
        isVirtualScrollActive: currentScrollMetrics?.isVirtualScrollEnabled || false,
        totalMessages: currentScrollMetrics?.totalMessages || 0,
        visibleMessages: currentScrollMetrics?.visibleMessages || 0
      },
      recentMetrics,
      scrollMetrics: recentScrollMetrics,
      recommendations: this.getRecommendations(avgRenderTime, maxRenderTime, currentScrollMetrics)
    };
  }

  /**
   * 获取性能建议
   */
  private getRecommendations(
    avgRenderTime: number, 
    maxRenderTime: number,
    scrollMetrics?: ScrollMetrics
  ) {
    const recommendations: string[] = [];

    if (avgRenderTime > 20) {
      recommendations.push("消息渲染平均耗时过长，考虑启用虚拟滚动");
    }

    if (maxRenderTime > 50) {
      recommendations.push("检测到严重的渲染阻塞，建议优化消息组件");
    }

    if (scrollMetrics) {
      if (scrollMetrics.fps < 30) {
        recommendations.push("滚动帧率过低，考虑减少DOM操作");
      }

      if (!scrollMetrics.isVirtualScrollEnabled && scrollMetrics.totalMessages > 100) {
        recommendations.push("消息数量较多，建议启用虚拟滚动优化");
      }

      if (scrollMetrics.visibleMessages > 20) {
        recommendations.push("可见消息过多，考虑减少缓冲区大小");
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("性能表现良好！");
    }

    return recommendations;
  }

  /**
   * 输出性能报告到控制台
   */
  logPerformanceReport() {
    const report = this.getPerformanceReport();
    
    console.group("📊 聊天性能报告");
    
    console.log("📈 性能概览:", {
      "平均渲染时间": `${report.summary.avgRenderTime}ms`,
      "最大渲染时间": `${report.summary.maxRenderTime}ms`, 
      "当前FPS": report.summary.currentFPS,
      "虚拟滚动": report.summary.isVirtualScrollActive ? "启用" : "禁用",
      "总消息数": report.summary.totalMessages,
      "可见消息数": report.summary.visibleMessages
    });

    if (report.recommendations.length > 0) {
      console.log("💡 优化建议:");
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.groupEnd();
    
    return report;
  }

  /**
   * 清理性能数据
   */
  clear() {
    this.metrics = [];
    this.scrollMetrics = [];
    this.renderTimes = [];
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }
}

// 全局性能监控实例
export const chatPerformanceMonitor = new ChatPerformanceMonitor();

// 性能分析Hook
export function useChatPerformanceMonitor() {
  const recordRender = (messageCount: number) => {
    const startTime = chatPerformanceMonitor.recordRenderStart();
    
    return () => {
      chatPerformanceMonitor.recordRenderEnd(startTime, messageCount);
    };
  };

  const recordScroll = (metrics: Omit<ScrollMetrics, 'fps' | 'avgRenderTime'>) => {
    chatPerformanceMonitor.recordScrollMetrics(metrics);
  };

  const getReport = () => {
    return chatPerformanceMonitor.getPerformanceReport();
  };

  const logReport = () => {
    return chatPerformanceMonitor.logPerformanceReport();
  };

  return {
    recordRender,
    recordScroll,
    getReport,
    logReport,
    clear: () => chatPerformanceMonitor.clear()
  };
}

// 开发者工具：在控制台中暴露性能监控
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).chatPerformance = {
    getReport: () => chatPerformanceMonitor.getPerformanceReport(),
    logReport: () => chatPerformanceMonitor.logPerformanceReport(),
    clear: () => chatPerformanceMonitor.clear()
  };
}
