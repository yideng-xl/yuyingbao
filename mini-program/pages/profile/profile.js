const app = getApp();

Page({
  data: {
    userInfo: {},
    familyInfo: {},
    babyInfo: {},
    isCreator: false,
    showBabyModal: false,
    babyForm: {}
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const userInfo = app.globalData.userInfo;
    const familyInfo = app.globalData.familyInfo;
    const babyInfo = app.globalData.babyInfo;

    const isCreator = false; // 无法从后端获取当前用户ID，对比 creatorUserId 暂不可用

    this.setData({ userInfo, familyInfo, babyInfo, isCreator });

    // 如果缺少用户信息，提示用户授权
    if (!userInfo || !userInfo.nickname || userInfo.nickname === '育婴宝用户') {
      this.setData({ needUserAuth: true });
    }

    // 如果未有本地宝宝信息且已有家庭，从后端加载宝宝列表
    if (!babyInfo && familyInfo?.id) {
      app.get(`/families/${familyInfo.id}/babies`).then(list => {
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

  /**
   * 用户信息授权
   */
  authorizeUserInfo() {
    app.getUserProfile((success, userInfo) => {
      if (success && userInfo) {
        // 更新全局用户信息
        const updatedUserInfo = {
          ...app.globalData.userInfo,
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        };
        
        app.globalData.userInfo = updatedUserInfo;
        wx.setStorageSync('userInfo', updatedUserInfo);
        
        this.setData({ 
          userInfo: updatedUserInfo,
          needUserAuth: false 
        });
        
        wx.showToast({
          title: '用户信息更新成功',
          icon: 'success'
        });
      }
    });
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

  copyInviteCode() {
    const { inviteCode } = this.data.familyInfo;
    
    wx.setClipboardData({
      data: inviteCode,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success'
        });
      }
    });
  },

  shareInvite() {
    const { familyInfo } = this.data;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    // 生成分享链接
    const shareUrl = `pages/invite/invite?code=${familyInfo.inviteCode}`;
    
    wx.showModal({
      title: '分享邀请',
      content: `邀请码：${familyInfo.inviteCode}\n\n您可以分享此邀请码给其他家庭成员，让他们加入您的家庭。`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  generateNewCode() {
    wx.showModal({
      title: '重新生成邀请码',
      content: '确定要重新生成邀请码吗？旧的邀请码将失效。',
      success: (res) => {
        if (res.confirm) {
          const familyId = this.data.familyInfo.id;
          // 后端未提供更新邀请码接口，这里仅刷新成员列表作为占位
          app.get(`/families/${familyId}/members`).then(() => {
            wx.showToast({ title: '操作成功', icon: 'success' });
          }).catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  removeMember(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.familyInfo.members.find(m => m.id === memberId);
    
    wx.showModal({
      title: '移除成员',
      content: `确定要移除 ${member.nickName} 吗？`,
      success: (res) => {
        if (res.confirm) {
          // 实际应调用后端移除成员接口，后端暂未提供，此处仅本地刷新列表
          const familyInfo = { ...this.data.familyInfo };
          familyInfo.members = familyInfo.members.filter(m => m.id !== memberId);
          this.setData({ familyInfo });
          
          wx.showToast({
            title: '成员已移除',
            icon: 'success'
          });
        }
      }
    });
  },

  editBabyInfo() {
    const { babyInfo } = this.data;
    
    this.setData({
      showBabyModal: true,
      babyForm: babyInfo ? { 
        id: babyInfo.id,
        name: babyInfo.name,
        gender: babyInfo.gender,
        birthDate: babyInfo.birthDate,
        birthHeight: babyInfo.height,
        birthWeight: babyInfo.weight
      } : {}
    });
  },

  addBabyInfo() {
    this.setData({
      showBabyModal: true,
      babyForm: {
        name: '',
        gender: '',
        birthDate: '',
        birthHeight: '',
        birthWeight: ''
      }
    });
  },

  hideBabyModal() {
    this.setData({
      showBabyModal: false,
      babyForm: {}
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // 宝宝信息表单事件
  onBabyNameChange(e) {
    this.setData({
      'babyForm.name': e.detail.value
    });
  },

  onBirthDateChange(e) {
    this.setData({
      'babyForm.birthDate': e.detail.value
    });
  },

  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'babyForm.gender': gender
    });
  },

  onBirthHeightChange(e) {
    this.setData({
      'babyForm.birthHeight': e.detail.value
    });
  },

  onBirthWeightChange(e) {
    this.setData({
      'babyForm.birthWeight': e.detail.value
    });
  },

  saveBabyInfo() {
    const { babyForm } = this.data;
    
    if (!babyForm.name || !babyForm.birthDate) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' });
      return;
    }

    const genderMap = { boy: 'BOY', girl: 'GIRL' };
    const payload = {
      name: babyForm.name,
      gender: genderMap[babyForm.gender] || 'UNKNOWN',
      birthDate: babyForm.birthDate,
      avatarUrl: babyForm.avatar,
      birthHeightCm: babyForm.birthHeight ? Number(babyForm.birthHeight) : undefined,
      birthWeightKg: babyForm.birthWeight ? Number(babyForm.birthWeight) : undefined
    };

    const isUpdate = babyForm.id; // 如果有ID，说明是更新
    const requestMethod = isUpdate ? 'put' : 'post';
    const requestPath = isUpdate ? `/families/${familyId}/babies/${babyForm.id}` : `/families/${familyId}/babies`;

    app.request({ path: requestPath, method: requestMethod, data: payload })
      .then(b => {
        const mapped = this.mapBabyInfo(b);
        app.globalData.babyInfo = mapped;
        wx.setStorageSync('babyInfo', mapped);
        this.setData({ babyInfo: mapped, showBabyModal: false });
        wx.showToast({ title: isUpdate ? '更新成功' : '保存成功', icon: 'success' });
      })
      .catch(err => {
        wx.showToast({ title: err.message || (isUpdate ? '更新失败' : '保存失败'), icon: 'none' });
      });
  },

  // 设置功能
  goToDataExport() {
    wx.showModal({
      title: '数据导出',
      content: '此功能将导出您所有的记录数据，支持Excel和PDF格式。',
      confirmText: '导出',
      success: (res) => {
        if (res.confirm) {
          // 这里应该实现数据导出功能
          wx.showToast({
            title: '导出功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  goToNotifications() {
    wx.showModal({
      title: '消息通知',
      content: '设置接收哪些类型的消息通知，包括喂养提醒、成长记录等。',
      confirmText: '设置',
      success: (res) => {
        if (res.confirm) {
          // 这里应该跳转到通知设置页面
          wx.showToast({
            title: '通知设置开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  goToPrivacy() {
    wx.showModal({
      title: '隐私设置',
      content: '管理您的隐私设置，包括数据共享、位置信息等。',
      confirmText: '设置',
      success: (res) => {
        if (res.confirm) {
          // 这里应该跳转到隐私设置页面
          wx.showToast({
            title: '隐私设置开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  goToAbout() {
    wx.showModal({
      title: '关于育婴宝',
      content: '版本：1.0.0\n\n育婴宝是一款专为新手父母设计的智能育儿工具，帮助您科学记录宝宝的成长数据，提供专业的育儿建议。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？退出后需要重新登录。',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('familyInfo');
          wx.removeStorageSync('babyInfo');
          wx.removeStorageSync('records');
          
          // 重置全局数据
          app.globalData.userInfo = null;
          app.globalData.familyInfo = null;
          app.globalData.babyInfo = null;
          app.globalData.records = [];
          
          // 重新登录
          app.login();
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});
