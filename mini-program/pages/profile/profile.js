const app = getApp();

Page({
  data: {
    userInfo: {},
    familyInfo: {},
    babyInfo: {}, // 保留兼容性
    babies: [], // 所有宝宝列表
    selectedBaby: {}, // 当前选中的宝宝
    selectedBabyIndex: 0,
    isCreator: false,
    showBabyModal: false,
    babyForm: {},
    showInviteModal: false,
    showJoinModal: false,
    showEditRoleModal: false,
    showCreateFamilyModal: false,
    showBabyListModal: false,
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

    // 加载宝宝列表
    if (familyInfo?.id) {
      this.loadBabies();
    }

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
              this.loadBabies(); // 加载宝宝列表
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
    console.log('Mapping baby info for:', baby);
    
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

    const mappedBaby = {
      id: baby.id,
      name: baby.name,
      gender: (baby.gender || '').toLowerCase(),
      birthDate: baby.birthDate,
      avatar: baby.avatarUrl || (baby.gender === 'BOY' ? '/images/baby-boy.png' : '/images/baby-girl.png'),
      height: baby.birthHeightCm,
      weight: baby.birthWeightKg,
      age: ageText
    };
    
    console.log('Mapped baby result:', mappedBaby);
    return mappedBaby;
  },

  // 加载家庭中的所有宝宝
  loadBabies() {
    const familyId = this.data.familyInfo?.id;
    if (!familyId) {
      console.log('No familyId found');
      return;
    }

    console.log('Loading babies for familyId:', familyId);
    const apiUrl = `/families/${familyId}/babies`;
    console.log('API URL:', apiUrl);

    app.get(apiUrl).then(list => {
      console.log('API response - raw list:', list);
      console.log('List type:', typeof list);
      console.log('Is array:', Array.isArray(list));
      console.log('List length:', list ? list.length : 'null/undefined');
      
      if (Array.isArray(list) && list.length > 0) {
        console.log('Processing babies list:', list);
        const babies = list.map(b => {
          console.log('Processing baby:', b);
          return this.mapBabyInfo(b);
        });
        
        console.log('Mapped babies:', babies);
        
        // 选择默认宝宝（优先使用全局数据中的，否则选择第一个）
        let selectedBaby = babies[0];
        let selectedBabyIndex = 0;
        
        if (app.globalData.babyInfo?.id) {
          const currentIndex = babies.findIndex(b => b.id === app.globalData.babyInfo.id);
          if (currentIndex !== -1) {
            selectedBaby = babies[currentIndex];
            selectedBabyIndex = currentIndex;
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
        
        console.log('Final - Loaded babies:', babies);
        console.log('Final - Selected baby:', selectedBaby);
      } else {
        console.log('No babies found or empty array');
        this.setData({
          babies: [],
          selectedBaby: {},
          selectedBabyIndex: 0,
          babyInfo: {} // 保留兼容性
        });
      }
    }).catch(err => {
      console.error('Failed to load babies:', err);
      console.error('Error details:', err.message);
      this.setData({
        babies: [],
        selectedBaby: {},
        selectedBabyIndex: 0,
        babyInfo: {} // 保留兼容性
      });
    });
  },

  // 显示宝宝列表管理模态框
  showBabyListModal() {
    this.setData({
      showBabyListModal: true
    });
  },

  // 隐藏宝宝列表管理模态框
  hideBabyListModal() {
    this.setData({
      showBabyListModal: false
    });
  },

  // 选择宝宝
  selectBaby(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const selectedBaby = this.data.babies[index];
    
    this.setData({
      selectedBaby,
      selectedBabyIndex: index,
      babyInfo: selectedBaby // 保留兼容性
    });
    
    // 更新全局数据
    app.globalData.babyInfo = selectedBaby;
    wx.setStorageSync('babyInfo', selectedBaby);
    
    // 关闭模态框
    this.hideBabyListModal();
    
    wx.showToast({
      title: `已切换到${selectedBaby.name}`,
      icon: 'success'
    });
  },

  // 添加宝宝
  addBabyInfo() {
    console.log('打开添加宝宝模态框');
    this.setData({
      showBabyModal: true,
      babyForm: {
        name: '',
        gender: 'BOY',
        birthDate: '',
        avatarUrl: '',
        birthHeightCm: '',
        birthWeightKg: ''
      }
    });
  },

  // 编辑宝宝信息
  editBabyInfo() {
    const { selectedBaby } = this.data;
    
    this.setData({
      showBabyModal: true,
      babyForm: selectedBaby && selectedBaby.id ? { 
        id: selectedBaby.id,
        name: selectedBaby.name,
        gender: selectedBaby.gender && selectedBaby.gender.toUpperCase ? selectedBaby.gender.toUpperCase() : 'BOY',
        birthDate: selectedBaby.birthDate,
        avatarUrl: selectedBaby.avatar,
        birthHeightCm: selectedBaby.height || '',
        birthWeightKg: selectedBaby.weight || ''
      } : {
        name: '',
        gender: 'BOY',
        birthDate: '',
        avatarUrl: '',
        birthHeightCm: '',
        birthWeightKg: ''
      }
    });
  },

  // 通过索引编辑指定宝宝
  editBabyByIndex(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const baby = this.data.babies[index];
    
    console.log('编辑宝宝信息:', baby);
    
    this.setData({
      showBabyModal: true,
      babyForm: {
        id: baby.id,
        name: baby.name,
        gender: baby.gender ? baby.gender.toUpperCase() : 'BOY',
        birthDate: baby.birthDate,
        avatarUrl: baby.avatar,
        birthHeightCm: baby.height ? baby.height.toString() : '',
        birthWeightKg: baby.weight ? baby.weight.toString() : ''
      }
    });
    
    console.log('设置的babyForm:', this.data.babyForm);
  },

  // 通过索引删除指定宝宝
  deleteBabyByIndex(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const baby = this.data.babies[index];
    
    // 第一次确认
    wx.showModal({
      title: '确认删除',
      content: `确定要删除宝宝"${baby.name}"吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          // 第二次确认
          wx.showModal({
            title: '再次确认',
            content: `请再次确认删除宝宝"${baby.name}"，删除后所有相关数据将无法恢复！`,
            confirmText: '确认删除',
            confirmColor: '#ff4444',
            success: (res2) => {
              if (res2.confirm) {
                this.checkBabyRecordsAndDelete(baby);
              }
            }
          });
        }
      }
    });
  },

  // 检查宝宝是否有记录数据，然后决定是否可以删除
  checkBabyRecordsAndDelete(baby) {
    const familyId = this.data.familyInfo?.id;
    if (!familyId) {
      wx.showToast({ title: '家庭信息不存在', icon: 'none' });
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
    
    wx.showLoading({ title: '检查中...' });
    
    // 使用现有的API获取宝宝的记录列表来检查是否有数据
    app.get(`/babies/${baby.id}/records`)
      .then(records => {
        wx.hideLoading();
        const recordCount = Array.isArray(records) ? records.length : 0;
        
        if (recordCount > 0) {
          // 有记录数据，不允许删除
          wx.showModal({
            title: '无法删除',
            content: `宝宝"${baby.name}"已有${recordCount}条喂养记录，无法删除。如需删除，请联系管理员处理。`,
            showCancel: false,
            confirmText: '知道了'
          });
        } else {
          // 没有记录数据，可以删除
          this.performDeleteBaby(baby);
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('检查宝宝记录失败:', err);
        
        // 如果检查接口失败，为安全起见，提示联系管理员
        wx.showModal({
          title: '删除失败',
          content: '无法确认宝宝是否有相关记录，为确保数据安全，请联系管理员删除。',
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  // 编辑单个宝宝
  editSingleBaby() {
    const baby = this.data.selectedBaby;
    this.setData({
      showBabyModal: true,
      babyForm: {
        id: baby.id,
        name: baby.name,
        gender: baby.gender.toUpperCase(),
        birthDate: baby.birthDate,
        avatarUrl: baby.avatar,
        birthHeightCm: baby.height || '',
        birthWeightKg: baby.weight || ''
      }
    });
  },

  // 删除宝宝
  deleteBaby(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const baby = this.data.babies[index];
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除宝宝"${baby.name}"吗？删除后所有相关记录都将被删除。`,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteBaby(baby);
        }
      }
    });
  },

  // 执行删除宝宝操作
  performDeleteBaby(baby) {
    const familyId = this.data.familyInfo?.id;
    if (!familyId) {
      wx.showToast({ title: '家庭信息不存在', icon: 'none' });
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
    
    wx.showLoading({ title: '删除中...' });
    
    app.delete(`/families/${familyId}/babies/${baby.id}`)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 设置全局刷新标记，通知其他页面数据已变更
        app.globalData.needRefreshBabies = true;
        
        // 如果删除的是当前选中的宝宝，清除全局选中状态
        if (app.globalData.babyInfo?.id === baby.id) {
          app.globalData.babyInfo = null;
          wx.removeStorageSync('babyInfo');
        }
        
        // 重新加载宝宝列表
        this.loadBabies();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('Delete baby error:', err);
        wx.showToast({
          title: err.message || '删除失败',
          icon: 'none'
        });
      });
  },

  // 隐藏宝宝模态框
  hideBabyModal() {
    console.log('关闭宝宝模态框');
    this.setData({
      showBabyModal: false,
      babyForm: {}
    });
  },

  // 宝宝表单输入事件
  onBabyNameInput(e) {
    this.setData({
      'babyForm.name': e.detail.value
    });
  },

  onBabyGenderChange(e) {
    const genders = ['BOY', 'GIRL'];
    this.setData({
      'babyForm.gender': genders[e.detail.value]
    });
  },

  onBabyBirthDateChange(e) {
    this.setData({
      'babyForm.birthDate': e.detail.value
    });
  },

  onBabyHeightInput(e) {
    this.setData({
      'babyForm.birthHeightCm': e.detail.value
    });
  },

  onBabyWeightInput(e) {
    this.setData({
      'babyForm.birthWeightKg': e.detail.value
    });
  },

  // 保存宝宝信息
  saveBabyInfo() {
    const { babyForm } = this.data;
    const familyId = this.data.familyInfo?.id;
    
    if (!familyId) {
      wx.showToast({ title: '家庭信息不存在', icon: 'none' });
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
    
    // 表单验证
    if (!babyForm.name) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' });
      return;
    }
    
    if (!babyForm.birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }
    
    console.log('开始保存宝宝信息:', babyForm);
    wx.showLoading({ title: babyForm.id ? '更新中...' : '创建中...' });
    
    const payload = {
      name: babyForm.name,
      gender: babyForm.gender,
      birthDate: babyForm.birthDate,
      avatarUrl: babyForm.avatarUrl,
      birthHeightCm: babyForm.birthHeightCm ? Number(babyForm.birthHeightCm) : null,
      birthWeightKg: babyForm.birthWeightKg ? Number(babyForm.birthWeightKg) : null
    };
    
    console.log('提交的数据:', payload);
    
    const apiCall = babyForm.id 
      ? app.put(`/families/${familyId}/babies/${babyForm.id}`, payload)
      : app.post(`/families/${familyId}/babies`, payload);
    
    apiCall
      .then((newBaby) => {
        wx.hideLoading();
        wx.showToast({
          title: babyForm.id ? '更新成功' : '创建成功',
          icon: 'success'
        });
        
        // 关闭模态框
        this.hideBabyModal();
        
        // 重新加载数据，等待一个短暂延迟确保模态框完全关闭
        setTimeout(() => {
          console.log('宝宝保存成功，重新加载数据');
          this.loadBabies();
          
          // 如果是新增宝宝，更新全局数据
          if (!babyForm.id && newBaby) {
            const mappedNewBaby = this.mapBabyInfo(newBaby);
            app.globalData.babyInfo = mappedNewBaby;
            wx.setStorageSync('babyInfo', mappedNewBaby);
            console.log('新增宝宝，更新全局数据:', mappedNewBaby);
          }
        }, 100);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('Save baby error:', err);
        wx.showToast({
          title: err.message || '保存失败',
          icon: 'none'
        });
      });
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
    console.log('选择性别:', gender);
    this.setData({
      'babyForm.gender': gender
    });
  },

  onBirthHeightChange(e) {
    this.setData({
      'babyForm.birthHeightCm': e.detail.value
    });
  },

  onBirthWeightChange(e) {
    this.setData({
      'babyForm.birthWeightKg': e.detail.value
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