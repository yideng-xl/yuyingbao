const app = getApp();

Page({
  data: {
    currentRange: 'week',
    feedingStats: {},
    diaperStats: {},
    growthStats: {},
    feedingChart: [],
    diaperPieChart: [],
    growthChart: [],
    analysis: []
  },

  onLoad() {
    this.loadStatistics();
  },

  onShow() {
    this.loadStatistics();
  },

  setTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({
      currentRange: range
    });
    this.loadStatistics();
  },

  loadStatistics() {
    this.calculateFeedingStats();
    this.calculateDiaperStats();
    this.calculateGrowthStats();
    this.generateAnalysis();
  },

  calculateFeedingStats() {
    const records = app.globalData.records;
    const { startDate, endDate } = this.getDateRange();
    
    const feedingRecords = records.filter(record => {
      const recordDate = new Date(record.createTime);
      return recordDate >= startDate && recordDate <= endDate && 
             ['breastfeeding', 'bottle', 'formula', 'solid'].includes(record.type);
    });
    
    const totalAmount = feedingRecords.reduce((sum, record) => {
      if (record.type === 'breastfeeding') {
        // 母乳亲喂按时间估算，假设每分钟10ml
        return sum + (record.duration * 10);
      } else {
        return sum + (record.amount || 0);
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
  },

  calculateDiaperStats() {
    const records = app.globalData.records;
    const { startDate, endDate } = this.getDateRange();
    
    const diaperRecords = records.filter(record => {
      const recordDate = new Date(record.createTime);
      return recordDate >= startDate && recordDate <= endDate && record.type === 'diaper';
    });
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // 统计性状分布
    const textureCount = {};
    diaperRecords.forEach(record => {
      textureCount[record.texture] = (textureCount[record.texture] || 0) + 1;
    });
    
    const normalTextures = ['软', '成形'];
    const normalCount = diaperRecords.filter(record => 
      normalTextures.includes(record.texture)
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

  calculateGrowthStats() {
    const records = app.globalData.records;
    const growthRecords = records.filter(record => record.type === 'growth')
                                .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (growthRecords.length < 2) {
      this.setData({
        growthStats: { hasData: false }
      });
      return;
    }
    
    const first = growthRecords[0];
    const latest = growthRecords[growthRecords.length - 1];
    
    const heightGain = (latest.height - first.height).toFixed(1);
    const weightGain = (latest.weight - first.weight).toFixed(1);
    
    const monthsDiff = this.getMonthsDiff(new Date(first.date), new Date(latest.date));
    const avgWeightGain = monthsDiff > 0 ? (weightGain / monthsDiff).toFixed(2) : '0.00';
    
    const growthStats = {
      hasData: true,
      latestHeight: latest.height,
      latestWeight: latest.weight,
      heightGain,
      weightGain,
      avgWeightGain
    };
    
    this.setData({
      growthStats
    });
    
    this.generateGrowthChart(growthRecords);
  },

  generateFeedingChart(records, startDate, endDate) {
    const { currentRange } = this.data;
    let chartData = [];
    
    if (currentRange === 'month') {
      // 本月数据按周聚合显示，减少数据密度
      const weeks = this.getWeeksInMonth(startDate, endDate);
      
      weeks.forEach((week, index) => {
        const weekRecords = records.filter(record => {
          const recordDate = new Date(record.createTime);
          return recordDate >= week.start && recordDate <= week.end;
        });
        
        const weekAmount = weekRecords.reduce((sum, record) => {
          if (record.type === 'breastfeeding') {
            return sum + (record.duration * 10);
          } else {
            return sum + (record.amount || 0);
          }
        }, 0);
        
        chartData.push({
          date: week.start.toISOString(),
          amount: weekAmount,
          label: `第${index + 1}周`,
          height: weekAmount > 0 ? Math.min(weekAmount / 50, 100) : 0
        });
      });
    } else if (currentRange === 'quarter') {
      // 本季度数据按月聚合显示，减少数据密度
      const months = this.getMonthsInQuarter(startDate, endDate);
      
      months.forEach((month, index) => {
        const monthRecords = records.filter(record => {
          const recordDate = new Date(record.createTime);
          return recordDate >= month.start && recordDate <= month.end;
        });
        
        const monthAmount = monthRecords.reduce((sum, record) => {
          if (record.type === 'breastfeeding') {
            return sum + (record.duration * 10);
          } else {
            return sum + (record.amount || 0);
          }
        }, 0);
        
        chartData.push({
          date: month.start.toISOString(),
          amount: monthAmount,
          label: `${month.start.getMonth() + 1}月`,
          height: monthAmount > 0 ? Math.min(monthAmount / 200, 100) : 0
        });
      });
    } else {
      // 本周按日显示
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const maxDays = 7; // 本周最多7天
      
      for (let i = 0; i < Math.min(days, maxDays); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = this.formatDate(date);
        
        const dayRecords = records.filter(record => {
          const recordDate = this.formatDate(new Date(record.createTime));
          return recordDate === dateStr;
        });
        
        const dayAmount = dayRecords.reduce((sum, record) => {
          if (record.type === 'breastfeeding') {
            return sum + (record.duration * 10);
          } else {
            return sum + (record.amount || 0);
          }
        }, 0);
        
        chartData.push({
          date: dateStr,
          amount: dayAmount,
          label: this.formatDateLabel(date),
          height: dayAmount > 0 ? Math.min(dayAmount / 20, 100) : 0
        });
      }
    }
    
    this.setData({
      feedingChart: chartData
    });
  },

  generateDiaperPieChart(textureCount) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    const total = Object.values(textureCount).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      this.setData({
        diaperPieChart: []
      });
      return;
    }
    
    let currentAngle = 0;
    const pieData = Object.entries(textureCount).map(([type, count], index) => {
      const angle = (count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      return {
        type,
        count,
        color: colors[index % colors.length],
        angle,
        startAngle
      };
    });
    
    this.setData({
      diaperPieChart: pieData
    });
  },

  generateGrowthChart(records) {
    if (records.length < 2) {
      this.setData({
        growthChart: []
      });
      return;
    }
    
    // 根据时间范围调整数据点密度
    const { currentRange } = this.data;
    let filteredRecords = [...records];
    
    // 如果是本季度且数据点超过6个，进行抽样
    if (currentRange === 'quarter' && records.length > 6) {
      const step = Math.ceil(records.length / 6);
      filteredRecords = records.filter((_, index) => index % step === 0);
      // 确保包含最后一个数据点
      if (filteredRecords[filteredRecords.length - 1] !== records[records.length - 1]) {
        filteredRecords.push(records[records.length - 1]);
      }
    }
    // 如果是本月且数据点超过8个，进行抽样
    else if (currentRange === 'month' && records.length > 8) {
      const step = Math.ceil(records.length / 8);
      filteredRecords = records.filter((_, index) => index % step === 0);
      // 确保包含最后一个数据点
      if (filteredRecords[filteredRecords.length - 1] !== records[records.length - 1]) {
        filteredRecords.push(records[records.length - 1]);
      }
    }
    
    // 计算体重范围用于数据标准化
    const weights = filteredRecords.map(record => record.weight);
    const minWeight = Math.min(...weights) - 0.5;
    const maxWeight = Math.max(...weights) + 0.5;
    const weightRange = maxWeight - minWeight;
    
    const chartData = filteredRecords.map((record, index) => {
      const x = (index / (filteredRecords.length - 1)) * 100;
      const y = weightRange > 0 ? (1 - (record.weight - minWeight) / weightRange) * 100 : 50;
      
      return {
        date: this.formatDateForChart(record.date),
        height: record.height,
        weight: record.weight,
        x: x.toFixed(1),
        y: Math.max(5, Math.min(95, y)).toFixed(1) // 限制在合理范围内
      };
    });
    
    this.setData({
      growthChart: chartData
    });
  },

  generateAnalysis() {
    const { feedingStats, diaperStats, growthStats } = this.data;
    const babyAge = app.getBabyAge();
    const recommendation = app.getFeedingRecommendation(babyAge);
    
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
    
    // 大便分析
    if (diaperStats.avgDaily < 1) {
      analysis.push({
        icon: '⚠️',
        title: '大便次数偏少',
        description: `日均大便${diaperStats.avgDaily}次，建议关注`,
        status: 'warning',
        statusText: '需关注'
      });
    } else if (diaperStats.avgDaily > 5) {
      analysis.push({
        icon: '⚠️',
        title: '大便次数偏多',
        description: `日均大便${diaperStats.avgDaily}次，建议咨询医生`,
        status: 'warning',
        statusText: '需关注'
      });
    } else {
      analysis.push({
        icon: '✅',
        title: '大便次数正常',
        description: `日均大便${diaperStats.avgDaily}次，在正常范围内`,
        status: 'good',
        statusText: '正常'
      });
    }
    
    // 成长分析
    if (growthStats.hasData) {
      const avgWeightGain = parseFloat(growthStats.avgWeightGain);
      if (avgWeightGain < 0.3) {
        analysis.push({
          icon: '⚠️',
          title: '体重增长偏慢',
          description: `月均增重${growthStats.avgWeightGain}kg，建议关注`,
          status: 'warning',
          statusText: '需关注'
        });
      } else if (avgWeightGain > 1.0) {
        analysis.push({
          icon: '⚠️',
          title: '体重增长偏快',
          description: `月均增重${growthStats.avgWeightGain}kg，建议咨询医生`,
          status: 'warning',
          statusText: '需关注'
        });
      } else {
        analysis.push({
          icon: '✅',
          title: '体重增长正常',
          description: `月均增重${growthStats.avgWeightGain}kg，在正常范围内`,
          status: 'good',
          statusText: '正常'
        });
      }
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
      
      // 确保不超过月底
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(weekEnd)
      });
      
      // 移动到下一周
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      
      // 防止无限循环
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
      
      // 确保不超过季度末
      if (monthEnd > endDate) {
        monthEnd.setTime(endDate.getTime());
      }
      
      months.push({
        start: new Date(currentMonthStart),
        end: new Date(monthEnd)
      });
      
      // 移动到下一月
      currentMonthStart.setMonth(currentMonthStart.getMonth() + 1);
      
      // 防止无限循环
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
      // 季度显示月/日
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (currentRange === 'month') {
      // 月份显示日期
      return `${date.getDate()}日`;
    } else {
      // 周显示月/日
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
});
