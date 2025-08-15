import { ChatBackgroundSettings } from './types';

/**
 * 应用聊天背景设置到DOM
 */
export function applyChatBackground(settings: ChatBackgroundSettings, isPreview = false) {
  console.log('应用聊天背景设置:', settings, isPreview ? '(预览模式)' : '');
  const root = document.documentElement;

  // 如果是预览模式，显示提示
  if (isPreview) {
    showPreviewNotification();
  }

  // 重置所有背景变量
  root.style.setProperty('--chat-background-type', settings.type);
  root.style.setProperty('--chat-background-image', 'none');
  root.style.setProperty('--chat-background-size', 'cover');
  root.style.setProperty('--chat-background-position', 'center');
  root.style.setProperty('--chat-background-repeat', 'no-repeat');
  root.style.setProperty('--chat-background-opacity', '1');
  root.style.setProperty('--chat-background-blur', '0px');
  root.style.setProperty('--chat-background-overlay', 'transparent');
  root.style.setProperty('--chat-background-transform', 'none');

  switch (settings.type) {
    case 'image':
      if (settings.imageUrl) {
        const { translateX, translateY, scale, rotate, sizeMode } = settings.imageTransform;

        let backgroundSize = '';
        let backgroundPosition = 'center';

        switch (sizeMode) {
          case 'cover':
            backgroundSize = 'cover';
            // 在覆盖模式下也允许位置调整
            if (translateX !== 0 || translateY !== 0) {
              backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
            }
            break;
          case 'contain':
            backgroundSize = 'contain';
            // 在包含模式下也允许位置调整
            if (translateX !== 0 || translateY !== 0) {
              backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
            }
            break;
          case 'auto':
            backgroundSize = 'auto';
            // 在自动模式下也允许位置调整
            if (translateX !== 0 || translateY !== 0) {
              backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
            }
            break;
          case 'stretch':
            backgroundSize = '100% 100%';
            // 拉伸模式下位置调整意义不大，但仍然支持
            if (translateX !== 0 || translateY !== 0) {
              backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
            }
            break;
          case 'custom':
            backgroundSize = `${scale * 100}%`;
            backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
            break;
        }

        root.style.setProperty('--chat-background-image', `url(${settings.imageUrl})`);
        root.style.setProperty('--chat-background-size', backgroundSize);
        root.style.setProperty('--chat-background-position', backgroundPosition);
        root.style.setProperty('--chat-background-repeat', 'no-repeat');
        root.style.setProperty('--chat-background-transform', `rotate(${rotate}deg)`);
        console.log('应用图片背景:', {
          imageUrl: settings.imageUrl.substring(0, 50) + '...',
          sizeMode,
          backgroundSize,
          backgroundPosition,
          transform: settings.imageTransform
        });
      }
      break;

    case 'gradient':
      if (settings.gradientColors && settings.gradientColors.length >= 2) {
        const colors = settings.gradientColors.join(', ');
        const gradientImage = `${settings.gradientType}-gradient(${settings.gradientDirection}, ${colors})`;
        root.style.setProperty('--chat-background-image', gradientImage);
        console.log('应用渐变背景:', gradientImage);
      }
      break;

    case 'color':
      if (settings.backgroundColor) {
        root.style.setProperty('--chat-background-image', `linear-gradient(${settings.backgroundColor}, ${settings.backgroundColor})`);
        console.log('应用纯色背景:', settings.backgroundColor);
      }
      break;

    case 'none':
    default:
      console.log('重置背景为无');
      break;
  }
  
  // 应用通用设置
  if (settings.type !== 'none') {
    root.style.setProperty('--chat-background-opacity', (settings.opacity / 100).toString());
    root.style.setProperty('--chat-background-blur', `${settings.blur}px`);
    
    // 应用遮罩层
    if (settings.overlay && settings.overlayColor) {
      const overlayOpacity = settings.overlayOpacity / 100;
      root.style.setProperty('--chat-background-overlay', `${settings.overlayColor}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}`);
    }
  }
}

/**
 * 生成背景样式对象（用于预览）
 */
export function generateBackgroundStyle(settings: ChatBackgroundSettings): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  switch (settings.type) {
    case 'image':
      if (settings.imageUrl) {
        const { translateX, translateY, scale, rotate } = settings.imageTransform;
        style.backgroundImage = `url(${settings.imageUrl})`;
        style.backgroundSize = `${scale * 100}%`;
        style.backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
        style.backgroundRepeat = 'no-repeat';
        style.transform = `rotate(${rotate}deg)`;
      }
      break;
      
    case 'gradient':
      if (settings.gradientColors && settings.gradientColors.length >= 2) {
        const colors = settings.gradientColors.join(', ');
        style.backgroundImage = `${settings.gradientType}-gradient(${settings.gradientDirection}, ${colors})`;
      }
      break;
      
    case 'color':
      if (settings.backgroundColor) {
        style.backgroundColor = settings.backgroundColor;
      }
      break;
  }
  
  // 应用通用设置
  if (settings.type !== 'none') {
    style.opacity = settings.opacity / 100;
    if (settings.blur > 0) {
      style.filter = `blur(${settings.blur}px)`;
    }
  }
  
  return style;
}

/**
 * 从localStorage加载背景设置
 */
export function loadChatBackgroundSettings(): ChatBackgroundSettings | null {
  try {
    const settingsStr = localStorage.getItem('ai-roleplay-settings');
    if (settingsStr) {
      const parsed = JSON.parse(settingsStr);
      if (parsed.state && parsed.state.settings && parsed.state.settings.chatBackground) {
        return parsed.state.settings.chatBackground;
      }
    }
  } catch (error) {
    console.error('加载聊天背景设置失败:', error);
  }
  return null;
}

/**
 * 初始化聊天背景
 */
export function initializeChatBackground() {
  const settings = loadChatBackgroundSettings();
  if (settings) {
    applyChatBackground(settings);
  }
}

/**
 * 显示预览通知
 */
function showPreviewNotification() {
  // 移除现有的预览通知
  const existingNotification = document.getElementById('background-preview-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 创建新的预览通知
  const notification = document.createElement('div');
  notification.id = 'background-preview-notification';
  notification.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right-5';
  notification.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
    </svg>
    <span>背景预览已激活</span>
  `;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slide-out-to-right-5 0.3s ease-in-out';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }, 3000);
}
