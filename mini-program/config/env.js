/**
 * 环境配置文件
 * 根据不同的运行环境设置相应的配置
 */

// 环境配置
const ENV_CONFIG = {
  // 开发环境
  develop: {
    apiBaseUrl: 'http://localhost:8080/api',
    debug: true,
    logLevel: 'debug'
  },
  
  // 体验版环境
  trial: {
    apiBaseUrl: 'https://yuyingbao.yideng.ltd/api',
    debug: true,
    logLevel: 'info'
  },
  
  // 正式版环境
  release: {
    apiBaseUrl: 'https://yuyingbao.yideng.ltd/api',
    debug: false,
    logLevel: 'error'
  }
};

/**
 * 获取当前环境配置
 */
function getCurrentEnvConfig() {
  try {
    // 获取微信小程序运行环境信息
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;
    
    console.log('当前运行环境:', envVersion);
    
    // 获取对应环境的配置
    const config = ENV_CONFIG[envVersion] || ENV_CONFIG.develop;
    
    console.log('当前环境配置:', config);
    
    return config;
  } catch (error) {
    console.error('获取环境信息失败:', error);
    // 出错时使用开发环境配置
    console.log('使用默认开发环境配置');
    return ENV_CONFIG.develop;
  }
}

/**
 * 获取API基础URL
 */
function getApiBaseUrl() {
  try {
    const config = getCurrentEnvConfig();
    const apiUrl = config.apiBaseUrl;
    
    // 验证URL是否有效
    if (!apiUrl || apiUrl === 'null' || apiUrl === 'undefined') {
      console.warn('API URL无效，使用默认开发环境地址');
      return 'http://localhost:8080/api';
    }
    
    return apiUrl;
  } catch (error) {
    console.error('获取API地址失败:', error);
    return 'http://localhost:8080/api';
  }
}

/**
 * 是否开启调试模式
 */
function isDebugMode() {
  const config = getCurrentEnvConfig();
  return config.debug;
}

/**
 * 获取日志级别
 */
function getLogLevel() {
  const config = getCurrentEnvConfig();
  return config.logLevel;
}

/**
 * 获取完整的环境信息
 */
function getEnvInfo() {
  const config = getCurrentEnvConfig();
  const accountInfo = wx.getAccountInfoSync();
  
  return {
    envVersion: accountInfo.miniProgram.envVersion,
    appId: accountInfo.miniProgram.appId,
    apiBaseUrl: config.apiBaseUrl,
    debug: config.debug,
    logLevel: config.logLevel
  };
}

module.exports = {
  getCurrentEnvConfig,
  getApiBaseUrl,
  isDebugMode,
  getLogLevel,
  getEnvInfo,
  ENV_CONFIG
};
