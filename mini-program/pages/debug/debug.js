// 引入环境配置
const { getApiBaseUrl, getEnvInfo, isDebugMode } = require('../../config/env.js');

Page({
  data: {
    envInfo: {},
    apiUrl: '',
    debugMode: false
  },

  onLoad() {
    // 获取环境信息
    const envInfo = getEnvInfo();
    const apiUrl = getApiBaseUrl();
    const debugMode = isDebugMode();
    
    this.setData({
      envInfo: envInfo,
      apiUrl: apiUrl,
      debugMode: debugMode
    });
    
    console.log('环境调试信息:', {
      envInfo,
      apiUrl,
      debugMode
    });
  },

  // 测试API连接
  testApiConnection() {
    const app = getApp();
    const apiUrl = app.globalData.apiBaseUrl;
    
    wx.showLoading({ title: '测试连接中...' });
    
    wx.request({
      url: `${apiUrl}/health`,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        wx.hideLoading();
        wx.showModal({
          title: '连接成功',
          content: `API地址: ${apiUrl}\n状态码: ${res.statusCode}`,
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({
          title: '连接失败',
          content: `API地址: ${apiUrl}\n错误: ${err.errMsg || '网络错误'}`,
          showCancel: false
        });
      }
    });
  },

  // 复制API地址
  copyApiUrl() {
    wx.setClipboardData({
      data: this.data.apiUrl,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 刷新环境信息
  refreshEnvInfo() {
    const envInfo = getEnvInfo();
    const apiUrl = getApiBaseUrl();
    const debugMode = isDebugMode();
    
    this.setData({
      envInfo: envInfo,
      apiUrl: apiUrl,
      debugMode: debugMode
    });
    
    // 检查API配置
    const app = getApp();
    const configCheck = app.checkApiConfig();
    
    wx.showModal({
      title: '环境信息已刷新',
      content: `API地址: ${configCheck.apiBaseUrl}\n配置有效: ${configCheck.isValid ? '是' : '否'}`,
      showCancel: false
    });
  },

  // 检查API配置
  checkApiConfig() {
    const app = getApp();
    const configCheck = app.checkApiConfig();
    
    wx.showModal({
      title: 'API配置检查',
      content: `API地址: ${configCheck.apiBaseUrl}\n配置有效: ${configCheck.isValid ? '是' : '否'}\n环境版本: ${configCheck.envInfo?.envVersion || '未知'}`,
      showCancel: false
    });
  }
});