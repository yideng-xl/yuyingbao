const app = getApp();

Page({
  data: {
    userInfo: {},
    babyInfo: {},
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
    this.initData();
  },

  onShow() {
    this.loadTodayStats();
    this.loadRecentRecords();
  },

  onTapLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        const userInfo = userRes.userInfo;
        app.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);

        wx.login({
          success: (res) => {
            if (res.code) {
              app.loginToServer(res.code, userInfo);
              this.setData({ userInfo });
              this.initData(); // 重新初始化数据，包括宝宝信息
              this.loadTodayStats();
              this.loadRecentRecords();
              wx.showToast({ title: '登录成功', icon: 'success' });
            } else {
              wx.showToast({ title: '登录失败，请重试', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '登录失败，请检查网络', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '需要授权才能使用', icon: 'none' });
      }
    });
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
    
    // 如果未有本地宝宝信息且已有家庭，从后端加载宝宝列表
    if (!app.globalData.babyInfo && app.globalData.familyInfo?.id) {
      app.get(`/families/${app.globalData.familyInfo.id}/babies`).then(list => {
        if (Array.isArray(list) && list.length > 0) {
          const b = list[0];
          const mapped = this.mapBabyInfo(b);
          app.globalData.babyInfo = mapped;
          wx.setStorageSync('babyInfo', mapped);
          this.setData({ babyInfo: mapped });
        }
      }).catch(() => {});
    }
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
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      this.setData({
        todayStats: {
          feedingTotal: 0,
          feedingCount: 0,
          diaperCount: 0
        }
      });
      return;
    }

    // 获取今天的开始和结束时间
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // 转换为ISO格式，确保包含时区信息
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    console.log('API Call URL:', `/families/${familyId}/records/filter?start=${startISO}&end=${endISO}`);

    app.get(`/families/${familyId}/records/filter`, {
      start: startISO,
      end: endISO
    }).then(records => {
      const feedingRecords = records.filter(r => ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(r.type));
      const diaperRecords = records.filter(r => r.type === 'DIAPER');
      
      const feedingTotal = feedingRecords.reduce((sum, r) => sum + (r.amountMl || 0), 0);
      
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
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      this.setData({ recentRecords: [] });
      return;
    }

    app.get(`/families/${familyId}/records`)
      .then(records => {
        console.log('Raw records from backend:', records);
        
        // 确保 records 是数组
        if (!Array.isArray(records)) {
          console.error('Records is not an array:', records);
          this.setData({ recentRecords: [] });
          return;
        }
        
        const recentRecords = records.slice(0, 5).map(record => {
          try {
            console.log('Processing record for recent records:', record.type, record.id);
            const formatted = this.formatRecordForDisplay(record);
            console.log('Formatted record result:', formatted);
            return formatted;
          } catch (error) {
            console.error('Error formatting record:', record, error);
            return null;
          }
        }).filter(record => record !== null); // 过滤掉 null 记录
        
        console.log('Final recentRecords array:', recentRecords);
        this.setData({ recentRecords });
      })
      .catch((error) => {
        console.error('Recent Records API Error:', error);
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
      'GROWTH': '📏'
    };
    
    const titles = {
      'BREASTFEEDING': '母乳亲喂',
      'BOTTLE': '瓶喂',
      'FORMULA': '配方奶',
      'SOLID': '辅食',
      'DIAPER': '大便',
      'GROWTH': '成长记录'
    };
    
    let detail = '';
    if (record.type === 'BREASTFEEDING') {
      detail = `${record.durationMin || 0}分钟 ${record.breastfeedingSide === 'LEFT' ? '左侧' : '右侧'}`;
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA') {
      detail = `${record.amountMl || 0}ml`;
    } else if (record.type === 'SOLID') {
      detail = record.note || '辅食';
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

  showRecordModal(e) {
    const type = e.currentTarget.dataset.type;
    const titles = {
      'breastfeeding': '母乳亲喂',
      'bottle': '瓶喂',
      'formula': '配方奶',
      'solid': '辅食',
      'diaper': '大便记录',
      'growth': '成长记录'
    };
    
    this.setData({
      showModal: true,
      recordType: type,
      modalTitle: titles[type],
      recordData: {
        startTime: this.formatTime(new Date()),
        date: this.formatDate(new Date())
      }
    });
  },

  hideModal() {
    this.setData({
      showModal: false,
      recordData: {}
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
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
      growth: 'GROWTH'
    };

    const payload = { type: typeMap[recordType] };
    // happenedAt 使用当前时间或由前端表单组合
    const nowIso = new Date().toISOString();
    payload.happenedAt = nowIso;

    if (recordType === 'breastfeeding') {
      payload.durationMin = Number(recordData.duration) || undefined;
      payload.breastfeedingSide = recordData.breast === 'left' ? 'LEFT' : 'RIGHT';
    } else if (recordType === 'bottle' || recordType === 'formula') {
      payload.amountMl = Number(recordData.amount) || undefined;
    } else if (recordType === 'solid') {
      payload.solidType = 'OTHER';
      payload.note = `${recordData.solidType || ''} ${recordData.solidAmount || ''}`.trim();
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
      payload.happenedAt = new Date(`${recordData.date || nowIso}`).toISOString();
      console.log('Growth record payload:', payload);
    }

    // 需要 babyId，若暂无选择，默认取全局 babyInfo.id（前端目前未从后端加载宝宝列表，先尝试本地）
    if (app.globalData.babyInfo?.id) {
      payload.babyId = app.globalData.babyInfo.id;
    } else {
      // 没有 babyId 时暂时不给后端，后端会校验；提示用户维护宝宝信息
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
    } else if (type === 'bottle' || type === 'formula') {
      if (!data.startTime || !data.amount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (type === 'solid') {
      if (!data.startTime || !data.solidType || !data.solidAmount) {
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

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    // 确保 date 是有效的 Date 对象
    if (!date || typeof date.getHours !== 'function' || isNaN(date.getTime())) {
      console.error('Invalid date object passed to formatTime:', date);
      return '--:--';
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
