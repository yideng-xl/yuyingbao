// 网络连接测试
const app = getApp();

Page({
  data: {
    testResult: ''
  },

  onLoad() {
    this.testConnection();
  },

  testConnection() {
    const baseUrl = app.globalData.apiBaseUrl;
    this.setData({ testResult: `测试连接到: ${baseUrl}` });
    
    // 测试基本连接
    wx.request({
      url: `${baseUrl}/actuator/health`,
      method: 'GET',
      success: (res) => {
        this.setData({ 
          testResult: `${this.data.testResult}\n健康检查成功: ${JSON.stringify(res.data)}` 
        });
        
        // 测试认证端点
        this.testAuthEndpoint();
      },
      fail: (err) => {
        this.setData({ 
          testResult: `${this.data.testResult}\n健康检查失败: ${JSON.stringify(err)}` 
        });
      }
    });
  },

  testAuthEndpoint() {
    const baseUrl = app.globalData.apiBaseUrl;
    wx.request({
      url: `${baseUrl}/auth/wechat/login`,
      method: 'POST',
      data: {
        code: 'test'
      },
      success: (res) => {
        this.setData({ 
          testResult: `${this.data.testResult}\n认证端点测试成功` 
        });
      },
      fail: (err) => {
        this.setData({ 
          testResult: `${this.data.testResult}\n认证端点测试失败: ${JSON.stringify(err)}` 
        });
      }
    });
  }
});