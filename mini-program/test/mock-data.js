const MockData = {
  // 模拟记录数据
  mockRecords: [
    {
      id: 1,
      type: 'BREASTFEEDING',
      happenedAt: '2024-09-25T09:00:00.000Z',
      durationMin: 15,
      amountMl: null,
      note: '左侧母乳喂养'
    },
    {
      id: 2,
      type: 'BOTTLE',
      happenedAt: '2024-09-25T12:30:00.000Z',
      durationMin: null,
      amountMl: 120,
      note: '配方奶瓶喂'
    },
    {
      id: 3,
      type: 'DIAPER',
      happenedAt: '2024-09-25T10:15:00.000Z',
      diaperTexture: 'SOFT',
      note: '正常大便'
    },
    {
      id: 4,
      type: 'GROWTH',
      happenedAt: '2024-09-25T08:00:00.000Z',
      heightCm: 65.5,
      weightKg: 7.2,
      note: '每月体检'
    },
    {
      id: 5,
      type: 'FORMULA',
      happenedAt: '2024-09-26T14:00:00.000Z',
      amountMl: 150,
      note: '配方奶粉'
    },
    {
      id: 6,
      type: 'DIAPER',
      happenedAt: '2024-09-26T11:00:00.000Z',
      diaperTexture: 'NORMAL',
      note: '成形大便'
    },
    {
      id: 7,
      type: 'BREASTFEEDING',
      happenedAt: '2024-09-27T16:30:00.000Z',
      durationMin: 20,
      note: '右侧母乳喂养'
    },
    {
      id: 8,
      type: 'SOLID',
      happenedAt: '2024-09-27T18:00:00.000Z',
      amountMl: 80,
      note: '米糊辅食'
    }
  ],

  // 模拟全局应用数据
  mockApp: {
    globalData: {
      userInfo: {
        id: 'test-user-123',
        nickname: '测试用户'
      },
      familyInfo: {
        id: 'test-family-456'
      },
      records: null // 将由测试数据填充
    },
    // 模拟网络请求
    get: (url) => {
      console.log('模拟API请求:', url);
      return Promise.resolve(MockData.mockRecords);
    },
    // 模拟获取宝宝年龄
    getBabyAge: () => {
      return 6; // 6个月
    },
    // 模拟获取喂养建议
    getFeedingRecommendation: (age) => {
      return {
        min: 600,
        max: 900
      };
    }
  },

  // 初始化测试环境
  setupTestEnvironment: () => {
    // 模拟wx全局对象
    global.wx = {
      showToast: (options) => {
        console.log('Toast:', options.title);
      },
      showModal: (options) => {
        console.log('Modal:', options.title, options.content);
        // 模拟用户点击确认
        if (options.success) {
          options.success({ confirm: true });
        }
      },
      switchTab: (options) => {
        console.log('切换到标签页:', options.url);
      },
      getDeviceInfo: () => {
        return {
          SDKVersion: '2.9.0',
          pixelRatio: 2
        };
      },
      createSelectorQuery: () => {
        return {
          in: (component) => {
            return {
              select: (selector) => {
                return {
                  boundingClientRect: (callback) => {
                    // 模拟画布尺寸
                    callback({
                      width: 300,
                      height: 200
                    });
                    return { exec: () => {} };
                  },
                  fields: (fields) => {
                    return {
                      exec: (callback) => {
                        // 模拟canvas节点
                        const mockCanvas = {
                          node: {
                            getContext: () => ({
                              canvas: mockCanvas,
                              fillRect: () => {},
                              drawImage: () => {},
                              clearRect: () => {}
                            }),
                            createImage: () => {
                              return {
                                onload: null,
                                onerror: null,
                                src: ''
                              };
                            }
                          },
                          width: 300,
                          height: 200
                        };
                        callback([mockCanvas]);
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    };

    // 模拟getApp函数
    global.getApp = () => MockData.mockApp;

    console.log('测试环境初始化完成');
  },

  // 运行统计页面测试
  runStatisticsTest: () => {
    console.log('\n=== 开始统计页面测试 ===');
    
    MockData.setupTestEnvironment();
    
    // 设置测试数据
    MockData.mockApp.globalData.records = MockData.mockRecords;
    
    // 模拟统计页面逻辑（这里需要引入实际的统计页面代码）
    console.log('模拟数据准备完成，记录数量:', MockData.mockRecords.length);
    console.log('测试用户ID:', MockData.mockApp.globalData.userInfo.id);
    console.log('测试家庭ID:', MockData.mockApp.globalData.familyInfo.id);
    
    return {
      success: true,
      message: '测试数据准备完成',
      data: {
        recordsCount: MockData.mockRecords.length,
        feedingRecords: MockData.mockRecords.filter(r => ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(r.type)).length,
        diaperRecords: MockData.mockRecords.filter(r => r.type === 'DIAPER').length,
        growthRecords: MockData.mockRecords.filter(r => r.type === 'GROWTH').length
      }
    };
  }
};

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockData;
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.MockData = MockData;
}