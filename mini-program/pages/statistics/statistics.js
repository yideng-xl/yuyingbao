const app = getApp();

Page({
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

  onLoad() {
    console.log('统计页面加载');
    // 检查用户是否已授权
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.id) {
      // 未授权用户，显示提示并跳转到profile页面
      this.showAuthRequiredModal();
    } else {
      this.loadStatistics();
    }
  },

  onShow() {
    // 检查用户是否已授权
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.id) {
      this.loadStatistics();
    }
  },

  setTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({
      currentRange: range
    });
    this.loadStatistics();
  },

  loadStatistics() {
    // 从服务器获取记录数据
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      console.warn('未找到家庭信息');
      this.setData({
        feedingStats: {},
        diaperStats: {},
        growthStats: {},
        feedingChartOption: {},
        diaperChartOption: {},
        growthChartOption: {},
        analysis: []
      });
      return;
    }

    app.get(`/families/${familyId}/records`)
      .then(records => {
        console.log('从服务器获取的记录数据:', records);
        // 将获取到的记录保存到全局数据中
        app.globalData.records = records;
        // 计算统计数据
        this.calculateFeedingStats();
        this.calculateDiaperStats();
        this.calculateGrowthStats();
        this.generateTimelineChart();
        this.generateAnalysis();
      })
      .catch(error => {
        console.error('获取记录数据失败:', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
        // 即使失败也尝试使用现有数据计算统计
        this.calculateFeedingStats();
        this.calculateDiaperStats();
        this.calculateGrowthStats();
        this.generateAnalysis();
      });
  },

  calculateFeedingStats() {
    const records = app.globalData.records || [];
    const { startDate, endDate } = this.getDateRange();
    
    console.log('计算喂养统计，记录数量:', records.length);
    console.log('时间范围:', startDate, '到', endDate);
    
    const feedingRecords = records.filter(record => {
      const recordDate = new Date(record.happenedAt);
      return recordDate >= startDate && recordDate <= endDate && 
             ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type);
    });
    
    console.log('过滤后的喂养记录数量:', feedingRecords.length);
    
    const totalAmount = feedingRecords.reduce((sum, record) => {
      if (record.type === 'BREASTFEEDING') {
        // 母乳亲喂按时间估算，假设每分钟10ml
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

  calculateGrowthStats() {
    const records = app.globalData.records || [];
    const growthRecords = records.filter(record => record.type === 'GROWTH')
                                .sort((a, b) => new Date(a.happenedAt) - new Date(b.happenedAt));
    
    if (growthRecords.length < 2) {
      this.setData({
        growthStats: { hasData: false }
      });
      return;
    }
    
    const first = growthRecords[0];
    const latest = growthRecords[growthRecords.length - 1];
    
    const heightGain = (latest.heightCm - first.heightCm).toFixed(1);
    const weightGain = (latest.weightKg - first.weightKg).toFixed(1);
    
    const monthsDiff = this.getMonthsDiff(new Date(first.happenedAt), new Date(latest.happenedAt));
    const avgWeightGain = monthsDiff > 0 ? (weightGain / monthsDiff).toFixed(2) : '0.00';
    
    const growthStats = {
      hasData: true,
      latestHeight: latest.heightCm,
      latestWeight: latest.weightKg,
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
    console.log('生成喂养图表，记录数量:', records.length);
    const { currentRange } = this.data;
    let chartData = [];
    let categories = [];
    
    if (currentRange === 'month') {
      // 本月数据按周聚合显示，减少数据密度
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
        
        chartData.push(weekAmount);
        categories.push(`第${index + 1}周`);
      });
    } else if (currentRange === 'quarter') {
      // 本季度数据按月聚合显示，减少数据密度
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
        
        chartData.push(monthAmount);
        categories.push(`${month.start.getMonth() + 1}月`);
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
        
        chartData.push(dayAmount);
        categories.push(this.formatDateLabel(date));
      }
    }
    
    // 构建ECharts配置 - 优化版本
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(74, 144, 226, 0.1)'
          }
        },
        formatter: function(params) {
          const data = params[0];
          return `${data.name}<br/>喂养量: ${data.value}ml`;
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '20%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: {
          alignWithLabel: true,
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          interval: 0,
          rotate: categories.length > 6 ? 45 : 0
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
        barWidth: '50%',
        data: chartData,
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
              offset: 0.5,
              color: '#5BA0F2'
            }, {
              offset: 1,
              color: '#7ED321'
            }]
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: '#357ABD'
              }, {
                offset: 1,
                color: '#68B91A'
              }]
            }
          }
        },
        animationDelay: function (idx) {
          return idx * 100;
        }
      }]
    };
    
    // 如果没有数据，显示空状态
    if (chartData.length === 0) {
      console.log('没有图表数据，显示空状态');
      const emptyOption = {
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
      this.setData({
        feedingChartOption: {
          option: emptyOption
        }
      });
      return;
    }
    
    // 直接传递 option 对象
    console.log('设置喂养图表配置:', option);
    console.log('图表数据:', chartData);
    console.log('图表分类:', categories);
    
    this.setData({
      feedingChartOption: {
        option: option
      }
    });
  },

  generateFeedingTypeChart(records) {
    if (records.length === 0) {
      console.log('没有喂养类型数据，显示空状态');
      const emptyOption = {
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
      this.setData({
        feedingTypeChartOption: {
          option: emptyOption
        }
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
        value: count,
        name: `${displayType} (${count})`
      };
    });
    
    // 饼图颜色 - 喂养类型专用配色
    const colors = ['#4A90E2', '#7ED321', '#FFB74D', '#FF6B6B', '#9C27B0', '#00BCD4'];
    
    // 构建ECharts配置
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        formatter: function(params) {
          return `${params.name}<br/>次数: ${params.value} (${params.percent}%)`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '5%',
        left: 'center',
        data: data.map(item => item.name),
        textStyle: {
          color: '#666',
          fontSize: 12
        },
        itemGap: 8,
        itemWidth: 12,
        itemHeight: 12
      },
      series: [
        {
          name: '喂养类型',
          type: 'pie',
          radius: ['30%', '60%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.1)'
          },
          label: {
            show: false,
            position: 'center',
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333'
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            itemStyle: {
              shadowBlur: 15,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold',
              color: '#333'
            }
          },
          labelLine: {
            show: false
          },
          data: data,
          color: colors,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: function (idx) {
            return Math.random() * 150;
          }
        }
      ]
    };
    
    // 直接传递 option 对象
    this.setData({
      feedingTypeChartOption: {
        option: option
      }
    });
  },

  generateDiaperPieChart(textureCount) {
    const total = Object.values(textureCount).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      this.setData({
        diaperChartOption: {}
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
        value: count,
        name: `${displayType} (${count})`
      };
    });
    
    // 饼图颜色 - 优化配色
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'];
    
    // 构建ECharts配置 - 优化版本
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        formatter: function(params) {
          return `${params.name}<br/>次数: ${params.value} (${params.percent}%)`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '5%',
        left: 'center',
        data: data.map(item => item.name),
        textStyle: {
          color: '#666',
          fontSize: 12
        },
        itemGap: 10,
        itemWidth: 12,
        itemHeight: 12
      },
      series: [
        {
          name: '大便性状',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.1)'
          },
          label: {
            show: false,
            position: 'center',
            fontSize: 16,
            fontWeight: 'bold',
            color: '#333'
          },
          emphasis: {
            scale: true,
            scaleSize: 10,
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold',
              color: '#333'
            }
          },
          labelLine: {
            show: false
          },
          data: data,
          color: colors,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: function (idx) {
            return Math.random() * 200;
          }
        }
      ]
    };
    
    // 直接传递 option 对象
    this.setData({
      diaperChartOption: {
        option: option
      }
    });
  },

  generateGrowthChart(records) {
    if (records.length < 2) {
      this.setData({
        growthChartOption: {}
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
    
    // 准备身高和体重数据
    const heightData = filteredRecords.map(record => [
      this.formatDateForChart(record.happenedAt),
      record.heightCm
    ]);
    
    const weightData = filteredRecords.map(record => [
      this.formatDateForChart(record.happenedAt),
      record.weightKg
    ]);
    
    // 构建ECharts配置 - 优化版本
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: function(params) {
          let result = `${params[0].name}<br/>`;
          params.forEach(param => {
            result += `${param.seriesName}: ${param.value}${param.seriesName.includes('身高') ? 'cm' : 'kg'}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['身高(cm)', '体重(kg)'],
        top: '5%',
        left: 'center',
        textStyle: {
          color: '#666',
          fontSize: 12
        }
      },
      grid: {
        left: '12%',
        right: '12%',
        bottom: '20%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: heightData.map(item => item[0]),
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisTick: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: heightData.length > 6 ? 45 : 0
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '身高(cm)',
          position: 'left',
          axisLabel: {
            formatter: '{value}cm',
            color: '#666',
            fontSize: 12
          },
          axisLine: {
            lineStyle: {
              color: '#4A90E2'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#F0F0F0',
              type: 'dashed'
            }
          }
        },
        {
          type: 'value',
          name: '体重(kg)',
          position: 'right',
          axisLabel: {
            formatter: '{value}kg',
            color: '#666',
            fontSize: 12
          },
          axisLine: {
            lineStyle: {
              color: '#7ED321'
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '身高(cm)',
          type: 'line',
          yAxisIndex: 0,
          data: heightData.map(item => item[1]),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#4A90E2',
            borderColor: '#fff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{
                offset: 0,
                color: '#4A90E2'
              }, {
                offset: 1,
                color: '#5BA0F2'
              }]
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(74, 144, 226, 0.2)'
              }, {
                offset: 1,
                color: 'rgba(74, 144, 226, 0.05)'
              }]
            }
          },
          emphasis: {
            itemStyle: {
              color: '#357ABD',
              borderColor: '#fff',
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(74, 144, 226, 0.5)'
            }
          },
          animationDelay: function (idx) {
            return idx * 50;
          }
        },
        {
          name: '体重(kg)',
          type: 'line',
          yAxisIndex: 1,
          data: weightData.map(item => item[1]),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#7ED321',
            borderColor: '#fff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{
                offset: 0,
                color: '#7ED321'
              }, {
                offset: 1,
                color: '#8EE322'
              }]
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(126, 211, 33, 0.2)'
              }, {
                offset: 1,
                color: 'rgba(126, 211, 33, 0.05)'
              }]
            }
          },
          emphasis: {
            itemStyle: {
              color: '#68B91A',
              borderColor: '#fff',
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(126, 211, 33, 0.5)'
            }
          },
          animationDelay: function (idx) {
            return idx * 50 + 100;
          }
        }
      ]
    };
    
    // 直接传递 option 对象
    this.setData({
      growthChartOption: {
        option: option
      }
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
      dailyRecords[dateStr] = {
        date: dateStr,
        feeding: 0,
        diaper: 0,
        growth: 0
      };
    }
    
    // 统计每日记录数量
    records.forEach(record => {
      const recordDate = this.formatDate(new Date(record.happenedAt));
      if (dailyRecords[recordDate]) {
        if (['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type)) {
          dailyRecords[recordDate].feeding++;
        } else if (record.type === 'DIAPER') {
          dailyRecords[recordDate].diaper++;
        } else if (record.type === 'GROWTH') {
          dailyRecords[recordDate].growth++;
        }
      }
    });
    
    const dates = Object.keys(dailyRecords).sort();
    const feedingData = dates.map(date => dailyRecords[date].feeding);
    const diaperData = dates.map(date => dailyRecords[date].diaper);
    const growthData = dates.map(date => dailyRecords[date].growth);
    
    // 构建ECharts配置
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#4A90E2',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        }
      },
      legend: {
        data: ['喂养次数', '大便次数', '成长记录'],
        top: '5%',
        left: 'center',
        textStyle: {
          color: '#666',
          fontSize: 12
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '20%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates.map(date => this.formatDateLabel(new Date(date))),
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisTick: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: dates.length > 7 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}次',
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
      series: [
        {
          name: '喂养次数',
          type: 'line',
          data: feedingData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#4A90E2',
            borderColor: '#fff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: '#4A90E2'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(74, 144, 226, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(74, 144, 226, 0.05)'
              }]
            }
          }
        },
        {
          name: '大便次数',
          type: 'line',
          data: diaperData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#7ED321',
            borderColor: '#fff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: '#7ED321'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(126, 211, 33, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(126, 211, 33, 0.05)'
              }]
            }
          }
        },
        {
          name: '成长记录',
          type: 'line',
          data: growthData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#FFB74D',
            borderColor: '#fff',
            borderWidth: 2
          },
          lineStyle: {
            width: 3,
            color: '#FFB74D'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(255, 183, 77, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(255, 183, 77, 0.05)'
              }]
            }
          }
        }
      ]
    };
    
    // 直接传递 option 对象
    this.setData({
      timelineChartOption: {
        option: option
      }
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
  },

  /**
   * 显示需要授权的提示
   */
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