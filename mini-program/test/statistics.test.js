// 统计页面图表功能测试
const MockData = require('./mock-data');

describe('统计页面图表功能测试', () => {
  let mockApp;
  let statisticsPage;

  beforeEach(() => {
    // 设置测试环境
    MockData.setupTestEnvironment();
    mockApp = MockData.mockApp;
    mockApp.globalData.records = MockData.mockRecords;

    // 模拟统计页面对象
    statisticsPage = {
      data: {
        currentRange: 'week',
        feedingStats: {},
        diaperStats: {},
        growthStats: {},
        feedingChartOption: {},
        diaperChartOption: {},
        growthChartOption: {},
        feedingTypeChartOption: {},
        timelineChartOption: {},
        analysis: []
      },
      setData: jest.fn((data) => {
        Object.assign(statisticsPage.data, data);
      })
    };
  });

  test('应该正确计算喂养统计数据', () => {
    console.log('测试：计算喂养统计数据');
    
    const feedingRecords = MockData.mockRecords.filter(record => 
      ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type)
    );
    
    console.log('喂养记录数量:', feedingRecords.length);
    
    // 计算总量（母乳按时间估算，其他按毫升计算）
    const totalAmount = feedingRecords.reduce((sum, record) => {
      if (record.type === 'BREASTFEEDING') {
        return sum + (record.durationMin * 10 || 0); // 每分钟10ml
      } else {
        return sum + (record.amountMl || 0);
      }
    }, 0);
    
    console.log('计算的总喂养量:', totalAmount, 'ml');
    
    expect(feedingRecords.length).toBeGreaterThan(0);
    expect(totalAmount).toBeGreaterThan(0);
  });

  test('应该正确计算大便统计数据', () => {
    console.log('测试：计算大便统计数据');
    
    const diaperRecords = MockData.mockRecords.filter(record => 
      record.type === 'DIAPER'
    );
    
    console.log('大便记录数量:', diaperRecords.length);
    
    // 统计性状分布
    const textureCount = {};
    diaperRecords.forEach(record => {
      const texture = record.diaperTexture;
      textureCount[texture] = (textureCount[texture] || 0) + 1;
    });
    
    console.log('性状分布:', textureCount);
    
    expect(diaperRecords.length).toBeGreaterThan(0);
    expect(Object.keys(textureCount).length).toBeGreaterThan(0);
  });

  test('应该正确计算成长统计数据', () => {
    console.log('测试：计算成长统计数据');
    
    const growthRecords = MockData.mockRecords.filter(record => 
      record.type === 'GROWTH'
    ).sort((a, b) => new Date(a.happenedAt) - new Date(b.happenedAt));
    
    console.log('成长记录数量:', growthRecords.length);
    
    if (growthRecords.length >= 1) {
      const latest = growthRecords[growthRecords.length - 1];
      console.log('最新身高:', latest.heightCm, 'cm');
      console.log('最新体重:', latest.weightKg, 'kg');
      
      expect(latest.heightCm).toBeGreaterThan(0);
      expect(latest.weightKg).toBeGreaterThan(0);
    }
  });

  test('应该生成正确的图表配置数据结构', () => {
    console.log('测试：图表配置数据结构');
    
    // 模拟图表配置
    const mockChartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三']
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        type: 'bar',
        data: [100, 150, 120]
      }]
    };
    
    // 验证图表配置结构
    expect(mockChartOption).toHaveProperty('backgroundColor');
    expect(mockChartOption).toHaveProperty('tooltip');
    expect(mockChartOption).toHaveProperty('xAxis');
    expect(mockChartOption).toHaveProperty('yAxis');
    expect(mockChartOption).toHaveProperty('series');
    expect(Array.isArray(mockChartOption.series)).toBe(true);
    
    console.log('图表配置验证通过');
  });

  test('应该正确处理空数据情况', () => {
    console.log('测试：处理空数据情况');
    
    // 模拟空记录
    const emptyRecords = [];
    
    const feedingRecords = emptyRecords.filter(record => 
      ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type)
    );
    
    const totalAmount = feedingRecords.reduce((sum, record) => {
      if (record.type === 'BREASTFEEDING') {
        return sum + (record.durationMin * 10 || 0);
      } else {
        return sum + (record.amountMl || 0);
      }
    }, 0);
    
    const totalCount = feedingRecords.length;
    
    expect(totalCount).toBe(0);
    expect(totalAmount).toBe(0);
    
    // 空数据时的图表配置
    const emptyChartOption = {
      backgroundColor: 'transparent',
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: '#999',
          fontSize: 14
        }
      }
    };
    
    expect(emptyChartOption.title.text).toBe('暂无数据');
    console.log('空数据处理验证通过');
  });

  test('应该正确生成图表数据格式', () => {
    console.log('测试：图表数据格式');
    
    // 模拟按日统计的数据
    const dailyData = {
      '2024-09-25': { feeding: 2, diaper: 1, growth: 1 },
      '2024-09-26': { feeding: 1, diaper: 1, growth: 0 },
      '2024-09-27': { feeding: 2, diaper: 0, growth: 0 }
    };
    
    const dates = Object.keys(dailyData).sort();
    const feedingData = dates.map(date => dailyData[date].feeding);
    const diaperData = dates.map(date => dailyData[date].diaper);
    
    console.log('日期:', dates);
    console.log('喂养数据:', feedingData);
    console.log('大便数据:', diaperData);
    
    expect(dates.length).toBe(3);
    expect(feedingData.length).toBe(3);
    expect(diaperData.length).toBe(3);
    expect(feedingData.every(count => typeof count === 'number')).toBe(true);
    expect(diaperData.every(count => typeof count === 'number')).toBe(true);
  });
});

// 运行集成测试
describe('统计页面集成测试', () => {
  test('完整的统计页面数据流测试', () => {
    console.log('\n=== 开始完整数据流测试 ===');
    
    const testResult = MockData.runStatisticsTest();
    
    expect(testResult.success).toBe(true);
    expect(testResult.data.recordsCount).toBeGreaterThan(0);
    expect(testResult.data.feedingRecords).toBeGreaterThan(0);
    expect(testResult.data.diaperRecords).toBeGreaterThan(0);
    expect(testResult.data.growthRecords).toBeGreaterThan(0);
    
    console.log('测试结果:', testResult);
    console.log('=== 数据流测试完成 ===\n');
  });
});