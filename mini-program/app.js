// 引入环境配置
const { getApiBaseUrl, getEnvInfo, isDebugMode } = require('./config/env.js');

App({

  globalData: {
    // API基础URL将在onLaunch中设置
    apiBaseUrl: null,
    userInfo: null,
    familyInfo: null,
    babyInfo: null,
    records: [],
    knowledgeBase: {
      '0-6': {
        feeding: { min: 600, max: 900, frequency: 6 },
        growth: { weightGain: { min: 0.5, max: 1.0 } }
      },
      '6-12': {
        feeding: { min: 800, max: 1200, frequency: 5 },
        growth: { weightGain: { min: 0.3, max: 0.6 } }
      },
      '12-24': {
        feeding: { min: 1000, max: 1500, frequency: 4 },
        growth: { weightGain: { min: 0.2, max: 0.4 } }
      }
    }
  },

  onLaunch() {
    try {
      // 设置API基础URL
      this.globalData.apiBaseUrl = getApiBaseUrl();
      
      // 获取环境信息
      const envInfo = getEnvInfo();
      this.globalData.envInfo = envInfo;
      
      // 输出调试信息
      if (isDebugMode()) {
        console.log('App Launch, 环境信息:', envInfo);
        console.log('API Base URL:', this.globalData.apiBaseUrl);
      }
    } catch (error) {
      console.error('环境配置初始化失败:', error);
      // 使用默认配置
      this.globalData.apiBaseUrl = 'http://localhost:8080/api';
      this.globalData.envInfo = {
        envVersion: 'develop',
        appId: 'unknown',
        apiBaseUrl: 'http://localhost:8080/api',
        debug: true,
        logLevel: 'debug'
      };
    }
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息 - 使用新的 API
    try {
      const deviceInfo = wx.getDeviceInfo();
      const windowInfo = wx.getWindowInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      
      this.globalData.systemInfo = {
        ...deviceInfo,
        ...windowInfo,
        ...appBaseInfo
      };
    } catch (error) {
      console.warn('获取系统信息失败:', error);
      this.globalData.systemInfo = {};
    }
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.userInfo = userInfo;
      this.getFamilyInfo();
    } else {
      // 不自动登录，等待用户主动授权
      console.log('等待用户主动授权');
    }
  },

  /**
   * 自动登录流程
   */
  autoLogin() {
    // 不再自动登录，由用户主动触发
    console.log('等待用户主动授权');
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfileAndLogin(code, userInfo = null) {
    // 获取设备信息
    const systemInfo = wx.getSystemInfoSync();
    const deviceId = this.getDeviceId();
    
    // 构造登录数据
    const loginData = {
      code: code,
      nickname: userInfo?.nickName || '未知用户',
      avatarUrl: userInfo?.avatarUrl || '',
      deviceId: deviceId,
      deviceInfo: {
        system: systemInfo.system,
        platform: systemInfo.platform,
        brand: systemInfo.brand,
        model: systemInfo.model,
        version: systemInfo.version,
        SDKVersion: systemInfo.SDKVersion,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight,
        pixelRatio: systemInfo.pixelRatio
      }
    };

    return this.loginToServer(loginData);
  },

  /**
   * 生成设备ID（使用设备唯一标识）
   */
  getDeviceId() {
    let deviceId = wx.getStorageSync('deviceId');
    
    if (!deviceId) {
      // 生成唯一设备ID（基于系统信息）
      const systemInfo = wx.getSystemInfoSync();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      
      // 组合生成设备ID
      deviceId = `${systemInfo.brand || 'unknown'}_${systemInfo.model || 'unknown'}_${timestamp}_${random}`;
      
      // 保存到本地存储
      wx.setStorageSync('deviceId', deviceId);
      console.log('生成新的设备ID:', deviceId);
    }
    
    return deviceId;
  },

  /**
   * 显示授权登录弹窗
   */
  showLoginModal() {
    wx.showModal({
      title: '用户授权',
      content: '为了更好地为您服务，需要获取您的基本信息',
      confirmText: '授权登录',
      cancelText: '暂不授权',
      success: (res) => {
        if (res.confirm) {
          this.startLoginProcess();
        }
      }
    });
  },

  /**
   * 开始登录流程
   */
  startLoginProcess() {
    // 显示授权弹窗，让用户主动触发授权
    this.showLoginModal();
  },

  /**
   * 手动获取用户信息（由按钮触发）
   */
  getUserProfile(callback) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('获取用户信息成功', res.userInfo);
        // 重新登录以更新用户信息
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              this.getUserProfileAndLogin(loginRes.code, res.userInfo);
              if (callback) callback(true, res.userInfo);
            }
          }
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        if (callback) callback(false, null);
      }
    });
  },

  login() {
    this.startLoginProcess();
  },

  loginToServer(loginData) {
    return new Promise((resolve, reject) => {
      // 检查API地址是否有效
      if (!this.globalData.apiBaseUrl || this.globalData.apiBaseUrl === 'null') {
        console.error('API地址无效:', this.globalData.apiBaseUrl);
        wx.hideLoading();
        this.handleLoginError('API地址配置错误，请检查环境配置');
        reject(new Error('API地址无效'));
        return;
      }
      
      wx.showLoading({ title: '登录中...' });
      
      const fullUrl = `${this.globalData.apiBaseUrl}/auth/wechat/login-complete`;
      console.log('登录请求URL:', fullUrl);
      console.log('登录数据:', JSON.stringify(loginData));
      
      wx.request({
        url: fullUrl,
        method: 'POST',
        data: loginData,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode === 200 && res.data && res.data.token) {
            const { token, tokenType, userInfo } = res.data;
            // 确保token格式正确
            let fullToken = token;
            if (tokenType && !token.startsWith(tokenType)) {
              fullToken = `${tokenType} ${token}`;
            } else if (!tokenType && !token.startsWith('Bearer')) {
              fullToken = `Bearer ${token}`;
            }
            
            console.log('登录成功，保存的token:', fullToken);
            
            // 保存登录信息
            wx.setStorageSync('token', fullToken);
            wx.setStorageSync('userInfo', userInfo);
            
            // 更新全局数据
            this.globalData.userInfo = userInfo;
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });
            
            resolve();
          } else {
            this.handleLoginError('登录失败，请重试');
            reject(new Error('登录失败'));
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('登录请求失败:', err);
          this.handleLoginError('网络错误，请检查网络');
          reject(err);
        }
      });
    });
  },

  /**
   * 处理登录错误
   */
  handleLoginError(message) {
    wx.showModal({
      title: '登录失败',
      content: message,
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.startLoginProcess();
        }
      }
    });
  },

  // 通用请求封装（自动注入 Authorization）
  request({ path, method = 'GET', data = {}, header = {} }) {
    return new Promise((resolve, reject) => {
      // 检查API地址是否有效
      if (!this.globalData.apiBaseUrl || this.globalData.apiBaseUrl === 'null') {
        console.error('API地址无效:', this.globalData.apiBaseUrl);
        reject(new Error('API地址配置错误，请检查环境配置'));
        return;
      }
      
      const token = wx.getStorageSync('token');
      console.log('获取到的token:', token);
      
      // 确保token格式正确（Bearer token）
      let authHeader = {};
      if (token) {
        // 如果token已经包含Bearer前缀，直接使用
        if (token.startsWith('Bearer ')) {
          authHeader = { Authorization: token };
        } else {
          // 否则添加Bearer前缀
          authHeader = { Authorization: `Bearer ${token}` };
        }
      }
      
      const finalHeader = Object.assign(
        { 'Content-Type': 'application/json' },
        header,
        authHeader
      );
      
      const fullUrl = `${this.globalData.apiBaseUrl}${path}`;
      console.log('发送请求:', {
        url: fullUrl,
        method,
        data,
        header: finalHeader
      });
      
      wx.request({
        url: fullUrl,
        method,
        data,
        header: finalHeader,
        success: (res) => {
          console.log('请求成功:', {
            url: path,
            statusCode: res.statusCode,
            data: res.data
          });
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            wx.showToast({ title: '登录过期，请重新登录', icon: 'none' });
            reject(new Error('Unauthorized'));
          } else {
            const errorMsg = res.data?.message || `HTTP ${res.statusCode}`;
            console.error('请求失败:', errorMsg);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error('网络请求失败:', {
            url: fullUrl,
            error: err
          });
          
          // 提供更详细的错误信息
          let errorMsg = '网络请求失败';
          if (err.errMsg) {
            errorMsg = err.errMsg;
          } else if (err.errno) {
            errorMsg = `网络错误 (errno: ${err.errno})`;
          }
          
          wx.showToast({
            title: '网络连接失败',
            icon: 'none'
          });
          
          reject(new Error(errorMsg));
        }
      });
    });
  },

  get(path, params = {}) {
    const query = Object.keys(params).length
      ? '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
    return this.request({ path: `${path}${query}`, method: 'GET' });
  },

  post(path, body = {}) {
    return this.request({ path, method: 'POST', data: body });
  },

  put(path, body = {}) {
    return this.request({ path, method: 'PUT', data: body });
  },

  delete(path) {
    return this.request({ path, method: 'DELETE' });
  },

  getFamilyInfo() {
    // 从本地存储获取家庭信息
    const familyInfo = wx.getStorageSync('familyInfo');
    if (familyInfo) {
      this.globalData.familyInfo = familyInfo;
      console.log('从本地存储获取家庭信息:', familyInfo);
    }
    
    // 从本地存储获取宝宝信息
    const babyInfo = wx.getStorageSync('babyInfo');
    if (babyInfo) {
      this.globalData.babyInfo = babyInfo;
      console.log('从本地存储获取宝宝信息:', babyInfo);
    }
    
    // 如果有家庭信息，获取最新的家庭成员列表
    if (familyInfo && familyInfo.id) {
      this.get(`/families/${familyInfo.id}/members`)
        .then(members => {
          console.log('获取家庭成员列表成功:', members);
          // 确保成员列表正确显示
          if (members && Array.isArray(members)) {
            // 更新家庭信息中的成员列表
            const updatedFamilyInfo = { ...familyInfo, members };
            this.globalData.familyInfo = updatedFamilyInfo;
            wx.setStorageSync('familyInfo', updatedFamilyInfo);
            console.log('更新后的家庭信息:', updatedFamilyInfo);
          } else {
            console.warn('成员列表数据格式不正确:', members);
          }
        })
        .catch(err => {
          console.error('获取家庭成员列表失败:', err);
          wx.showToast({
            title: '获取家庭成员失败',
            icon: 'none'
          });
        });
    }
  },

  addRecord(record) {
    const records = this.globalData.records;
    record.id = 'record_' + Date.now();
    record.createTime = new Date().toISOString();
    record.userId = this.globalData.userInfo.id;
    
    records.unshift(record);
    this.globalData.records = records;
    
    // 保存到本地存储
    wx.setStorageSync('records', records);
    
    // 分析数据并给出建议
    this.analyzeAndSuggest(record);
  },

  analyzeAndSuggest(record) {
    const today = new Date().toDateString();
    const todayRecords = this.globalData.records.filter(r => 
      new Date(r.createTime).toDateString() === today
    );
    
    if (record.type === 'feeding') {
      const totalAmount = todayRecords
        .filter(r => r.type === 'feeding')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // 根据宝宝月龄获取推荐值
      const babyAge = this.getBabyAge();
      const recommendation = this.getFeedingRecommendation(babyAge);
      
      if (totalAmount < recommendation.min) {
        wx.showToast({
          title: `今日喂养量${totalAmount}ml，建议增加喂奶`,
          icon: 'none',
          duration: 3000
        });
      } else if (totalAmount > recommendation.max) {
        wx.showToast({
          title: `今日喂养量${totalAmount}ml，非常棒！`,
          icon: 'success'
        });
      }
    }
  },

  getBabyAge() {
    // 这里应该从宝宝信息中获取月龄
    // 暂时返回默认值
    return '0-6';
  },

  getFeedingRecommendation(age) {
    return this.globalData.knowledgeBase[age]?.feeding || 
           this.globalData.knowledgeBase['0-6'].feeding;
  },

  /**
   * 调试方法：检查API地址配置
   */
  checkApiConfig() {
    console.log('=== API配置检查 ===');
    console.log('API Base URL:', this.globalData.apiBaseUrl);
    console.log('环境信息:', this.globalData.envInfo);
    console.log('是否为空:', this.globalData.apiBaseUrl === null);
    console.log('是否为字符串null:', this.globalData.apiBaseUrl === 'null');
    console.log('==================');
    
    return {
      apiBaseUrl: this.globalData.apiBaseUrl,
      envInfo: this.globalData.envInfo,
      isValid: this.globalData.apiBaseUrl && this.globalData.apiBaseUrl !== 'null'
    };
  }
});