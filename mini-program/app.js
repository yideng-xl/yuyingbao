App({
  globalData: {
    apiBaseUrl: 'https://yuyingbao.yideng.ltd/api',
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
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.userInfo = userInfo;
      this.getFamilyInfo();
    } else {
      // 自动尝试登录
      this.autoLogin();
    }
  },

  /**
   * 自动登录流程
   */
  autoLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 获取用户信息并登录
          this.getUserProfileAndLogin(res.code);
        } else {
          console.log('登录失败！' + res.errMsg);
          this.showLoginModal();
        }
      },
      fail: () => {
        console.log('wx.login调用失败');
        this.showLoginModal();
      }
    });
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfileAndLogin(code, userInfo = null) {
    // 如果没有用户信息，使用默认信息登录
    const loginData = {
      code: code,
      nickname: userInfo?.nickName || '育婴宝用户',
      avatarUrl: userInfo?.avatarUrl || ''
    };

    this.loginToServer(loginData);
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
    wx.login({
      success: (res) => {
        if (res.code) {
          // 先尝试直接登录（使用默认信息）
          this.getUserProfileAndLogin(res.code);
        }
      }
    });
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
    wx.showLoading({ title: '登录中...' });
    
    wx.request({
      url: `${this.globalData.apiBaseUrl}/auth/wechat/login-complete`,
      method: 'POST',
      data: loginData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.token) {
          const { token, tokenType, userInfo } = res.data;
          const fullToken = `${tokenType || 'Bearer'} ${token}`;
          
          // 保存登录信息
          wx.setStorageSync('token', fullToken);
          wx.setStorageSync('userInfo', userInfo);
          
          // 更新全局数据
          this.globalData.userInfo = userInfo;
          
          // 登录成功后继续流程
          this.checkOrCreateFamily();
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          this.handleLoginError('登录失败，请重试');
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('登录请求失败:', err);
        this.handleLoginError('网络错误，请检查网络');
      }
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
      const token = wx.getStorageSync('token');
      const finalHeader = Object.assign(
        { 'Content-Type': 'application/json' },
        header,
        token ? { Authorization: token } : {}
      );
      wx.request({
        url: `${this.globalData.apiBaseUrl}${path}`,
        method,
        data,
        header: finalHeader,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            wx.showToast({ title: '登录过期，请重新登录', icon: 'none' });
            reject(new Error('Unauthorized'));
          } else {
            reject(new Error(res.data?.message || `HTTP ${res.statusCode}`));
          }
        },
        fail: (err) => reject(err)
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

  checkOrCreateFamily() {
    const familyInfo = wx.getStorageSync('familyInfo');
    if (familyInfo) {
      this.globalData.familyInfo = familyInfo;
    } else {
      // 创建新家庭
      this.createFamily();
    }
  },

  createFamily() {
    const name = (this.globalData.userInfo?.nickName || '我的') + '的家庭';
    this.post('/families', { name })
      .then((family) => {
        this.globalData.familyInfo = family;
        wx.setStorageSync('familyInfo', family);
      })
      .catch(() => {
        wx.showToast({ title: '创建家庭失败', icon: 'none' });
      });
  },

  generateInviteCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  },

  getFamilyInfo() {
    // 从本地存储获取家庭信息
    const familyInfo = wx.getStorageSync('familyInfo');
    if (familyInfo) {
      this.globalData.familyInfo = familyInfo;
    }
    
    // 从本地存储获取宝宝信息
    const babyInfo = wx.getStorageSync('babyInfo');
    if (babyInfo) {
      this.globalData.babyInfo = babyInfo;
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
  }
});
