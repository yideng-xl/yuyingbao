const app = getApp();

Page({
  data: {
    userInfo: {},
    babyInfo: {}, // 保留兼容性
    babies: [], // 所有宝宝列表
    selectedBaby: {}, // 当前选中的宝宝
    selectedBabyIndex: 0, // 选中的宝宝索引
    today: '',
    todayStats: {
      feedingTotal: 0,
      feedingCount: 0,
      diaperCount: 0
    },
    suggestion: '',
    recentRecords: [],
    showModal: false,
    recordType: '',
    modalTitle: '',
    recordData: {},
    
    // 选项数据
    solidTypes: ['米糊', '蔬菜泥', '水果泥', '肉泥', '蛋黄', '其他'],
    diaperTextures: ['稀', '软', '成形', '干硬'],
    diaperColors: ['黄', '绿', '黑', '棕']
  },

  onLoad() {
    // 检查用户是否已授权
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.id) {
      // 未授权用户，显示提示并跳转到profile页面
      this.showAuthRequiredModal();
    } else {
      this.initData();
    }
  },

  onShow() {
    // 检查用户是否已授权
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.id) {
      // 检查是否需要刷新宝宝数据
      if (app.globalData.needRefreshBabies) {
        console.log('检测到宝宝数据变更，重新加载');
        app.globalData.needRefreshBabies = false;
        this.loadBabies();
      } else {
        // 更新今天的日期
        this.setData({
          today: this.formatDate(new Date())
        });
        this.loadTodayStats();
        this.loadRecentRecords();
      }
    }
  },

  initData() {
    const userInfo = app.globalData.userInfo;
    let babyInfo = app.globalData.babyInfo || {
      name: '宝宝',
      avatar: '/images/baby-default.png'
    };
    
    // 如果有宝宝信息但没有年龄，计算年龄
    if (babyInfo && babyInfo.birthDate && !babyInfo.age) {
      babyInfo.age = this.calculateAge(babyInfo.birthDate);
    }
    
    this.setData({
      userInfo,
      babyInfo,
      today: this.formatDate(new Date())
    });
    
    // 加载宝宝列表
    this.loadBabies();
  },

  // 加载家庭中的所有宝宝
  loadBabies() {
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      console.log('No familyId found');
      return;
    }

    app.get(`/families/${familyId}/babies`).then(list => {
      if (Array.isArray(list) && list.length > 0) {
        const babies = list.map(b => this.mapBabyInfo(b))
          .sort((a, b) => a.id - b.id); // 按照宝宝ID升序排序
        
        // 选择默认宝宝（优先使用全局数据中的，否则选择第一个）
        let selectedBaby = babies[0];
        let selectedBabyIndex = 0;
        
        if (app.globalData.babyInfo?.id) {
          const currentIndex = babies.findIndex(b => b.id === app.globalData.babyInfo.id);
          if (currentIndex !== -1) {
            selectedBaby = babies[currentIndex];
            selectedBabyIndex = currentIndex;
          } else {
            // 当前选中的宝宝已被删除，选择第一个宝宝
            console.log('当前选中的宝宝已被删除，切换到第一个宝宝');
            selectedBaby = babies[0];
            selectedBabyIndex = 0;
          }
        }
        
        this.setData({
          babies,
          selectedBaby,
          selectedBabyIndex,
          babyInfo: selectedBaby // 保留兼容性
        });
        
        // 更新全局数据
        app.globalData.babyInfo = selectedBaby;
        wx.setStorageSync('babyInfo', selectedBaby);
        
        console.log('Loaded babies:', babies);
        console.log('Selected baby:', selectedBaby);
        
        // 加载选中宝宝的数据
        this.loadTodayStats();
        this.loadRecentRecords();
      } else {
        console.log('No babies found');
        this.setData({
          babies: [],
          selectedBaby: {},
          selectedBabyIndex: 0
        });
      }
    }).catch(err => {
      console.error('Failed to load babies:', err);
      this.setData({
        babies: [],
        selectedBaby: {},
        selectedBabyIndex: 0
      });
    });
  },

  // 宝宝选择变化事件（支持点击和picker两种方式）
  onBabyChange(e) {
    let index;
    
    // 处理不同的事件来源
    if (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index !== undefined) {
      // 来自点击事件
      index = parseInt(e.currentTarget.dataset.index);
    } else if (e.detail && e.detail.value !== undefined) {
      // 来自picker事件
      index = parseInt(e.detail.value);
    } else {
      console.error('Invalid baby change event:', e);
      return;
    }
    
    const selectedBaby = this.data.babies[index];
    if (!selectedBaby) {
      console.error('Selected baby not found at index:', index);
      return;
    }
    
    console.log('Baby selection changed:', selectedBaby);
    
    this.setData({
      selectedBaby,
      selectedBabyIndex: index,
      babyInfo: selectedBaby // 保留兼容性
    });
    
    // 更新全局数据
    app.globalData.babyInfo = selectedBaby;
    wx.setStorageSync('babyInfo', selectedBaby);
    
    // 重新加载选中宝宝的数据
    this.loadTodayStats();
    this.loadRecentRecords();
  },

  // 计算宝宝年龄
  calculateAge(birthDate) {
    if (!birthDate) return '0个月';
    
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30.44);
    const remainingDays = Math.floor(diffDays % 30.44);
    
    if (months === 0) {
      return `${remainingDays}天`;
    } else if (remainingDays === 0) {
      return `${months}个月`;
    } else {
      return `${months}个月零${remainingDays}天`;
    }
  },

  // 映射宝宝信息，包含年龄计算
  mapBabyInfo(baby) {
    // 计算月龄和天数
    let ageText = '0个月';
    if (baby.birthDate) {
      const birthDate = new Date(baby.birthDate);
      const now = new Date();
      const diffTime = Math.abs(now - birthDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30.44); // 平均每月30.44天
      const remainingDays = Math.floor(diffDays % 30.44);
      
      if (months === 0) {
        ageText = `${remainingDays}天`;
      } else if (remainingDays === 0) {
        ageText = `${months}个月`;
      } else {
        ageText = `${months}个月零${remainingDays}天`;
      }
    }

    return {
      id: baby.id,
      name: baby.name,
      gender: (baby.gender || '').toLowerCase(),
      birthDate: baby.birthDate,
      avatar: baby.avatarUrl || (baby.gender === 'BOY' ? '/images/baby-boy.png' : '/images/baby-girl.png'),
      height: baby.birthHeightCm,
      weight: baby.birthWeightKg,
      age: ageText
    };
  },

  loadTodayStats() {
    const currentBaby = this.data.selectedBaby || app.globalData.babyInfo;
    if (!currentBaby?.id) {
      this.setData({
        todayStats: {
          feedingTotal: 0,
          feedingCount: 0,
          diaperCount: 0
        }
      });
      return;
    }

    console.log('Loading today stats for baby:', currentBaby.id);

    // 优先尝试使用新的统计接口
    app.get(`/api/statistics/babies/${currentBaby.id}/today`).then(stats => {
      console.log('Statistics API response:', stats);
      
      // 解析统计数据
      const feeding = stats.feeding || {};
      const total = feeding.total || {};
      const diaper = stats.diaper || {};
      
      this.setData({
        todayStats: {
          feedingTotal: Math.round(total.amount || 0),
          feedingCount: total.count || 0,
          diaperCount: diaper.count || 0
        },
        suggestion: (stats.suggestions && stats.suggestions.length > 0) ? stats.suggestions[0] : ''
      });
    }).catch(error => {
      console.log('Statistics API failed, falling back to old method:', error);
      // 如果统计接口失败，还是回退到原来的方法
      this.loadTodayStatsLegacy();
    });
  },

  // 原来的统计加载方法（保留作为备用）
  loadTodayStatsLegacy() {
    const currentBaby = this.data.selectedBaby || app.globalData.babyInfo;
    if (!currentBaby?.id) {
      this.setData({
        todayStats: {
          feedingTotal: 0,
          feedingCount: 0,
          diaperCount: 0
        }
      });
      return;
    }

    // 获取今天的开始和结束时间（使用本地时区）
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // 转换为ISO格式，确保包含时区信息
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    console.log('API Call URL:', `/babies/${currentBaby.id}/records/filter?start=${startISO}&end=${endISO}`);

    app.get(`/babies/${currentBaby.id}/records/filter`, {
      start: startISO,
      end: endISO
    }).then(records => {
      const feedingRecords = records.filter(r => ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(r.type));
      const diaperRecords = records.filter(r => r.type === 'DIAPER');
      
      // 计算喂养总量，包括母乳亲喂（按10ml/分钟估算）和其它喂养类型
      const feedingTotal = feedingRecords.reduce((sum, r) => {
        if (r.type === 'BREASTFEEDING') {
          // 母乳亲喂按10ml/分钟估算
          return sum + (r.durationMin || 0) * 10;
        } else {
          // 其它喂养类型直接使用amountMl
          return sum + (r.amountMl || 0);
        }
      }, 0);
      
      this.setData({
        todayStats: {
          feedingTotal,
          feedingCount: feedingRecords.length,
          diaperCount: diaperRecords.length
        }
      });
      
      this.generateSuggestion();
    }).catch((error) => {
      console.error('API Error:', error);
      this.setData({
        todayStats: {
          feedingTotal: 0,
          feedingCount: 0,
          diaperCount: 0
        }
      });
    });
  },

  loadRecentRecords() {
    const currentBaby = this.data.selectedBaby || app.globalData.babyInfo;
    if (!currentBaby?.id) {
      this.setData({ recentRecords: [] });
      return;
    }

    // 获取今天的开始和结束时间（使用本地时区）
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // 转换为ISO格式，确保包含时区信息
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    console.log('加载今日记录，宝宝ID:', currentBaby.id, '时间范围:', startISO, '到', endISO);

    app.get(`/babies/${currentBaby.id}/records/filter`, {
      start: startISO,
      end: endISO
    }).then(records => {
      console.log('今日记录数据:', records);
      
      // 确保 records 是数组
      if (!Array.isArray(records)) {
        console.error('Records is not an array:', records);
        this.setData({ recentRecords: [] });
        return;
      }
      
      // 按时间倒序排列，取最新的5条记录
      const sortedRecords = records
        .sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
        .slice(0, 5);
      
      const recentRecords = sortedRecords.map(record => {
        try {
          console.log('Processing today record:', record.type, record.id);
          const formatted = this.formatRecordForDisplay(record);
          console.log('Formatted today record result:', formatted);
          return formatted;
        } catch (error) {
          console.error('Error formatting today record:', record, error);
          return null;
        }
      }).filter(record => record !== null); // 过滤掉 null 记录
      
      console.log('今日最近记录:', recentRecords);
      this.setData({ recentRecords });
    }).catch((error) => {
      console.error('今日记录 API 错误:', error);
      this.setData({ recentRecords: [] });
    });
  },

  formatRecordForDisplay(record) {
    console.log('Processing record:', record);
    console.log('Record type:', typeof record);
    console.log('Record keys:', Object.keys(record || {}));
    console.log('happenedAt:', record?.happenedAt, typeof record?.happenedAt);
    
    // 特别调试成长记录
    if (record?.type === 'GROWTH') {
      console.log('Found GROWTH record:', record);
      console.log('heightCm:', record.heightCm, 'weightKg:', record.weightKg);
    }
    
    // 确保 record 是对象
    if (!record || typeof record !== 'object') {
      console.error('Invalid record object:', record);
      return null;
    }
    
    const icons = {
      'BREASTFEEDING': '🤱',
      'BOTTLE': '🍼',
      'FORMULA': '🥛',
      'SOLID': '🥣',
      'DIAPER': '💩',
      'GROWTH': '📏',
      'WATER': '💧'  // 添加喂水记录图标
    };
    
    const titles = {
      'BREASTFEEDING': '母乳亲喂',
      'BOTTLE': '瓶喂',
      'FORMULA': '奶粉',
      'SOLID': '辅食',
      'DIAPER': '大便',
      'GROWTH': '成长记录',
      'WATER': '喂水'
    };
    
    let detail = '';
    if (record.type === 'BREASTFEEDING') {
      detail = `${record.durationMin || 0}分钟 ${record.breastfeedingSide === 'LEFT' ? '左侧' : '右侧'}`;
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA' || record.type === 'WATER') {
      // 喂水记录、瓶喂和奶粉记录使用相同的显示逻辑
      detail = `${record.amountMl || 0}ml`;
    } else if (record.type === 'SOLID') {
      // 修改：优先显示食材信息，如果有的话
      if (record.solidIngredients) {
        // 如果有食材信息，显示食材 + 喂养量 + 勺
        if (record.note) {
          const noteTrimmed = record.note.trim();
          const lastSpaceIndex = noteTrimmed.lastIndexOf(' ');
          
          if (lastSpaceIndex > 0) {
            // 提取喂食量
            const amountText = noteTrimmed.substring(lastSpaceIndex + 1);
            // 显示食材 + 喂养量 + 勺
            detail = `${record.solidIngredients} ${amountText}勺`;
          } else {
            // 如果没有空格，只显示食材
            detail = record.solidIngredients;
          }
        } else {
          // 如果没有note字段，只显示食材
          detail = record.solidIngredients;
        }
      } else if (record.note) {
        // 如果没有食材信息，回退到原来的逻辑
        const noteTrimmed = record.note.trim();
        const lastSpaceIndex = noteTrimmed.lastIndexOf(' ');
        
        if (lastSpaceIndex > 0) {
          // 分离类型和喂食量
          const typesText = noteTrimmed.substring(0, lastSpaceIndex);
          const amountText = noteTrimmed.substring(lastSpaceIndex + 1);
          
          // 显示类型 + 喂养量 + 勺
          detail = `${typesText} ${amountText}勺`;
        } else {
          // 如果没有空格，整个字符串都是类型信息
          detail = noteTrimmed;
        }
      } else {
        detail = '辅食';
      }
    } else if (record.type === 'DIAPER') {
      const textureMap = { 'WATERY': '稀', 'SOFT': '软', 'NORMAL': '成形', 'HARD': '干硬' };
      const colorMap = { 'YELLOW': '黄', 'GREEN': '绿', 'BROWN': '棕', 'BLACK': '黑' };
      const texture = textureMap[record.diaperTexture] || record.diaperTexture;
      const color = colorMap[record.diaperColor] || record.diaperColor;
      detail = `${texture} ${color}`;
    } else if (record.type === 'GROWTH') {
      detail = `身高${record.heightCm || 0}cm 体重${record.weightKg || 0}kg`;
      console.log('Formatted GROWTH detail:', detail);
    }
    
    let timeStr = '--:--';
    if (record.happenedAt) {
      try {
        const dateObj = new Date(record.happenedAt);
        console.log('Created Date object:', dateObj, 'isValid:', !isNaN(dateObj.getTime()));
        if (!isNaN(dateObj.getTime())) {
          timeStr = this.formatTime(dateObj);
        }
      } catch (error) {
        console.error('Error creating Date object:', error);
      }
    }
    
    const result = {
      id: record.id,
      icon: icons[record.type] || '📝',
      title: titles[record.type] || '记录',
      detail,
      time: timeStr
    };
    
    // 特别调试成长记录的最终结果
    if (record.type === 'GROWTH') {
      console.log('Final GROWTH record result:', result);
    }
    
    return result;
  },

  generateSuggestion() {
    const { feedingTotal, feedingCount } = this.data.todayStats;
    const babyAge = app.getBabyAge();
    const recommendation = app.getFeedingRecommendation(babyAge);
    
    let suggestion = '';
    if (feedingTotal < recommendation.min) {
      suggestion = `宝宝今日喂养量${feedingTotal}ml，建议适当增加喂奶次数`;
    } else if (feedingTotal > recommendation.max) {
      suggestion = `宝宝今日喂养量${feedingTotal}ml，非常棒！继续保持`;
    } else {
      suggestion = `宝宝今日喂养量${feedingTotal}ml，在正常范围内`;
    }
    
    this.setData({
      suggestion
    });
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
  },

  /**
   * 显示记录弹窗
   */
  showRecordModal(e) {
    // 检查用户是否已授权
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.id) {
      this.showAuthRequiredModal();
      return;
    }
    
    const type = e.currentTarget.dataset.type;
    const titles = {
      'breastfeeding': '母乳亲喂',
      'bottle': '瓶喂',
      'formula': '奶粉',
      'solid': '辅食',
      'diaper': '大便记录',
      'growth': '成长记录',
      'water': '喂水'
    };
    
    // 初始化recordData，根据不同类型设置默认值
    const recordData = {
      startTime: this.formatTime(new Date()),
      date: this.formatDate(new Date()) // 添加默认日期
    };
    
    // 如果是辅食类型，初始化多选相关数据
    if (type === 'solid') {
      recordData.selectedSolidTypes = [];
      recordData.selectedSolidTypeIndices = [];
      // 为每个辅食类型添加选中状态
      recordData.solidTypeSelections = {
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false
      };
      console.log('初始化辅食类型数据');
    }
    
    this.setData({
      showModal: true,
      recordType: type,
      modalTitle: titles[type],
      recordData: recordData
    });
    
    console.log('打开模态框，类型:', type);
  },

  hideModal() {
    this.setData({
      showModal: false
      // 不再清空recordData，避免丢失已选中的状态
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // 切换辅食类型选择
  toggleSolidType(e) {
    // 确保索引是数字类型
    const index = parseInt(e.currentTarget.dataset.index);
    
    // 获取当前选中状态
    const solidTypeSelections = this.data.recordData.solidTypeSelections || {};
    const isSelected = solidTypeSelections[index] || false;
    
    console.log('点击辅食类型，索引:', index, '当前选中状态:', isSelected);
    
    // 切换选中状态
    solidTypeSelections[index] = !isSelected;
    
    // 更新选中的索引和类型数组
    let selectedIndices = [];
    for (let i = 0; i < 6; i++) {
      if (solidTypeSelections[i]) {
        selectedIndices.push(i);
      }
    }
    
    const selectedTypes = selectedIndices.map(i => this.data.solidTypes[i]);
    
    console.log('更新后的选中索引:', selectedIndices);
    console.log('更新后的选中类型:', selectedTypes);
    
    // 更新数据
    const newRecordData = Object.assign({}, this.data.recordData, {
      solidTypeSelections: solidTypeSelections,
      selectedSolidTypeIndices: selectedIndices,
      selectedSolidTypes: selectedTypes
    });
    
    this.setData({
      recordData: newRecordData
    });
  },

  // 表单事件处理
  onTimeChange(e) {
    this.setData({
      'recordData.startTime': e.detail.value
    });
  },

  onDateChange(e) {
    this.setData({
      'recordData.date': e.detail.value
    });
  },

  onDurationChange(e) {
    this.setData({
      'recordData.duration': e.detail.value
    });
  },

  onAmountChange(e) {
    this.setData({
      'recordData.amount': e.detail.value
    });
  },

  onSolidTypeChange(e) {
    this.setData({
      'recordData.solidTypeIndex': e.detail.value,
      'recordData.solidType': this.data.solidTypes[e.detail.value]
    });
  },

  onSolidAmountChange(e) {
    this.setData({
      'recordData.solidAmount': e.detail.value
    });
  },

  onSolidIngredientsChange(e) {
    this.setData({
      'recordData.solidIngredients': e.detail.value
    });
  },

  onSolidBrandChange(e) {
    this.setData({
      'recordData.solidBrand': e.detail.value
    });
  },

  onSolidOriginChange(e) {
    this.setData({
      'recordData.solidOrigin': e.detail.value
    });
  },

  onTextureChange(e) {
    this.setData({
      'recordData.textureIndex': e.detail.value,
      'recordData.texture': this.data.diaperTextures[e.detail.value]
    });
  },

  onColorChange(e) {
    this.setData({
      'recordData.colorIndex': e.detail.value,
      'recordData.color': this.data.diaperColors[e.detail.value]
    });
  },

  onNoteChange(e) {
    this.setData({
      'recordData.note': e.detail.value
    });
  },

  onHeightChange(e) {
    this.setData({
      'recordData.height': e.detail.value
    });
  },

  onWeightChange(e) {
    this.setData({
      'recordData.weight': e.detail.value
    });
  },

  selectBreast(e) {
    const breast = e.currentTarget.dataset.breast;
    this.setData({
      'recordData.breast': breast
    });
  },

  saveRecord() {
    const { recordType, recordData } = this.data;
    
    if (!this.validateRecord(recordType, recordData)) {
      return;
    }
    
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' });
      return;
    }

    // 前端类型映射到后端枚举
    const typeMap = {
      breastfeeding: 'BREASTFEEDING',
      bottle: 'BOTTLE',
      formula: 'FORMULA',
      solid: 'SOLID',
      diaper: 'DIAPER',
      growth: 'GROWTH',
      water: 'WATER'  // 添加喂水记录类型
    };

    const payload = { type: typeMap[recordType] };
    
    // 使用用户选择的时间而不是当前系统时间
    // 对于成长记录，使用选择的日期；对于其他记录，使用选择的日期和时间组合
    if (recordType === 'growth') {
      // 成长记录使用选择的日期
      if (recordData.date) {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date(recordData.date).toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    } else {
      // 其他记录使用选择的日期加上选择的时间
      if (recordData.date && recordData.startTime) {
        const [hours, minutes] = recordData.startTime.split(':');
        const recordDate = new Date(recordData.date);
        recordDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = recordDate.toISOString();
      } else if (recordData.date) {
        // 只选择了日期，使用日期的开始时间
        const recordDate = new Date(recordData.date);
        recordDate.setHours(0, 0, 0, 0);
        payload.happenedAt = recordDate.toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    }

    if (recordType === 'breastfeeding') {
      payload.durationMin = Number(recordData.duration) || undefined;
      payload.breastfeedingSide = recordData.breast === 'left' ? 'LEFT' : 'RIGHT';
    } else if (recordType === 'bottle' || recordType === 'formula' || recordType === 'water') {
      // 喂水记录和瓶喂、奶粉记录使用相同的字段
      payload.amountMl = Number(recordData.amount) || undefined;
    } else if (recordType === 'solid') {
      payload.solidType = 'OTHER';
      // 使用多选的辅食类型
      const solidTypeText = (recordData.selectedSolidTypes || []).join(', ');
      payload.note = `${solidTypeText} ${recordData.solidAmount || ''}`.trim();
      // 新增：添加辅食增强字段
      payload.solidIngredients = recordData.solidIngredients || undefined;
      payload.solidBrand = recordData.solidBrand || undefined;
      payload.solidOrigin = recordData.solidOrigin || undefined;
    } else if (recordType === 'diaper') {
      const textureMap = { '稀': 'WATERY', '软': 'SOFT', '成形': 'NORMAL', '干硬': 'HARD' };
      const colorMap = { '黄': 'YELLOW', '绿': 'GREEN', '棕': 'BROWN', '黑': 'BLACK' };
      payload.diaperTexture = textureMap[recordData.texture] || undefined;
      payload.diaperColor = colorMap[recordData.color] || undefined;
      payload.hasUrine = undefined;
      payload.note = recordData.note;
    } else if (recordType === 'growth') {
      payload.heightCm = Number(recordData.height) || undefined;
      payload.weightKg = Number(recordData.weight) || undefined;
    }

    // 需要 babyId，优先使用当前选中的宝宝
    const currentBaby = this.data.selectedBaby || app.globalData.babyInfo;
    if (currentBaby?.id) {
      payload.babyId = currentBaby.id;
    } else {
      // 没有 babyId 时提示用户维护宝宝信息
      wx.showToast({ title: '请在个人中心完善宝宝信息', icon: 'none' });
      return;
    }

    app.post(`/families/${familyId}/records`, payload)
      .then(() => {
        this.hideModal();
        // 刷新数据以显示新记录
        this.loadTodayStats();
        this.loadRecentRecords();
        wx.showToast({ title: '记录成功', icon: 'success' });
      })
      .catch(err => {
        wx.showToast({ title: err.message || '记录失败', icon: 'none' });
      });
  },

  validateRecord(type, data) {
    if (type === 'breastfeeding') {
      if (!data.startTime || !data.duration || !data.breast) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (type === 'bottle' || type === 'formula' || type === 'water') {
      // 喂水记录、瓶喂和奶粉记录使用相同的验证逻辑
      if (!data.startTime || !data.amount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (type === 'solid') {
      // 修改验证逻辑以适应多选
      if (!data.startTime || !data.selectedSolidTypes || data.selectedSolidTypes.length === 0 || !data.solidAmount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (type === 'diaper') {
      if (!data.startTime || !data.texture || !data.color) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (type === 'growth') {
      if (!data.date || !data.height || !data.weight) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },

  goToRecords() {
    wx.switchTab({
      url: '/pages/record/record'
    });
  },

  // 格式化日期为 YYYY-MM-DD 格式
  formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化时间为 HH:MM 格式
  formatTime(date) {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 添加本地时间转ISO字符串的辅助函数
  toLocalISOString(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },
});