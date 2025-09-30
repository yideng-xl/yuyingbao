const app = getApp();

Page({
  data: {
    currentFilter: 'all',
    selectedDate: '',
    allRecords: [], // 存储所有原始记录
    filteredRecords: [], // 存储筛选后的记录
    babies: [], // 所有宝宝列表
    selectedBaby: {}, // 当前选中的宝宝
    selectedBabyIndex: 0, // 选中的宝宝索引
    showEditModal: false,
    editingRecord: {},
    
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
      this.setData({
        selectedDate: this.formatDate(new Date())
      });
      // 加载宝宝列表
      this.loadBabies();
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
        // 如果已有选中的宝宝，直接加载记录；否则重新加载宝宝列表
        if (this.data.selectedBaby?.id) {
          this.loadRecords();
        } else {
          this.loadBabies();
        }
      }
    }
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
          selectedBabyIndex
        });
        
        console.log('Loaded babies:', babies);
        console.log('Selected baby:', selectedBaby);
        
        // 加载选中宝宝的记录
        this.loadRecords();
      } else {
        console.log('No babies found');
        this.setData({
          babies: [],
          selectedBaby: {},
          selectedBabyIndex: 0,
          allRecords: [],
          filteredRecords: []
        });
      }
    }).catch(err => {
      console.error('Failed to load babies:', err);
      this.setData({
        babies: [],
        selectedBaby: {},
        selectedBabyIndex: 0,
        allRecords: [],
        filteredRecords: []
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
      selectedBabyIndex: index
    });
    
    // 重新加载选中宝宝的记录
    this.loadRecords();
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
      const months = Math.floor(diffDays / 30.44); // 平均每月 30.44 天
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

  loadRecords() {
    const currentBaby = this.data.selectedBaby;
    if (!currentBaby?.id) {
      this.setData({ 
        allRecords: [],
        filteredRecords: [] 
      });
      return;
    }
    
    console.log('Loading records for baby:', currentBaby.id);
    
    app.get(`/babies/${currentBaby.id}/records`)
      .then(list => {
        console.log('Records from backend:', list);
        
        // 确保 list 是数组并且有数据
        if (!Array.isArray(list)) {
          console.warn('Backend returned non-array data:', list);
          this.setData({ 
            allRecords: [],
            filteredRecords: [] 
          });
          return;
        }
        
        // 格式化记录并按时间降序排序
        const formattedRecords = list
          .map(record => this.formatRecordForDisplay(record))
          .filter(record => record !== null) // 过滤掉无效记录
          .sort((a, b) => {
            // 按 happenedAt 时间降序排序（最新的在前）
            if (!a.happenedAt || !b.happenedAt) return 0;
            return new Date(b.happenedAt) - new Date(a.happenedAt);
          });
        
        console.log('Formatted and sorted records:', formattedRecords);
        
        // 设置所有记录并应用筛选
        this.setData({ 
          allRecords: formattedRecords
        }, () => {
          // 在数据设置完成后再应用筛选
          this.applyFilter();
        });
      })
      .catch((error) => {
        console.error('Load Records Error:', error);
        wx.showToast({ title: '加载记录失败', icon: 'none' });
        this.setData({ 
          allRecords: [],
          filteredRecords: [] 
        });
      });
  },

  formatRecordForDisplay(record) {
    console.log('Formatting record for display:', record);
    
    // 验证记录对象
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
      'WATER': '💧'
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
    
    let details = [];
    if (record.type === 'BREASTFEEDING') {
      details = [
        { label: '时长', value: `${record.durationMin || 0}分钟` },
        { label: '乳房', value: record.breastfeedingSide === 'LEFT' ? '左侧' : (record.breastfeedingSide === 'RIGHT' ? '右侧' : '未知') }
      ];
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA' || record.type === 'WATER') {
      // 喂水记录、瓶喂和奶粉记录使用相同的显示逻辑
      details = [
        { label: '喂水量', value: `${record.amountMl || 0}ml` }
      ];
    } else if (record.type === 'SOLID') {
      // 构建辅食详情
      const solidDetails = [];
      
      // 添加辅食类型信息（从note字段中提取，分离类型和喂食量）
      if (record.note) {
        const noteTrimmed = record.note.trim();
        const lastSpaceIndex = noteTrimmed.lastIndexOf(' ');
        
        if (lastSpaceIndex > 0) {
          // 分离类型和喂食量
          const typesText = noteTrimmed.substring(0, lastSpaceIndex);
          const amountText = noteTrimmed.substring(lastSpaceIndex + 1);
          
          solidDetails.push({ label: '辅食类型', value: typesText });
        } else {
          // 如果没有空格，整个字符串都是类型信息
          solidDetails.push({ label: '辅食类型', value: noteTrimmed });
        }
      }
      
      // 添加食材信息
      if (record.solidIngredients) {
        solidDetails.push({ label: '食材', value: record.solidIngredients });
      }
      
      // 添加喂食量信息
      if (record.note) {
        const noteTrimmed = record.note.trim();
        const lastSpaceIndex = noteTrimmed.lastIndexOf(' ');
        
        if (lastSpaceIndex > 0) {
          // 提取喂食量
          const amountText = noteTrimmed.substring(lastSpaceIndex + 1);
          // 修复：为喂食量添加单位"勺"
          solidDetails.push({ label: '喂食量', value: amountText ? `${amountText}勺` : '' });
        }
      }
      
      // 添加品牌信息
      if (record.solidBrand) {
        solidDetails.push({ label: '品牌', value: record.solidBrand });
      }
      
      // 添加产地信息
      if (record.solidOrigin) {
        solidDetails.push({ label: '产地', value: record.solidOrigin });
      }
      
      details = solidDetails;
    } else if (record.type === 'DIAPER') {
      const textureMap = { 'WATERY': '稀', 'SOFT': '软', 'NORMAL': '成形', 'HARD': '干硬' };
      const colorMap = { 'YELLOW': '黄', 'GREEN': '绿', 'BROWN': '棕', 'BLACK': '黑', 'RED': '红', 'WHITE': '白' };
      const texture = textureMap[record.diaperTexture] || record.diaperTexture || '未知';
      const color = colorMap[record.diaperColor] || record.diaperColor || '未知';
      details = [
        { label: '性状', value: texture },
        { label: '颜色', value: color }
      ];
      if (record.note) {
        details.push({ label: '备注', value: record.note });
      }
    } else if (record.type === 'GROWTH') {
      details = [
        { label: '身高', value: `${record.heightCm || 0}cm` },
        { label: '体重', value: `${record.weightKg || 0}kg` }
      ];
    }
    
    // 格式化时间
    let timeStr = '--:--';
    let dateStr = '--';
    if (record.happenedAt) {
      try {
        const dateObj = new Date(record.happenedAt);
        if (!isNaN(dateObj.getTime())) {
          timeStr = this.formatTime(dateObj);
          dateStr = this.formatDate(dateObj);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    
    const result = {
      id: record.id,
      type: record.type,
      icon: icons[record.type] || '📝',
      title: titles[record.type] || '记录',
      time: timeStr,
      date: dateStr,
      details,
      happenedAt: record.happenedAt, // 保留原始时间用于排序和筛选
      // 保留原始数据用于编辑
      durationMin: record.durationMin,
      breastfeedingSide: record.breastfeedingSide,
      amountMl: record.amountMl,
      solidType: record.solidType,
      solidIngredients: record.solidIngredients,
      solidBrand: record.solidBrand,
      solidOrigin: record.solidOrigin,
      diaperTexture: record.diaperTexture,
      diaperColor: record.diaperColor,
      note: record.note,
      heightCm: record.heightCm,
      weightKg: record.weightKg
    };
    
    console.log('Formatted record result:', result);
    return result;
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      currentFilter: filter
    });
    this.applyFilter();
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
    });
    this.applyFilter();
  },

  applyFilter() {
    const { currentFilter, selectedDate, allRecords } = this.data;
    
    console.log('Applying filter:', { currentFilter, selectedDate, recordsCount: allRecords.length });
    
    let filtered = [...(allRecords || [])];
    
    // 按类型筛选
    if (currentFilter !== 'all') {
      if (currentFilter === 'feeding') {
        filtered = filtered.filter(record => {
          const isFeedingType = ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID', 'WATER'].includes(record.type);
          console.log(`Record ${record.id} type ${record.type} is feeding:`, isFeedingType);
          return isFeedingType;
        });
      } else {
        // 映射前端类型到后端类型
        const typeMap = {
          'breastfeeding': 'BREASTFEEDING',
          'bottle': 'BOTTLE',
          'formula': 'FORMULA',
          'solid': 'SOLID',
          'diaper': 'DIAPER',
          'growth': 'GROWTH',
          'water': 'WATER'
        };
        const backendType = typeMap[currentFilter];
        filtered = filtered.filter(record => record.type === backendType);
      }
    }
    
    // 按日期筛选
    if (selectedDate) {
      filtered = filtered.filter(record => {
        if (!record.happenedAt) return false;
        const recordDate = this.formatDate(new Date(record.happenedAt));
        return recordDate === selectedDate;
      });
    }
    
    console.log('Filtered records:', filtered.length, filtered);
    
    this.setData({
      filteredRecords: filtered
    });
  },

  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.allRecords.find(r => r.id === id);
    
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    console.log('Editing record:', record); // 添加调试日志

    // 初始化编辑数据
    const editingRecord = {
      id: record.id,
      type: record.type
    };

    // 根据记录类型初始化字段
    if (record.type === 'BREASTFEEDING') {
      editingRecord.startTime = record.time;
      editingRecord.duration = record.durationMin || '';
      editingRecord.breast = record.breastfeedingSide === 'LEFT' ? 'left' : 'right';
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA' || record.type === 'WATER') {
      // 喂水记录、瓶喂和奶粉记录使用相同的字段
      editingRecord.startTime = record.time;
      editingRecord.amount = record.amountMl || '';
      console.log('Setting editingRecord for WATER/BOTTLE/FORMULA:', editingRecord);
    } else if (record.type === 'SOLID') {
      editingRecord.startTime = record.time;
      
      // 初始化辅食类型多选数据（修复：确保数据结构与首页一致）
      editingRecord.solidTypeSelections = {
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false
      };
      editingRecord.selectedSolidTypeIndices = [];
      editingRecord.selectedSolidTypes = [];
      
      // 从note字段中解析出辅食类型和喂食量（修复：正确解析note字段）
      if (record.note) {
        // 解析note字段，格式为"类型1, 类型2 喂食量"
        const noteTrimmed = record.note.trim();
        const lastSpaceIndex = noteTrimmed.lastIndexOf(' ');
        
        let typesText = noteTrimmed;
        let amountText = '';
        
        if (lastSpaceIndex > 0) {
          // 提取喂食量
          amountText = noteTrimmed.substring(lastSpaceIndex + 1);
          // 提取类型部分
          typesText = noteTrimmed.substring(0, lastSpaceIndex);
        }
        
        // 设置喂食量
        editingRecord.solidAmount = amountText;
        
        // 解析类型（修复：正确处理类型解析）
        const types = typesText.split(',').map(t => t.trim());
        types.forEach(type => {
          const index = this.data.solidTypes.indexOf(type);
          if (index !== -1) {
            editingRecord.solidTypeSelections[index] = true;
            editingRecord.selectedSolidTypeIndices.push(index);
            editingRecord.selectedSolidTypes.push(type);
          }
        });
        
        console.log('Parsed solid types:', { typesText, amountText, types }); // 添加调试日志
      }
      
      // 新增：初始化辅食增强字段
      editingRecord.solidIngredients = record.solidIngredients || '';
      editingRecord.solidBrand = record.solidBrand || '';
      editingRecord.solidOrigin = record.solidOrigin || '';
      
      console.log('Final editingRecord for SOLID:', editingRecord); // 添加调试日志
    } else if (record.type === 'DIAPER') {
      editingRecord.startTime = record.time;
      editingRecord.texture = record.diaperTexture === 'WATERY' ? '稀' : 
                             record.diaperTexture === 'SOFT' ? '软' : 
                             record.diaperTexture === 'NORMAL' ? '成形' : 
                             record.diaperTexture === 'HARD' ? '干硬' : '未知';
      editingRecord.textureIndex = this.data.diaperTextures.indexOf(editingRecord.texture);
      if (editingRecord.textureIndex === -1) editingRecord.textureIndex = 0;
      
      editingRecord.color = record.diaperColor === 'YELLOW' ? '黄' : 
                           record.diaperColor === 'GREEN' ? '绿' : 
                           record.diaperColor === 'BROWN' ? '棕' : 
                           record.diaperColor === 'BLACK' ? '黑' : '未知';
      editingRecord.colorIndex = this.data.diaperColors.indexOf(editingRecord.color);
      if (editingRecord.colorIndex === -1) editingRecord.colorIndex = 0;
      
      editingRecord.note = record.note || '';
    } else if (record.type === 'GROWTH') {
      editingRecord.date = record.date;
      editingRecord.height = record.heightCm || '';
      editingRecord.weight = record.weightKg || '';
    }

    this.setData({
      showEditModal: true,
      editingRecord
    }, () => {
      console.log('editingRecord set in data:', this.data.editingRecord);
    });
  },

  hideEditModal() {
    this.setData({
      showEditModal: false,
      editingRecord: {}
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  selectEditBreast(e) {
    const breast = e.currentTarget.dataset.breast;
    this.setData({
      'editingRecord.breast': breast
    });
  },

  // 切换编辑辅食类型选择
  toggleEditSolidType(e) {
    console.log('toggleEditSolidType called with:', e); // 添加调试日志
    
    // 确保索引是数字类型
    const index = parseInt(e.currentTarget.dataset.index);
    
    // 获取当前选中状态
    const solidTypeSelections = this.data.editingRecord.solidTypeSelections || {};
    const isSelected = solidTypeSelections[index] || false;
    
    console.log('Current selection state:', { index, isSelected, solidTypeSelections }); // 添加调试日志
    
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
    
    console.log('New selection state:', { selectedIndices, selectedTypes, solidTypeSelections }); // 添加调试日志
    
    // 更新数据（修复：使用与首页一致的方式更新editingRecord对象）
    const newEditingRecord = Object.assign({}, this.data.editingRecord, {
      solidTypeSelections: solidTypeSelections,
      selectedSolidTypeIndices: selectedIndices,
      selectedSolidTypes: selectedTypes
    });
    
    this.setData({
      editingRecord: newEditingRecord
    }, () => {
      console.log('Updated editingRecord:', this.data.editingRecord); // 添加调试日志
    });
  },

  // 编辑表单事件处理
  onEditTimeChange(e) {
    this.setData({
      'editingRecord.startTime': e.detail.value
    });
  },

  onEditDateChange(e) {
    this.setData({
      'editingRecord.date': e.detail.value
    });
  },

  onEditDurationChange(e) {
    this.setData({
      'editingRecord.duration': e.detail.value
    });
  },

  onEditAmountChange(e) {
    this.setData({
      'editingRecord.amount': e.detail.value
    });
  },

  onEditSolidTypeChange(e) {
    this.setData({
      'editingRecord.solidTypeIndex': e.detail.value,
      'editingRecord.solidType': this.data.solidTypes[e.detail.value]
    });
  },

  onEditSolidAmountChange(e) {
    this.setData({
      'editingRecord.solidAmount': e.detail.value
    });
  },

  onEditSolidIngredientsChange(e) {
    this.setData({
      'editingRecord.solidIngredients': e.detail.value
    });
  },

  onEditSolidBrandChange(e) {
    this.setData({
      'editingRecord.solidBrand': e.detail.value
    });
  },

  onEditSolidOriginChange(e) {
    this.setData({
      'editingRecord.solidOrigin': e.detail.value
    });
  },

  onEditTextureChange(e) {
    this.setData({
      'editingRecord.textureIndex': e.detail.value,
      'editingRecord.texture': this.data.diaperTextures[e.detail.value]
    });
  },

  onEditColorChange(e) {
    this.setData({
      'editingRecord.colorIndex': e.detail.value,
      'editingRecord.color': this.data.diaperColors[e.detail.value]
    });
  },

  onEditNoteChange(e) {
    this.setData({
      'editingRecord.note': e.detail.value
    });
  },

  onEditHeightChange(e) {
    this.setData({
      'editingRecord.height': e.detail.value
    });
  },

  onEditWeightChange(e) {
    this.setData({
      'editingRecord.weight': e.detail.value
    });
  },

  saveEdit() {
    const { editingRecord } = this.data;
    const record = this.data.allRecords.find(r => r.id === editingRecord.id);
    
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    // 构建更新数据
    const updateData = {
      type: record.type,
      happenedAt: record.happenedAt // 保留原始时间
    };

    // 根据记录类型设置字段
    if (record.type === 'BREASTFEEDING') {
      if (!editingRecord.startTime || !editingRecord.duration || !editingRecord.breast) {
        wx.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      const [hours, minutes] = editingRecord.startTime.split(':');
      const happenedAt = new Date(record.happenedAt);
      happenedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.happenedAt = happenedAt.toISOString();
      updateData.durationMin = Number(editingRecord.duration);
      updateData.breastfeedingSide = editingRecord.breast === 'left' ? 'LEFT' : 'RIGHT';
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA' || record.type === 'WATER') {
      // 喂水记录、瓶喂和奶粉记录使用相同的验证和更新逻辑
      if (!editingRecord.startTime || !editingRecord.amount) {
        wx.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      const [hours, minutes] = editingRecord.startTime.split(':');
      const happenedAt = new Date(record.happenedAt);
      happenedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.happenedAt = happenedAt.toISOString();
      updateData.amountMl = Number(editingRecord.amount);
    } else if (record.type === 'SOLID') {
      const solidTypeMap = {
        '米糊': 'RICE_CEREAL',
        '蔬菜泥': 'VEGETABLE_PUREE', 
        '水果泥': 'FRUIT_PUREE',
        '肉泥': 'MEAT_PUREE',
        '蛋黄': 'EGG_YOLK',
        '其他': 'OTHER'
      };
      updateData.solidType = 'OTHER'; // 固定为OTHER，因为使用了多选
      // 使用多选的辅食类型
      const solidTypeText = (editingRecord.selectedSolidTypes || []).join(', ');
      updateData.note = `${solidTypeText} ${editingRecord.solidAmount || ''}`.trim();
      // 新增：添加辅食增强字段
      updateData.solidIngredients = editingRecord.solidIngredients || undefined;
      updateData.solidBrand = editingRecord.solidBrand || undefined;
      updateData.solidOrigin = editingRecord.solidOrigin || undefined;
      
      // 使用选择的时间（修复：正确处理时间）
      if (editingRecord.startTime) {
        const happenedAt = new Date(record.happenedAt);
        const [hours, minutes] = editingRecord.startTime.split(':');
        happenedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.happenedAt = happenedAt.toISOString();
      }
    } else if (record.type === 'DIAPER') {
      const textureMap = { '稀': 'WATERY', '软': 'SOFT', '成形': 'NORMAL', '干硬': 'HARD' };
      const colorMap = { '黄': 'YELLOW', '绿': 'GREEN', '棕': 'BROWN', '黑': 'BLACK' };
      updateData.diaperTexture = textureMap[editingRecord.texture] || undefined;
      updateData.diaperColor = colorMap[editingRecord.color] || undefined;
      updateData.note = editingRecord.note;
      
      // 使用选择的时间（修复：正确处理时间）
      if (editingRecord.startTime) {
        const happenedAt = new Date(record.happenedAt);
        const [hours, minutes] = editingRecord.startTime.split(':');
        happenedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.happenedAt = happenedAt.toISOString();
      }
    } else if (record.type === 'GROWTH') {
      updateData.heightCm = Number(editingRecord.height) || undefined;
      updateData.weightKg = Number(editingRecord.weight) || undefined;
      // 如果有日期字段，使用它
      if (editingRecord.date) {
        // 使用ISO格式时间以匹配后端期望的格式
        updateData.happenedAt = new Date(editingRecord.date).toISOString();
      }
    }

    const babyId = this.data.selectedBaby?.id;
    if (!babyId) {
      wx.showToast({ title: '请先选择宝宝', icon: 'none' });
      return;
    }

    // 调用PUT API
    app.put(`/babies/${babyId}/records/${editingRecord.id}`, updateData)
      .then(() => {
        this.hideEditModal();
        this.loadRecords(); // 重新加载记录
        wx.showToast({ title: '更新成功', icon: 'success' });
      })
      .catch(err => {
        console.error('Update record error:', err);
        wx.showToast({ title: err.message || '更新失败', icon: 'none' });
      });
  },

  validateEditRecord(record) {
    // 注意：编辑记录时，record.type 是后端的枚举值（如 'BREASTFEEDING'），而不是前端的类型（如 'breastfeeding'）
    if (record.type === 'BREASTFEEDING') {
      if (!record.startTime || !record.duration || !record.breast) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA' || record.type === 'WATER') {
      if (!record.startTime || !record.amount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'SOLID') {
      // 修改验证逻辑以适应多选
      if (!record.startTime || !record.selectedSolidTypes || record.selectedSolidTypes.length === 0 || !record.solidAmount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'DIAPER') {
      if (!record.startTime || !record.texture || !record.color) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'GROWTH') {
      if (!record.date || !record.height || !record.weight) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const babyId = this.data.selectedBaby?.id;
          if (!babyId) {
            wx.showToast({ title: '请先选择宝宝', icon: 'none' });
            return;
          }

          // 调用DELETE API
          app.delete(`/babies/${babyId}/records/${id}`)
            .then(() => {
              this.loadRecords(); // 重新加载记录
              wx.showToast({ title: '删除成功', icon: 'success' });
            })
            .catch(err => {
              console.error('Delete record error:', err);
              wx.showToast({ title: err.message || '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
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