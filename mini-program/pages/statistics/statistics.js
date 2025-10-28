const app = getApp();

Page({
  data: {
    currentRange: 'week',
    feedingStats: {},
    diaperStats: {},
    growthStats: {},
    feedingChartData: [],
    feedingChartConfig: { color: '#4A90E2', endColor: '#7ED321' },
    feedingTypeChartData: [],
    diaperChartData: [],
    growthChartData: [],
    growthChartConfig: { color: '#4A90E2' },
    timelineChartData: [],
    timelineChartConfig: { color: '#FFB74D' },
    analysis: []
  },

  onLoad() {
    console.log('统计页面加载');
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.id) {
      this.showAuthRequiredModal();
    } else {
      this.loadStatistics();
    }
  },

  onShow() {
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.id) {
      // 检查是否需要刷新宝宝数据
      if (app.globalData.needRefreshBabies) {
        console.log('检测到宝宝数据变更，刷新统计数据');
        app.globalData.needRefreshBabies = false;
      }
      this.loadStatistics();
    }
  },

  setTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({
      currentRange: range
    });
    // 清空之前的图表数据，确保重新渲染
    this.setData({
      feedingChartData: [],
      feedingTypeChartData: [],
      diaperChartData: [],
      growthChartData: [],
      timelineChartData: []
    });
    // 延迟加载统计数据
    setTimeout(() => {
      this.loadStatistics();
    }, 100);
  },

  loadStatistics() {
    // 直接从服务器获取记录数据，避免依赖全局变量
    const familyId = app.globalData.familyInfo?.id || 15;
    if (!familyId) {
      console.warn('未找到家庭信息');
      this.handleDataLoadError('未找到家庭信息');
      return;
    }

    console.log('从服务器获取记录数据, familyId:', familyId);
    
    // 获取当前选中的宝宝ID
    const currentBaby = app.globalData.babyInfo;
    const babyId = currentBaby?.id;
    
    if (!babyId) {
      wx.showToast({
        title: '请先选择一个宝宝',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '加载统计数据...',
      mask: true
    });
    
    // 使用 app.get 方法，会自动添加 token
    app.get(`/babies/${babyId}/records`)
      .then(records => {
        console.log('获取记录成功:', records);
        
        if (records && Array.isArray(records)) {
          app.globalData.records = records;
          this.calculateAllStats();
        } else {
          console.warn('记录数据格式不正确:', records);
          this.handleDataLoadError('数据格式错误');
        }
      })
      .catch(error => {
        console.error('获取记录数据失败:', error);
        this.handleDataLoadError(error.message || '网络请求失败');
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  handleDataLoadError(errorMsg) {
    console.log('数据加载失败:', errorMsg);
    wx.hideLoading();
    wx.showToast({
      title: '数据加载失败',
      icon: 'none',
      duration: 2000
    });
    
    // 设置空数据状态
    this.setData({
      feedingStats: {},
      diaperStats: {},
      growthStats: { hasData: false },
      feedingChartData: [],
      feedingTypeChartData: [],
      diaperChartData: [],
      growthChartData: [],
      timelineChartData: [],
      analysis: []
    });
  },

  calculateAllStats() {
    this.calculateFeedingStats();
    this.calculateDiaperStats();
    this.calculateGrowthStats();
    this.generateTimelineChart();
    this.generateAnalysis();
  },

  calculateFeedingStats() {
    const records = app.globalData.records || [];
    const { startDate, endDate } = this.getDateRange();
    
    console.log('计算喂养统计，记录数量:', records.length);
    
    const feedingRecords = records.filter(record => {
      const recordDate = new Date(record.happenedAt);
      return recordDate >= startDate && recordDate <= endDate && 
             ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type);
    });
    
    const totalAmount = feedingRecords.reduce((sum, record) => {
      if (record.type === 'BREASTFEEDING') {
        return sum + (record.durationMin * 10 || 0);
      } else {
        return sum + (record.amountMl || 0);
      }
    }, 0);
    
    const totalCount = feedingRecords.length;
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const feedingStats = {
      totalAmount,
      totalCount,
      avgAmount: totalCount > 0 ? Math.round(totalAmount / totalCount) : 0,
      avgDaily: Math.round(totalAmount / days),
      avgFrequency: Math.round(totalCount / days * 10) / 10
    };
    
    this.setData({
      feedingStats
    });
    
    this.generateFeedingChart(feedingRecords, startDate, endDate);
    this.generateFeedingTypeChart(feedingRecords);
  },

  generateFeedingChart(records, startDate, endDate) {
    console.log('生成喂养图表，记录数量:', records.length);
    const { currentRange } = this.data;
    let chartData = [];
    
    if (currentRange === 'month') {
      const weeks = this.getWeeksInMonth(startDate, endDate);
      weeks.forEach((week, index) => {
        const weekRecords = records.filter(record => {
          const recordDate = new Date(record.happenedAt);
          return recordDate >= week.start && recordDate <= week.end;
        });
        
        const weekAmount = weekRecords.reduce((sum, record) => {
          if (record.type === 'BREASTFEEDING') {
            return sum + (record.durationMin * 10 || 0);
          } else {
            return sum + (record.amountMl || 0);
          }
        }, 0);
        
        chartData.push({
          label: `第${index + 1}周`,
          value: weekAmount
        });
      });
    } else if (currentRange === 'quarter') {
      const months = this.getMonthsInQuarter(startDate, endDate);
      months.forEach((month, index) => {
        const monthRecords = records.filter(record => {
          const recordDate = new Date(record.happenedAt);
          return recordDate >= month.start && recordDate <= month.end;
        });
        
        const monthAmount = monthRecords.reduce((sum, record) => {
          if (record.type === 'BREASTFEEDING') {
            return sum + (record.durationMin * 10 || 0);
          } else {
            return sum + (record.amountMl || 0);
          }
        }, 0);
        
        chartData.push({
          label: `${month.start.getMonth() + 1}月`,
          value: monthAmount
        });
      });
    } else {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const maxDays = 7;
      
      for (let i = 0; i < Math.min(days, maxDays); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = this.formatDate(date);
        
        const dayRecords = records.filter(record => {
          const recordDate = this.formatDate(new Date(record.happenedAt));
          return recordDate === dateStr;
        });
        
        const dayAmount = dayRecords.reduce((sum, record) => {
          if (record.type === 'BREASTFEEDING') {
            return sum + (record.durationMin * 10 || 0);
          } else {
            return sum + (record.amountMl || 0);
          }
        }, 0);
        
        chartData.push({
          label: this.formatDateLabel(date),
          value: dayAmount
        });
      }
    }
    
    console.log('喂养图表数据:', chartData);
    this.setData({
      feedingChartData: chartData
    });
  },

  generateFeedingTypeChart(records) {
    if (records.length === 0) {
      this.setData({
        feedingTypeChartData: []
      });
      return;
    }
    
    // 统计喂养类型分布
    const typeCount = {};
    records.forEach(record => {
      const type = record.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    // 转换类型代码为中文显示
    const typeMap = {
      'BREASTFEEDING': '母乳亲喂',
      'BOTTLE': '瓶喂',
      'FORMULA': '配方奶',
      'SOLID': '辅食'
    };
    
    const data = Object.entries(typeCount).map(([type, count]) => {
      const displayType = typeMap[type] || type;
      return {
        label: displayType,
        value: count
      };
    });
    
    this.setData({
      feedingTypeChartData: data
    });
  },

  calculateDiaperStats() {
    const records = app.globalData.records || [];
    const { startDate, endDate } = this.getDateRange();
    
    const diaperRecords = records.filter(record => {
      const recordDate = new Date(record.happenedAt);
      return recordDate >= startDate && recordDate <= endDate && record.type === 'DIAPER';
    });
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // 统计性状分布
    const textureCount = {};
    diaperRecords.forEach(record => {
      const texture = record.diaperTexture;
      textureCount[texture] = (textureCount[texture] || 0) + 1;
    });
    
    const normalTextures = ['SOFT', 'NORMAL'];
    const normalCount = diaperRecords.filter(record => 
      normalTextures.includes(record.diaperTexture)
    ).length;
    
    const diaperStats = {
      totalCount: diaperRecords.length,
      avgDaily: Math.round(diaperRecords.length / days * 10) / 10,
      normalRate: diaperRecords.length > 0 ? Math.round(normalCount / diaperRecords.length * 100) : 0
    };
    
    this.setData({
      diaperStats
    });
    
    this.generateDiaperPieChart(textureCount);
  },

  generateDiaperPieChart(textureCount) {
    const total = Object.values(textureCount).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      this.setData({
        diaperChartData: []
      });
      return;
    }
    
    // 转换类型代码为中文显示
    const typeMap = {
      'WATERY': '稀',
      'SOFT': '软',
      'NORMAL': '成形',
      'HARD': '干硬'
    };
    
    const data = Object.entries(textureCount).map(([type, count]) => {
      const displayType = typeMap[type] || type;
      return {
        label: displayType,
        value: count
      };
    });
    
    this.setData({
      diaperChartData: data
    });
  },

  calculateGrowthStats() {
    const records = app.globalData.records || [];
    const growthRecords = records.filter(record => record.type === 'GROWTH')
                                .sort((a, b) => new Date(a.happenedAt) - new Date(b.happenedAt));
    
    if (growthRecords.length < 1) {
      this.setData({
        growthStats: { hasData: false },
        growthChartData: []
      });
      return;
    }
    
    const latest = growthRecords[growthRecords.length - 1];
    let growthStats = {
      hasData: true,
      latestHeight: latest.heightCm,
      latestWeight: latest.weightKg
    };
    
    if (growthRecords.length >= 2) {
      const first = growthRecords[0];
      const heightGain = (latest.heightCm - first.heightCm).toFixed(1);
      const weightGain = (latest.weightKg - first.weightKg).toFixed(1);
      const monthsDiff = this.getMonthsDiff(new Date(first.happenedAt), new Date(latest.happenedAt));
      const avgWeightGain = monthsDiff > 0 ? (weightGain / monthsDiff).toFixed(2) : '0.00';
      
      growthStats = {
        ...growthStats,
        heightGain,
        weightGain,
        avgWeightGain
      };
    }
    
    this.setData({
      growthStats
    });
    
    this.generateGrowthChart(growthRecords);
  },

  generateGrowthChart(records) {
    if (records.length < 2) {
      this.setData({
        growthChartData: []
      });
      return;
    }
    
    // 准备身高数据（使用cm作为单位）
    const data = records.map(record => ({
      label: this.formatDateForChart(record.happenedAt),
      value: record.heightCm
    }));
    
    this.setData({
      growthChartData: data
    });
  },

  generateTimelineChart() {
    const records = app.globalData.records || [];
    const { startDate, endDate } = this.getDateRange();
    
    // 按日期分组记录
    const dailyRecords = {};
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = this.formatDate(date);
      dailyRecords[dateStr] = 0;
    }
    
    // 统计每日记录数量
    records.forEach(record => {
      const recordDate = this.formatDate(new Date(record.happenedAt));
      if (dailyRecords.hasOwnProperty(recordDate)) {
        dailyRecords[recordDate]++;
      }
    });
    
    const data = Object.entries(dailyRecords)
                       .sort(([a], [b]) => a.localeCompare(b))
                       .map(([date, count]) => ({
                         label: this.formatDateLabel(new Date(date)),
                         value: count
                       }));
    
    this.setData({
      timelineChartData: data
    });
  },

  generateAnalysis() {
    const { feedingStats, diaperStats, growthStats } = this.data;
    const babyAge = app.getBabyAge ? app.getBabyAge() : 6;
    const recommendation = app.getFeedingRecommendation ? app.getFeedingRecommendation(babyAge) : { min: 600, max: 900 };
    
    const analysis = [];
    
    // 喂养分析
    if (feedingStats.avgDaily < recommendation.min) {
      analysis.push({
        icon: '⚠️',
        title: '喂养量偏低',
        description: `日均喂养量${feedingStats.avgDaily}ml，低于推荐值${recommendation.min}ml`,
        status: 'warning',
        statusText: '需关注'
      });
    } else if (feedingStats.avgDaily > recommendation.max) {
      analysis.push({
        icon: '✅',
        title: '喂养量充足',
        description: `日均喂养量${feedingStats.avgDaily}ml，超过推荐值${recommendation.max}ml`,
        status: 'good',
        statusText: '优秀'
      });
    } else {
      analysis.push({
        icon: '✅',
        title: '喂养量正常',
        description: `日均喂养量${feedingStats.avgDaily}ml，在正常范围内`,
        status: 'good',
        statusText: '正常'
      });
    }
    
    this.setData({
      analysis
    });
  },

  getDateRange() {
    const now = new Date();
    let startDate, endDate;
    
    switch (this.data.currentRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    return { startDate, endDate };
  },

  getMonthsDiff(date1, date2) {
    return (date2.getFullYear() - date1.getFullYear()) * 12 + 
           (date2.getMonth() - date1.getMonth());
  },

  getWeeksInMonth(startDate, endDate) {
    const weeks = [];
    let currentWeekStart = new Date(startDate);
    
    while (currentWeekStart <= endDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(weekEnd)
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      if (weeks.length >= 6) break;
    }
    
    return weeks;
  },

  getMonthsInQuarter(startDate, endDate) {
    const months = [];
    let currentMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentMonthStart <= endDate) {
      const monthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      if (monthEnd > endDate) {
        monthEnd.setTime(endDate.getTime());
      }
      
      months.push({
        start: new Date(currentMonthStart),
        end: new Date(monthEnd)
      });
      
      currentMonthStart.setMonth(currentMonthStart.getMonth() + 1);
      if (months.length >= 3) break;
    }
    
    return months;
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateLabel(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  },

  formatDateForChart(dateStr) {
    const date = new Date(dateStr);
    const { currentRange } = this.data;
    
    if (currentRange === 'quarter') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (currentRange === 'month') {
      return `${date.getDate()}日`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  },

  showAuthRequiredModal() {
    wx.showModal({
      title: '需要授权',
      content: '请先到【我的】页面进行授权，授权后才能使用小程序功能',
      showCancel: true,
      cancelText: '取消',
      confirmText: '去授权',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  }
});