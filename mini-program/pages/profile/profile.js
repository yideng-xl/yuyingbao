const app = getApp();

Page({
  data: {
    userInfo: {},
    familyInfo: {},
    babyInfo: {},
    isCreator: false,
    showBabyModal: false,
    babyForm: {},
    showInviteModal: false,
    showJoinModal: false,
    showEditRoleModal: false,
    showCreateFamilyModal: false,
    inviteCode: '',
    joinCode: '',
    familyName: '',
    matchedFamily: null,
    selectedRole: '',
    editingMemberId: null
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

    console.log('加载用户数据:', { userInfo, familyInfo, babyInfo });

    // 检查当前用户是否是家庭创建者
    let isCreator = false;
    if (familyInfo && familyInfo.members) {
      const currentMember = familyInfo.members.find(member => member.userId === userInfo.id);
      isCreator = currentMember && currentMember.role === 'CREATOR';
      console.log('当前用户是否为创建者:', isCreator, '当前成员:', currentMember);
    }

    this.setData({ userInfo, familyInfo, babyInfo, isCreator });

    // 如果有家庭信息，获取最新的家庭成员列表（总是从服务器获取最新数据）
    if (familyInfo?.id) {
      // 不使用缓存数据，直接从服务器获取最新数据
      this.fetchFamilyMembersWithRetry(familyInfo.id, 3);
    } else if (userInfo && !familyInfo) {
      // 检查是否有有效的token
      const token = wx.getStorageSync('token');
      if (!token) {
        console.log('未找到有效token，跳过获取家庭信息');
        return;
      }
      
      // 如果用户已登录但没有家庭信息，尝试获取家庭信息
      console.log('用户已登录但没有家庭信息，尝试获取家庭信息');
      app.get('/families/my')
        .then(families => {
          console.log('获取我的家庭信息成功:', families);
          if (Array.isArray(families) && families.length > 0) {
            const family = families[0];
            app.globalData.familyInfo = family;
            wx.setStorageSync('familyInfo', family);
            this.setData({ familyInfo: family });
            
            // 获取家庭成员列表
            if (family.id) {
              this.fetchFamilyMembersWithRetry(family.id, 3);
            }
          } else {
            console.log('用户没有家庭信息');
          }
        })
        .catch(err => {
          console.error('获取我的家庭信息失败:', err);
        });
    }
  },

  // 带重试机制的获取家庭成员列表
  fetchFamilyMembersWithRetry(familyId, maxRetries) {
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    if (!token) {
      console.log('未找到有效token，跳过获取家庭成员列表');
      return;
    }
    
    app.get(`/families/${familyId}/members`)
      .then(members => {
        console.log('获取家庭成员列表成功:', members);
        const familyInfo = this.data.familyInfo || app.globalData.familyInfo;
        
        // 确保成员列表正确显示
        if (members && Array.isArray(members)) {
          console.log('处理后的成员列表:', members);
          // 更新家庭信息中的成员列表
          const updatedFamilyInfo = { ...familyInfo, members };
          app.globalData.familyInfo = updatedFamilyInfo;
          wx.setStorageSync('familyInfo', updatedFamilyInfo);
          this.setData({ familyInfo: updatedFamilyInfo });
        } else {
          console.warn('成员列表数据格式不正确:', members);
        }
      })
      .catch(err => {
        console.error('获取家庭成员列表失败:', err);
        
        // 如果还有重试次数，进行重试
        if (maxRetries > 0) {
          console.log(`重试获取家庭成员列表，剩余次数: ${maxRetries - 1}`);
          setTimeout(() => {
            this.fetchFamilyMembersWithRetry(familyId, maxRetries - 1);
          }, 1000); // 1秒后重试
        } else {
          wx.showToast({
            title: '获取家庭成员失败',
            icon: 'none'
          });
        }
      });
  },

  /**
   * 用户信息授权
   */
  authorizeUserInfo() {
    // 直接触发授权流程
    app.getUserProfile((success, userInfo) => {
      if (success && userInfo) {
        // 授权成功后先完成登录流程
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 使用授权的用户信息完成登录
              app.getUserProfileAndLogin(loginRes.code, userInfo)
                .then(() => {
                  // 登录成功后更新用户信息
                  const updatedUserInfo = app.globalData.userInfo;
                  this.setData({ 
                    userInfo: updatedUserInfo
                  });
                  
                  wx.showToast({
                    title: '授权成功',
                    icon: 'success'
                  });
                })
                .catch((error) => {
                  console.error('登录失败:', error);
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                  });
                });
            }
          },
          fail: (err) => {
            console.log('微信登录失败', err);
            wx.showToast({
              title: '微信登录失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 显示创建家庭弹窗
  showCreateFamilyModal() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo) {
      wx.showToast({
        title: '请先授权',
        icon: 'none'
      });
      return;
    }
    
    // 默认家庭名称为用户昵称 + "的家庭"
    const defaultFamilyName = (userInfo.nickname || '未知用户') + '的家庭';
    this.setData({
      showCreateFamilyModal: true,
      familyName: defaultFamilyName
    });
  },

  // 隐藏创建家庭弹窗
  hideCreateFamilyModal() {
    this.setData({
      showCreateFamilyModal: false,
      familyName: ''
    });
  },

  // 家庭名称输入
  onFamilyNameInput(e) {
    this.setData({
      familyName: e.detail.value
    });
  },

  // 创建家庭
  createFamily() {
    const { familyName } = this.data;
    const userInfo = app.globalData.userInfo;
    
    if (!familyName) {
      wx.showToast({
        title: '请输入家庭名称',
        icon: 'none'
      });
      return;
    }
    
    if (!userInfo) {
      wx.showToast({
        title: '请先授权',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    console.log('创建家庭时获取到的token:', token);
    if (!token) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '创建中...' });
    
    // 先检查家庭名称是否已存在
    app.post('/families/check-name', { name: familyName })
      .then(exists => {
        if (exists) {
          wx.hideLoading();
          wx.showToast({
            title: '家庭名称已存在',
            icon: 'none'
          });
          return;
        }
        
        // 创建家庭
        return app.post('/families', { name: familyName });
      })
      .then(family => {
        if (!family) return; // 如果前面检查名称存在，这里会是undefined
        
        // 获取家庭成员列表
        return app.get(`/families/${family.id}/members`)
          .then(members => {
            // 将成员列表添加到家庭信息中
            const familyWithMembers = {
              ...family,
              members: members
            };
            
            app.globalData.familyInfo = familyWithMembers;
            wx.setStorageSync('familyInfo', familyWithMembers);
            this.setData({ 
              familyInfo: familyWithMembers,
              showCreateFamilyModal: false,
              familyName: ''
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '家庭创建成功',
              icon: 'success'
            });
          });
      })
      .catch(error => {
        wx.hideLoading();
        console.error('创建家庭失败:', error);
        wx.showToast({ 
          title: '创建家庭失败', 
          icon: 'none' 
        });
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

  // 显示邀请成员弹窗
  showInviteModal() {
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
      return;
    }
    
    // 生成6位随机邀请码
    const inviteCode = Math.random().toString().substr(2, 6);
    this.setData({ 
      showInviteModal: true, 
      inviteCode: inviteCode 
    });
  },

  // 隐藏邀请成员弹窗
  hideInviteModal() {
    this.setData({ 
      showInviteModal: false, 
      inviteCode: '' 
    });
  },

  // 复制邀请码
  copyInviteCode() {
    const { inviteCode } = this.data;
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

  // 重新生成邀请码
  regenerateInviteCode() {
    const inviteCode = Math.random().toString().substr(2, 6);
    this.setData({ inviteCode });
  },

  // 显示加入家庭弹窗
  showJoinModal() {
    this.setData({ 
      showJoinModal: true,
      joinCode: '',
      matchedFamily: null
    });
  },

  // 隐藏加入家庭弹窗
  hideJoinModal() {
    this.setData({ 
      showJoinModal: false,
      joinCode: '',
      matchedFamily: null
    });
  },

  // 输入邀请码
  onJoinCodeInput(e) {
    const joinCode = e.detail.value;
    this.setData({ joinCode });
    
    // 如果输入了6位数字，尝试验证邀请码
    if (joinCode.length === 6 && /^\d+$/.test(joinCode)) {
      // 检查是否有有效的token
      const token = wx.getStorageSync('token');
      if (!token) {
        wx.showToast({
          title: '请重新登录',
          icon: 'none'
        });
        return;
      }
      
      // 调用后端API验证邀请码
      app.get(`/families/validate-invite-code/${joinCode}`)
        .then(family => {
          console.log('验证邀请码成功:', family);
          this.setData({
            matchedFamily: {
              name: family.name,
              memberCount: family.members ? family.members.length : 1
            }
          });
        })
        .catch(err => {
          console.error('邀请码验证失败:', err);
          // 邀请码无效
          this.setData({ matchedFamily: null });
          wx.showToast({
            title: '邀请码无效',
            icon: 'none'
          });
        });
    } else {
      this.setData({ matchedFamily: null });
    }
  },

  // 加入家庭
  joinFamily() {
    const { joinCode } = this.data;
    
    if (!joinCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '加入中...' });
    
    // 调用后端API加入家庭
    app.post('/families/join', { inviteCode: joinCode })
      .then(family => {
        wx.hideLoading();
        console.log('加入家庭成功:', family);
        // 更新全局家庭信息
        app.globalData.familyInfo = family;
        wx.setStorageSync('familyInfo', family);
        
        // 重新加载用户数据
        this.loadUserData();
        
        // 隐藏弹窗
        this.hideJoinModal();
        
        wx.showToast({
          title: '成功加入家庭',
          icon: 'success'
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加入家庭失败:', err);
        wx.showToast({
          title: '加入失败：' + (err.message || '未知错误'),
          icon: 'none'
        });
      });
  },

  // 显示编辑成员角色弹窗
  editMemberRole(e) {
    const memberId = e.currentTarget.dataset.memberId;
    const { familyInfo } = this.data;
    
    // 找到要编辑的成员
    const member = familyInfo.members.find(m => m.id === memberId);
    
    this.setData({
      showEditRoleModal: true,
      editingMemberId: memberId,
      selectedRole: member.memberRole || ''
    });
  },

  // 隐藏编辑成员角色弹窗
  hideEditRoleModal() {
    this.setData({
      showEditRoleModal: false,
      editingMemberId: null,
      selectedRole: ''
    });
  },

  // 选择角色
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role });
  },

  // 保存成员角色
  saveMemberRole() {
    const { familyInfo, editingMemberId, selectedRole } = this.data;
    
    if (!selectedRole) {
      wx.showToast({
        title: '请选择角色',
        icon: 'none'
      });
      return;
    }
    
    if (!familyInfo || !editingMemberId) {
      wx.showToast({
        title: '数据错误',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    // 调用后端API更新成员角色
    app.put(`/families/${familyInfo.id}/members/${editingMemberId}/role`, { memberRole: selectedRole })
      .then(updatedMember => {
        wx.hideLoading();
        console.log('更新成员角色成功:', updatedMember);
        // 更新本地数据
        const updatedMembers = familyInfo.members.map(member => {
          if (member.id === editingMemberId) {
            return {
              ...member,
              memberRole: updatedMember.memberRole,
              memberRoleDisplayName: updatedMember.memberRoleDisplayName
            };
          }
          return member;
        });
        
        const updatedFamilyInfo = { ...familyInfo, members: updatedMembers };
        app.globalData.familyInfo = updatedFamilyInfo;
        wx.setStorageSync('familyInfo', updatedFamilyInfo);
        
        this.setData({
          familyInfo: updatedFamilyInfo,
          showEditRoleModal: false,
          editingMemberId: null,
          selectedRole: ''
        });
        
        wx.showToast({
          title: '角色更新成功',
          icon: 'success'
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('更新成员角色失败:', err);
        wx.showToast({
          title: '更新失败：' + (err.message || '未知错误'),
          icon: 'none'
        });
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
    
    // 检查是否有有效的token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
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

  goToDebugPage() {
    wx.navigateTo({
      url: '/pages/debug/debug'
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
          
          // 清除全局数据
          app.globalData.userInfo = null;
          app.globalData.familyInfo = null;
          app.globalData.babyInfo = null;
          
          // 跳转到我的页面
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  },

  goToDebugPage() {
    wx.navigateTo({
      url: '/pages/debug/debug'
    });
  }
});