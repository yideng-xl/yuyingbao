// 引入环境配置
const { getApiBaseUrl, getEnvInfo, isDebugMode } = require('../../config/env.js');
import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    envInfo: {},
    apiUrl: '',
    debugMode: false,
    testChartOption: {},
    testResult: '未测试',
    token: '',
    userInfo: ''
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
    
    // 初始化应用状态信息
    this.checkToken();
    
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
        this.setData({ testResult: '连接成功' });
        wx.showModal({
          title: '连接成功',
          content: `API地址: ${apiUrl}\n状态码: ${res.statusCode}`,
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ testResult: '连接失败' });
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
  },

  // 测试ECharts图表
  testEChartsChart() {
    console.log('开始测试ECharts图表');
    
    const testOption = {
      backgroundColor: 'transparent',
      title: {
        text: '测试图表',
        left: 'center',
        textStyle: {
          color: '#333',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '20%',
        top: '30%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}ml',
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#F0F0F0',
            type: 'dashed'
          }
        }
      },
      series: [{
        name: '喂养量',
        type: 'bar',
        barWidth: '60%',
        data: [120, 180, 160, 200, 150, 170, 140],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: '#4A90E2'
            }, {
              offset: 1,
              color: '#7ED321'
            }]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
    
    this.setData({
      testChartOption: {
        onInit: this.initTestChart.bind(this, testOption)
      }
    });
    
    wx.showToast({
      title: '图表初始化中...',
      icon: 'loading',
      duration: 1500
    });
  },

  // 初始化测试图表
  initTestChart(option, canvas, width, height, dpr) {
    console.log('初始化测试图表, option:', option);
    console.log('canvas dimensions:', width, height, dpr);
    
    try {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      
      canvas.setChart(chart);
      chart.setOption(option);
      
      console.log('测试图表初始化成功');
      
      wx.showToast({
        title: '图表渲染成功',
        icon: 'success'
      });
      
      return chart;
    } catch (error) {
      console.error('图表初始化失败:', error);
      wx.showToast({
        title: '图表渲染失败',
        icon: 'none'
      });
    }
  },

  // 清空测试图表
  clearTestChart() {
    this.setData({
      testChartOption: {}
    });
    wx.showToast({
      title: '图表已清空',
      icon: 'success'
    });
  },

  // 测试check-name接口
  testCheckName() {
    const app = getApp();
    const apiUrl = app.globalData.apiBaseUrl;
    
    wx.showLoading({ title: '测试中...' });
    
    wx.request({
      url: `${apiUrl}/check-name`,
      method: 'POST',
      data: { name: '测试用户' },
      success: (res) => {
        wx.hideLoading();
        this.setData({ testResult: '成功' });
        wx.showToast({ title: '测试成功', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ testResult: '失败' });
        wx.showToast({ title: '测试失败', icon: 'none' });
      }
    });
  },

  // 测试登录
  testLogin() {
    const app = getApp();
    app.checkLogin().then(() => {
      this.setData({ testResult: '登录成功' });
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(() => {
      this.setData({ testResult: '登录失败' });
      wx.showToast({ title: '登录失败', icon: 'none' });
    });
  },

  // 检查Token和用户信息
  checkToken() {
    const app = getApp();
    const token = wx.getStorageSync('jwt_token') || '未设置';
    const userInfo = JSON.stringify(app.globalData.userInfo || {}) || '未登录';
    
    this.setData({
      token: token.length > 20 ? token.substring(0, 20) + '...' : token,
      userInfo: userInfo
    });
  },

  // 清除存储
  clearStorage() {
    wx.clearStorageSync();
    const app = getApp();
    app.globalData.userInfo = null;
    app.globalData.familyInfo = null;
    
    this.checkToken();
    
    wx.showToast({
      title: '存储已清除',
      icon: 'success'
    });
  }
});