// PWA更新检测和通知处理
let newWorker;
let refreshing = false;

// 检查是否应该自动更新
function shouldAutoUpdate() {
  try {
    return localStorage.getItem('pwa-auto-update') === 'true';
  } catch (e) {
    return false; // 默认不自动更新
  }
}

// 当Service Worker控制页面时，检查更新
if ('serviceWorker' in navigator) {
  // 等待页面加载完成
  window.addEventListener('load', () => {
    // 注册Service Worker
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[PWA] Service Worker registered with scope:', reg.scope);

      // 检查更新
      reg.addEventListener('updatefound', () => {
        // 获取安装中的Service Worker
        newWorker = reg.installing;

        // 监听状态变化
        newWorker.addEventListener('statechange', () => {
          // 当新的Service Worker安装完成时
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available');
            
            if (shouldAutoUpdate()) {
              console.log('[PWA] Auto-updating...');
              // 自动更新模式，直接skipWaiting
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            } else {
              // 向主线程发送"有更新"的消息
              document.dispatchEvent(new CustomEvent('pwaUpdateReady', {
                detail: { version: new Date().toISOString() }
              }));
            }
          }
        });
      });
    }).catch(error => {
      console.error('[PWA] Service Worker registration failed:', error);
    });

    // 监听控制权变化（发生在skipWaiting之后）
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Controller changed, refreshing...');
        window.location.reload();
      }
    });

    // 监听来自其他Service Worker线程的消息
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'UPDATE_READY') {
        document.dispatchEvent(new CustomEvent('pwaUpdateReady'));
      }
    });
  });
}

// 提供给UI调用的更新方法
window.updatePWA = function() {
  if (newWorker) {
    // 向Service Worker发送消息，通知其跳过等待并激活
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    // 如果没有找到新的Service Worker，强制刷新
    window.location.reload();
  }
}; 