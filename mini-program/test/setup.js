// 用于存储Page实例
global.pageInstances = [];

// 创建一个模拟的app对象
const createMockApp = () => ({
  globalData: {
    userInfo: { id: 1, nickname: '测试用户', avatarUrl: 'test-avatar-url' },
    familyInfo: null,
    babyInfo: null
  },
  get: jest.fn().mockResolvedValue({}),
  post: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue({}),
  request: jest.fn().mockResolvedValue({}),
  getUserProfile: jest.fn()
});

// 创建全局app对象
global.mockApp = createMockApp();

// 模拟微信小程序API
global.wx = {
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  showToast: jest.fn(),
  redirectTo: jest.fn(),
  setClipboardData: jest.fn(),
  getUserProfile: jest.fn()
};

// 模拟getApp函数
global.getApp = jest.fn(() => global.mockApp);

// 模拟Page函数
global.Page = jest.fn((config) => {
  // 创建一个Page实例
  const pageInstance = {
    setData: jest.fn(),
    data: config.data || {},
    ...config
  };
  
  // 存储实例以便测试访问
  global.pageInstances.push(pageInstance);
  
  return pageInstance;
});